const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..',process.argv.includes('--built')?'dist':'src');
const players=[],notices=[],events={},status={textContent:''};
const storage=new Map([['toeic-path-voices-v1',JSON.stringify({female:'old-device',male:'old-device',rate:1})],['toeic-path-audio-source-v1','browser']]);
class FakeAudio{
 constructor(src){this.src=src;this.currentTime=0;this.paused=true;players.push(this)}
 play(){this.paused=false;this.onplay?.();return FakeAudio.nextPlay?.()||Promise.resolve()}
 pause(){this.paused=true}
 removeAttribute(name){if(name==='src')this.src=''}
 load(){}
}
const context=vm.createContext({Audio:FakeAudio,document:{querySelectorAll:selector=>selector==='[data-audio-status]'?[status]:[],addEventListener(type,fn){events[type]=fn}},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},toast:text=>notices.push(text)});
for(const file of ['data/heygen-part3.js','data/heygen-extra.js','js/audio.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const run=code=>vm.runInContext(code,context);
(async()=>{
 await run('speak(HEYGEN_PART3_AUDIO.recordings[0].text)');
 const first=players.at(-1),record=JSON.parse(run('JSON.stringify(HEYGEN_PART3_AUDIO.recordings[0])'));
 assert.equal(first.src,record.src);assert.equal(first.playbackRate,1);assert.equal(first.preservesPitch,true);
 first.currentTime=record.turns.find(turn=>turn.role==='male').start;first.ontimeupdate();assert.match(status.textContent,/Dmitri/);
 const staleEnd=first.onended,staleError=first.onerror;
 await run('speak(HEYGEN_EXTRA_AUDIO.recordings[0].text)');
 assert.equal(first.paused,true);assert.equal(first.src,'');const currentStatus=status.textContent;
 staleEnd();staleError();assert.equal(status.textContent,currentStatus);assert.equal(notices.length,0);
 const second=players.at(-1);run('stopAudio()');assert.equal(second.paused,true);assert.equal(status.textContent,'Playback stopped');
 events.change({target:{matches:()=>true,value:'1.1'}});assert.equal(JSON.parse(storage.get('toeic-path-voices-v1')).rate,1.1);
 events.change({target:{matches:()=>true,value:'999'}});assert.equal(run('voicePreferences.rate'),1.1);
 await run('speak(HEYGEN_EXTRA_AUDIO.recordings[0].text)');assert.equal(players.at(-1).playbackRate,1.1);players.at(-1).onended();assert.equal(status.textContent,'Playback complete · HeyGen');
 for(const role of ['female','male']){events.click({target:{closest:()=>({dataset:{previewVoice:role}})}});assert.equal(players.at(-1).src,run(`heygenRecordings.get(VOICE_PREVIEWS.${role}).src`))}
 const count=players.length;await run('speak("Unknown recording")');assert.equal(players.length,count);assert.match(notices.at(-1),/unavailable/);
 FakeAudio.nextPlay=()=>Promise.reject(Error('network'));await run('speak(HEYGEN_EXTRA_AUDIO.recordings[0].text)');assert.match(status.textContent,/unavailable/);assert.match(notices.at(-1),/Try Play audio again/);assert.equal(players.at(-1).paused,true);
 let rejectOld;FakeAudio.nextPlay=()=>new Promise((_,reject)=>{rejectOld=reject});const pending=run('speak(HEYGEN_EXTRA_AUDIO.recordings[0].text)');
 FakeAudio.nextPlay=null;await run('speak(HEYGEN_EXTRA_AUDIO.recordings[1].text)');const before=status.textContent;rejectOld(Error('late'));await pending;assert.equal(status.textContent,before,'A stale rejected play must not stop the new player');assert.equal(players.at(-1).paused,false);
 const controls=run('voiceControls()');assert.match(controls,/Preview Faye/);assert.match(controls,/Preview Dmitri/);assert.ok(!/Device voices|data-voice-role|data-audio-source/.test(controls));
 assert.ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(fs.readFileSync(path.join(root,'js/audio.js'),'utf8')));
 console.log('PASS: recorded playback, fixed voices, legacy rate compatibility, speed/pitch, previews, Stop, missing files, errors and stale callbacks.');
})().catch(error=>{console.error(error);process.exitCode=1});
