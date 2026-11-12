// Browser adapter: checkpoints contain IDs, never serialized question objects.
let QUIZ_CHECKPOINT_KEY='toeic-path-session-v1';
function newAttemptId(){return 'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
function persistQuiz(){
 if(!quiz)return;
 try{localStorage.setItem(QUIZ_CHECKPOINT_KEY,JSON.stringify({version:1,contentVersion:CONTENT_METADATA.content_version,id:quiz.id,kind:quiz.kind,setId:quiz.setId,name:quiz.name,questionIds:quiz.questions.map(q=>q.id),index:quiz.index,answers:quiz.answers,checked:quiz.checked,start:quiz.start,limit:quiz.limit,deadline:quiz.deadline}));queueCloudProgress()}catch{toast('Your current session could not be saved on this device.')}
}
function clearQuizCheckpoint(){try{localStorage.removeItem(QUIZ_CHECKPOINT_KEY);queueCloudProgress()}catch{}}
function readQuizCheckpoint(){
 try{
  const saved=JSON.parse(localStorage.getItem(QUIZ_CHECKPOINT_KEY)||'null');
  if(!saved||saved.version!==1||saved.contentVersion!==CONTENT_METADATA.content_version||typeof saved.id!=='string'||typeof saved.name!=='string'||saved.name.length>300||!Array.isArray(saved.questionIds)||!saved.questionIds.length||saved.questionIds.length>BANK.length||new Set(saved.questionIds).size!==saved.questionIds.length||!Number.isInteger(saved.index)||saved.index<0||saved.index>=saved.questionIds.length||!Number.isFinite(saved.start)||saved.start<0||!Number.isFinite(saved.limit)||saved.limit<0||saved.limit>86400||typeof saved.checked!=='boolean'||!saved.answers||typeof saved.answers!=='object'||Array.isArray(saved.answers))return null;
  if(saved.limit&&(!Number.isFinite(saved.deadline)||saved.deadline!==saved.start+saved.limit*1000))return null;
  const questions=saved.questionIds.map(id=>BANK.find(q=>q.id===id));if(questions.some(q=>!q))return null;
  if(Object.entries(saved.answers).some(([id,choice])=>!saved.questionIds.includes(Number(id))||!Number.isInteger(choice)||choice<0||choice>=BANK.find(q=>q.id===Number(id)).options.length))return null;
  if(state.history.some(h=>h.attemptId===saved.id))return null;
  return {id:saved.id,kind:saved.kind,setId:saved.setId,name:saved.name,questions,index:saved.index,answers:saved.answers,checked:saved.checked,start:saved.start,limit:saved.limit,deadline:saved.limit?saved.deadline:null};
 }catch{return null}
}
function resumeBanner(){const saved=readQuizCheckpoint();return saved?`<section class="panel resume-panel" style="margin-bottom:24px"><div><div class="eyebrow">SAVED ON THIS DEVICE</div><h3>Continue where you left off</h3><p class="sub">${escapeHTML(saved.name)} · Question ${saved.index+1} / ${saved.questions.length}${saved.limit?' · original time limit still applies':''}</p></div><button class="primary" data-action="resume-quiz">Resume practice →</button></section>`:''}
function startQuizClock(){clearInterval(clock);if(quiz?.limit)clock=setInterval(()=>{if(!quiz)return;const remaining=Math.max(0,Math.ceil((quiz.deadline-Date.now())/1000));if($('#timer'))$('#timer').textContent=formatTime(remaining);if(remaining===0)finishQuiz()},500)}
function resumeQuiz(){const saved=readQuizCheckpoint();if(!saved){toast('No compatible saved session is available.');return}stopAudio();quiz=saved;if(quiz.limit&&quiz.deadline<=Date.now()){finishQuiz();return}renderQuiz();startQuizClock()}
