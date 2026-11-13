// Supabase browser adapter. Guest and account caches use different keys.
const ToeicCloud={client:null,repository:null,user:null,sync:null,status:'local',epoch:0,timer:null,emailPending:false,ready:false};
function cloudMessage(){return ({local:'Saved on this device',loading:'Loading your cloud progress…',pending:'Changes waiting to sync',saving:'Saving to cloud…',saved:'Saved to cloud',error:'Not synced · progress kept on this device',conflict:'Another device has newer progress · review before syncing'})[ToeicCloud.status]||'Saved on this device'}
function setCloudStatus(status){ToeicCloud.status=status;document.querySelectorAll('[data-cloud-status]').forEach(node=>{node.textContent=cloudMessage()});document.querySelectorAll('[data-cloud-indicator]').forEach(node=>{node.textContent=ToeicCloud.user?cloudMessage():'Progress saved on this device'})}
function cloudSettings(){
 const user=ToeicCloud.user;
 return `<section class="panel cloud-panel" style="margin-bottom:24px"><div class="eyebrow">YOUR ACCOUNT</div><h3>${user?'Keep learning across devices':'Save your progress across devices'}</h3><p class="sub" data-cloud-status aria-live="polite">${cloudMessage()}</p>${user?`<p>Signed in as <b>${escapeHTML(user.email||'Learner')}</b></p><div class="settings-actions"><button type="button" class="secondary" data-cloud-action="retry">Sync now</button><button type="button" class="secondary" data-cloud-action="reload">Load latest cloud progress</button><button type="button" class="text-btn" data-cloud-action="guest-import">Import this device’s guest history</button><button type="button" class="text-btn" data-cloud-action="sign-out">Sign out</button></div><p class="note">Use the status above to confirm that your latest progress is backed up. Practice scores remain practice results. When signing out, guest progress stays separate.</p>`:`<form id="cloud-auth-form"><label>Email address<input name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" required></label><button class="primary" type="submit" ${ToeicCloud.emailPending?'disabled':''}>${ToeicCloud.emailPending?'Sending…':'Email me a sign-in link'}</button></form><p class="note">Open the email link in this browser to sign in. Your guest progress stays on this device; you can import it after signing in.</p>`}</section>`;
}
function accountMetaKey(){return storageKey+'-sync'}
function readSyncMeta(){try{return JSON.parse(localStorage.getItem(accountMetaKey())||'{}')}catch{return {}}}
function writeSyncMeta(revision,dirty){try{localStorage.setItem(accountMetaKey(),JSON.stringify({revision,dirty}))}catch{}}
function checkpointValue(){try{return JSON.parse(localStorage.getItem(QUIZ_CHECKPOINT_KEY)||'null')}catch{return null}}
function queueCloudProgress(){
 if(!ToeicCloud.user)return;
 if(!ToeicCloud.ready||!ToeicCloud.sync){const meta=readSyncMeta();writeSyncMeta(meta.revision||0,true);return}
 ToeicCloud.sync.enqueue(state,checkpointValue());writeSyncMeta(ToeicCloud.sync.revision,true);
 clearTimeout(ToeicCloud.timer);if(ToeicCloud.status!=='conflict')ToeicCloud.timer=setTimeout(()=>ToeicCloud.sync?.flush(),500);
}
function cleanCloudState(raw){
 const safe=ToeicDomain.validateBackup({app:'toeic-path',version:1,state:raw},BANK,VOCAB.length);
 safe.history.forEach((history,index)=>{const original=raw.history[index];if(typeof original.attemptId==='string')history.attemptId=original.attemptId;if(typeof original.content_version==='string')history.content_version=original.content_version;history.source='client_practice';history.server_graded=false});return safe;
}
function sameCloudProgress(payload,remote){
 try{
  const normalize=raw=>{
   const value=cleanCloudState(raw),start=new Date(value.start);
   value.start=[start.getFullYear(),start.getMonth(),start.getDate()].join('-');
   value.known.sort((a,b)=>a-b);value.mistakes.sort((a,b)=>a-b);value.vocabDays.sort();
   return value;
  };
  const canonical=value=>JSON.stringify((function sort(item){return Array.isArray(item)?item.map(sort):item&&typeof item==='object'?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>[key,sort(value)])):item})(value));
  return canonical(normalize(payload.state))===canonical(normalize(remote.state))&&canonical(payload.session||null)===canonical(remote.session||null);
 }catch{return false}
}
function updateAccountView(){
 document.querySelectorAll('[data-account-panel]').forEach(node=>{node.innerHTML=cloudSettings()});setCloudStatus(ToeicCloud.status);
 // A login/account change explicitly changes the data being shown.
 if(!quiz&&(typeof practiceResultsVisible==='undefined'||!practiceResultsVisible))render();
}
async function switchCloudAccount(user,{force=false}={}){
 if(!force&&ToeicCloud.user?.id===user?.id&&ToeicCloud.ready)return;
 const epoch=++ToeicCloud.epoch;clearTimeout(ToeicCloud.timer);ToeicCloud.sync?.close();ToeicCloud.sync=null;ToeicCloud.ready=false;
 if(quiz){persistQuiz();quiz=null;clearInterval(clock);stopAudio()}
 ToeicCloud.user=user||null;ToeicCloud.openPractices=[];
 storageKey=user?'toeic-path-user-'+user.id:'toeic-path-v1';
 QUIZ_CHECKPOINT_KEY=user?storageKey+'-session':'toeic-path-session-v1';
 let cached=null;try{cached=JSON.parse(localStorage.getItem(storageKey)||'null')}catch{}
 state=fresh();try{if(cached)state=cleanCloudState(cached)}catch{cached=null}
 if(!user){ToeicCloud.ready=true;setCloudStatus('local');updateAccountView();return}
 setCloudStatus('loading');updateAccountView();
 try{
  const remote=await ToeicCloud.repository.load(user.id);if(epoch!==ToeicCloud.epoch)return;
  const revision=remote?.revision||0,meta=readSyncMeta();
  if(meta.dirty){try{cached=cleanCloudState(JSON.parse(localStorage.getItem(storageKey)||'null'))}catch{cached=null}}
  const dirty=!!(meta.dirty&&cached);if(dirty)state=cached;
  if(!dirty){
   state=remote?cleanCloudState(remote.state):fresh();
   localStorage.setItem(storageKey,JSON.stringify(state));
   if(remote?.session)localStorage.setItem(QUIZ_CHECKPOINT_KEY,JSON.stringify(remote.session));else localStorage.removeItem(QUIZ_CHECKPOINT_KEY);
  }
  const identical=dirty&&remote&&sameCloudProgress({state,session:checkpointValue()},remote);
  ToeicCloud.sync=createProgressSync({repository:ToeicCloud.repository,userId:user.id,sameProgress:sameCloudProgress,revision:dirty&&!identical?(meta.revision||0):revision,
   onStatus:status=>{if(epoch===ToeicCloud.epoch&&!(ToeicCloud.status==='conflict'&&status==='pending'))setCloudStatus(status)},
   onCommit:(revision,dirty)=>{if(epoch===ToeicCloud.epoch)writeSyncMeta(revision,dirty)}});
  ToeicCloud.ready=true;
  if(dirty&&!identical){
   ToeicCloud.sync.enqueue(state,checkpointValue());
   if((meta.revision||0)!==revision)setCloudStatus('conflict');else await ToeicCloud.sync.flush();
  }else{writeSyncMeta(revision,false);setCloudStatus(remote?'saved':'local')}
  updateAccountView();if(typeof refreshPracticeOverview==='function')refreshPracticeOverview().catch(()=>{});
 }catch{if(epoch===ToeicCloud.epoch){ToeicCloud.ready=false;setCloudStatus('error');updateAccountView()}}
}
async function initCloud(){
 if(typeof SupabaseSDK==='undefined'||typeof TOEIC_CONFIG==='undefined')return;
 try{
  ToeicCloud.client=SupabaseSDK.createClient(TOEIC_CONFIG.supabaseUrl,TOEIC_CONFIG.supabasePublishableKey,{auth:{storageKey:'toeic-path-auth-v1',flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  ToeicCloud.repository=createCloudRepository(ToeicCloud.client);
  ToeicCloud.client.auth.onAuthStateChange((event,session)=>{if(['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT'].includes(event))setTimeout(()=>switchCloudAccount(session?.user||null).catch(()=>setCloudStatus('error')),0)});
  const {session}=await ToeicCloud.repository.session();
  if(session){const {user}=await ToeicCloud.repository.user();await switchCloudAccount(user)}else await switchCloudAccount(null);
 }catch{setCloudStatus('error')}
}
document.addEventListener('submit',async event=>{
 if(event.target.id!=='cloud-auth-form')return;event.preventDefault();
 if(!ToeicCloud.repository){toast('Sign-in could not load. Please refresh and try again.');return}
 const email=String(new FormData(event.target).get('email')||'').trim();if(!email||ToeicCloud.emailPending)return;
 ToeicCloud.emailPending=true;updateAccountView();
 try{await ToeicCloud.repository.signIn(email,location.origin+location.pathname);toast('Check your email and open the sign-in link in this browser.')}catch{toast('The sign-in email could not be sent. Please wait a moment and try again.')}
 finally{ToeicCloud.emailPending=false;updateAccountView()}
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-cloud-action]');if(!button)return;
 const action=button.dataset.cloudAction;
 try{
  if(action==='retry'){
   if(!ToeicCloud.ready){await switchCloudAccount(ToeicCloud.user,{force:true});return}
   if(ToeicCloud.status==='conflict'){toast('Load the latest cloud progress before syncing. Your local copy is kept on this device.');return}
   queueCloudProgress();await ToeicCloud.sync?.flush();
  }
  if(action==='reload'&&confirm('Load cloud progress? Unsynced changes stay in a separate local backup.')){
   localStorage.setItem(storageKey+'-before-reload',JSON.stringify({state,session:checkpointValue()}));writeSyncMeta(0,false);await switchCloudAccount(ToeicCloud.user,{force:true});
  }
  if(action==='guest-import'){
   const guest=JSON.parse(localStorage.getItem('toeic-path-v1')||'null');if(!guest){toast('There is no guest history on this device.');return}
   const incoming=ToeicDomain.validateBackup({app:'toeic-path',version:1,state:guest},BANK,VOCAB.length),merged=ToeicDomain.mergeBackup(state,incoming);
   if(confirm(`Import ${merged.added} guest sessions? ${merged.duplicates} duplicates will be skipped. Your account goal stays unchanged.`)){state=merged.state;save();render()}
  }
  if(action==='sign-out'){
   if(ToeicCloud.sync?.pending){const saved=await ToeicCloud.sync.flush();if(!saved&&!confirm('Some changes are not synced. Sign out and keep them on this device?'))return}
   await ToeicCloud.repository.signOut();await switchCloudAccount(null);
  }
 }catch{toast('The account action could not finish. Your progress remains on this device.')}
});
window.addEventListener('online',()=>{if(ToeicCloud.ready&&ToeicCloud.status!=='conflict')ToeicCloud.sync?.flush()});
