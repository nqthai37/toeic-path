let practiceStartSerial=0;
function cancelPendingPractice(){practiceStartSerial++}
function remainingQuizSeconds(current){
 if(!current.limit)return 0;
 const now=current.remoteClock?current.remoteClock.serverMs+(performance.now()-current.remoteClock.monotonicMs):Date.now();
 return Math.max(0,Math.ceil((current.deadline-now)/1000));
}
function currentRemote(current){return quiz===current&&ToeicCloud.user?.id===current.remote?.ownerId}
function practiceSaveLabel(){return ({pending:'Answers waiting to save',saving:'Saving answers…',saved:'Answers saved to your account',error:'Answers not saved · reconnect and retry',conflict:'Answers changed on another device · reload to continue'})[quiz?.remoteStatus]||'Practice saved on this device'}
function practiceSaveRow(){return `<div class="practice-save-row"><small data-practice-status aria-live="polite">${practiceSaveLabel()}</small>${quiz?.remote?'<button class="text-btn" data-action="retry-answers" type="button">Retry save</button>':''}</div>`}
function updatePracticeSave(status,current=quiz){if(!currentRemote(current))return;current.remoteStatus=status;document.querySelectorAll('[data-practice-status]').forEach(node=>{node.textContent=practiceSaveLabel()})}
function restoreQuestionSnapshots(snapshot){
 return snapshot.questions.map(row=>{
  const local=BANK.find(q=>q.id===row.question_id);
  if(!local||local.content_version!==row.content_version)throw Error('Content changed. Refresh to load the latest questions.');
  const question={...local,...row.snapshot};delete question.answer;delete question.explanation;return question;
 });
}
function applyPracticeFeedback(current,feedback){
 for(const value of feedback){const q=current.questions.find(q=>q.id===value.question_id);if(q){q.answer=value.answer;q.explanation=value.explanation}}
}
function attachServerPractice(snapshot,checkpoint=null){
 const item=snapshot.attempt,ownerId=ToeicCloud.user?.id;if(!ownerId||item.user_id!==ownerId)throw Error('Account changed');
 const questions=restoreQuestionSnapshots(snapshot),index=Math.min(Math.max(0,checkpoint?.index||0),questions.length-1);
 const current={id:item.id,kind:item.kind||'custom',setId:item.test_id,name:item.session_name||'Cloud practice',questions,index,
  answers:{...snapshot.answers},checked:snapshot.checked.includes(questions[index].id),start:Date.parse(item.started_at),limit:item.expires_at?(Date.parse(item.expires_at)-Date.parse(item.started_at))/1000:0,
  deadline:item.expires_at?Date.parse(item.expires_at):null,remote:{id:item.id,ownerId},remoteStatus:'saved',remoteClock:{serverMs:Date.parse(snapshot.server_now),monotonicMs:performance.now()}};
 applyPracticeFeedback(current,snapshot.feedback);quiz=current;
 const pending=checkpoint?.remote?.pending||{};
 const unapplied=Object.fromEntries(Object.entries(pending).filter(([id,choice])=>snapshot.answers[id]!==choice));
 const conflict=Object.keys(unapplied).length&&checkpoint.remote.revision!==item.revision;
 if(!conflict)Object.assign(current.answers,unapplied);
 current.answerQueue=createAnswerQueue({revision:item.revision,pending:unapplied,
  save:(id,choice,revision)=>{if(ToeicCloud.user?.id!==ownerId)throw Error('Account changed');return ToeicCloud.repository.savePracticeAnswer(item.id,id,choice,revision)},
  onStatus:status=>{if(currentRemote(current)){if(!(status==='pending'&&current.remoteStatus==='conflict'))updatePracticeSave(status,current);persistQuiz()}},
  onAck:()=>{if(currentRemote(current))persistQuiz()}});
 if(conflict){current.remoteStatus='conflict';Object.assign(current.answers,pending)}
 renderQuiz();startQuizClock();
 if(item.status==='submitted'){finishQuiz(snapshot);return}
 if(current.limit&&remainingQuizSeconds(current)===0){clearInterval(clock);finishRemotePractice();return}
 if(!conflict&&current.answerQueue.size)current.answerQueue.flush();
}
async function beginRemotePractice(config){
 if(!ToeicCloud.ready){toast('Your account is still loading. Please try again in a moment.');return}
 const serial=++practiceStartSerial,ownerId=ToeicCloud.user.id,old=quiz;
 const saved=old?.remote?await old.answerQueue.flush():true;if(serial!==practiceStartSerial||ownerId!==ToeicCloud.user?.id)return;
 if(!saved){toast('Save the current answers before starting another session.');startQuizClock();return}
 old?.answerQueue?.close();quiz=null;
 $('#main').innerHTML='<section class="panel"><h2>Preparing your practice…</h2><p class="sub">Your questions and time limit are being saved.</p></section>';
 try{
  const request={ids:config.questions.map(q=>q.id),mode:config.limit?'timed':'learning',testId:config.setId,kind:config.kind,ownerId},intentKey=storageKey+'-start-intent';
  let intent=null;try{intent=JSON.parse(localStorage.getItem(intentKey)||'null')}catch{}
  const key=intent&&JSON.stringify(intent.request)===JSON.stringify(request)?intent.key:crypto.randomUUID();
  localStorage.setItem(intentKey,JSON.stringify({request,key}));const snapshot=await ToeicCloud.repository.beginPractice({...request,key});localStorage.removeItem(intentKey);
  if(serial!==practiceStartSerial||ownerId!==ToeicCloud.user?.id)return;
  attachServerPractice(snapshot);refreshPracticeOverview().catch(()=>{});
 }catch(error){if(serial===practiceStartSerial){toast(error.message?.includes('Content changed')?error.message:'Practice could not start. Check your connection and try again.');render()}}
}
function queueRemoteAnswer(id,choice){
 if(!quiz?.remote)return;quiz.answerQueue.enqueue(id,choice);persistQuiz();if(quiz.remoteStatus!=='conflict')quiz.answerQueue.flush();
}
async function checkRemoteAnswer(){
 const current=quiz,question=current?.questions[current.index];if(!current?.remote||current.checked||current.checking||current.answers[question.id]===undefined)return;
 current.checking=true;document.querySelectorAll('.answers .answer, [data-action="skip-q"]').forEach(node=>{node.disabled=true});const button=document.querySelector('[data-action="check"]');if(button)button.disabled=true;
 try{
  if(current.remoteStatus==='conflict'||!(await current.answerQueue.flush()))throw Error('Unsaved answers');
  const feedback=await ToeicCloud.repository.gradePracticeAnswer(current.id,question.id);
  if(!currentRemote(current)||current.questions[current.index].id!==question.id)return;
  applyPracticeFeedback(current,[feedback]);current.checked=true;persistQuiz();showQuizFeedback();
 }catch{if(currentRemote(current))toast('Your answer could not be checked. Save your answers and try again.')}
 finally{current.checking=false;if(currentRemote(current)&&!current.checked){if(button)button.disabled=false;document.querySelectorAll('.answers .answer, [data-action="skip-q"]').forEach(node=>{node.disabled=false})}}
}
async function retryRemoteAnswers(){
 const current=quiz;if(!current?.remote)return;
 try{
  const snapshot=await ToeicCloud.repository.practiceSnapshot(current.id);if(!currentRemote(current))return;
  const pending=current.answerQueue.pending,unapplied=Object.entries(pending).filter(([id,choice])=>snapshot.answers[id]!==choice);
  if(unapplied.length&&snapshot.attempt.revision!==current.answerQueue.revision){
   updatePracticeSave('conflict',current);
   if(!confirm('This practice changed on another device. Load saved answers? Your local choices will be kept in a backup.'))return;
   localStorage.setItem(QUIZ_CHECKPOINT_KEY+'-conflict',JSON.stringify(checkpointValue()));current.answerQueue.close();attachServerPractice(snapshot,{index:current.index});return;
  }
  current.answerQueue.close();attachServerPractice(snapshot,{index:current.index,remote:{revision:snapshot.attempt.revision,pending}});
 }catch{if(currentRemote(current))toast('Saved answers could not be loaded. Please reconnect and try again.')}
}
async function resumeServerPractice(id,checkpoint=null){
 const ownerId=ToeicCloud.user?.id;if(!ownerId){toast('Sign in to resume this practice.');return}
 try{const snapshot=await ToeicCloud.repository.practiceSnapshot(id);if(ToeicCloud.user?.id===ownerId)attachServerPractice(snapshot,checkpoint)}catch{toast('This practice could not be loaded. Please check your connection.')}
}
async function finishRemotePractice(){
 const current=quiz;if(!current?.remote||current.submitting)return;current.submitting=true;
 try{
  const expired=current.limit&&remainingQuizSeconds(current)===0;
  if(!expired&&(current.remoteStatus==='conflict'||!(await current.answerQueue.flush())))throw Error('Unsaved answers');
  if(expired&&current.answerQueue.size){localStorage.setItem(QUIZ_CHECKPOINT_KEY+'-late-choices',JSON.stringify(checkpointValue()));toast('Time is up. Only answers received before the deadline will count.')}
  const snapshot=await ToeicCloud.repository.completePractice(current.id);if(!currentRemote(current))return;
  applyPracticeFeedback(current,snapshot.feedback);finishQuiz(snapshot);refreshPracticeOverview().catch(()=>{});
 }catch{if(currentRemote(current)){updatePracticeSave('error',current);toast('The session could not be submitted. Reconnect and use See my results or Review & submit to retry.')}}
 finally{current.submitting=false}
}
function remoteResultAnswers(snapshot){return snapshot.questions.map(q=>({id:q.question_id,chosen:snapshot.answers[q.question_id]??null,correct:snapshot.feedback.find(f=>f.question_id===q.question_id)?.correct===true}))}
function cloudPracticeBanner(){
 const open=(ToeicCloud.openPractices||[]).filter(item=>item.id!==readQuizCheckpoint()?.id);
 return ToeicCloud.user&&open.length?`<section class="panel" style="margin-bottom:24px"><div class="eyebrow">SAVED TO YOUR ACCOUNT</div><h3>Continue a cloud practice</h3>${open.slice(0,3).map(item=>`<button type="button" class="secondary" data-resume-cloud="${escapeHTML(item.id)}">Resume ${escapeHTML(item.session_name||'practice')} →</button>`).join(' ')}</section>`:'';
}
async function refreshPracticeOverview(){
 if(!ToeicCloud.user||!ToeicCloud.repository)return;const ownerId=ToeicCloud.user.id,epoch=ToeicCloud.epoch;
 const [open,verified,review]=await Promise.all([ToeicCloud.repository.openPractices(),ToeicCloud.repository.practiceHistory(),ToeicCloud.repository.reviewItems()]);
 if(ownerId!==ToeicCloud.user?.id||epoch!==ToeicCloud.epoch)return;
 ToeicCloud.openPractices=open;
 const byId=new Map(state.history.map(h=>[h.attemptId||JSON.stringify([h.date,h.name,h.answers]),h]));
 for(const history of verified)byId.set(history.attemptId,{...history,server_graded:true,source:'server_practice'});
 const serverIds=new Set(verified.flatMap(h=>h.answers.map(a=>a.id)));state.mistakes=[...new Set([...state.mistakes.filter(id=>!serverIds.has(id)),...review.map(item=>item.question_id)])];
 state.history=[...byId.values()].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 localStorage.setItem(storageKey,JSON.stringify(state));if(!quiz&&['dashboard','progress','tests'].includes(page))render();
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-resume-cloud]');if(button?.dataset.resumeCloud)resumeServerPractice(button.dataset.resumeCloud);
});
