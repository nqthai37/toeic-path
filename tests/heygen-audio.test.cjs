const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..',process.argv.includes('--built')?'dist':'src');
const players=[],spoken=[],notices=[],events={},storage=new Map(),status={textContent:''};
class FakeAudio{
 constructor(src){this.src=src;this.currentTime=0;this.paused=true;players.push(this)}
 play(){if(FakeAudio.fail){FakeAudio.fail=false;return Promise.reject(Error('Unavailable'))}this.paused=false;this.onplay?.();return Promise.resolve()}
 pause(){this.paused=true}
 removeAttribute(name){if(name==='src')this.src=''}
 load(){}
}
const context=vm.createContext({console,Audio:FakeAudio,window:{speechSynthesis:{getVoices:()=>[{name:'Microsoft Zira',voiceURI:'zira',lang:'en-US'},{name:'Microsoft David',voiceURI:'david',lang:'en-US'}],speak:utterance=>spoken.push(utterance),cancel(){},addEventListener(){},removeEventListener(){}}},SpeechSynthesisUtterance:class{constructor(text){this.text=text}},document:{querySelectorAll:selector=>selector==='[data-audio-status]'?[status]:[],addEventListener(type,listener){(events[type]??=[]).push(listener)}},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},escapeHTML:text=>String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),toast:message=>notices.push(message),setTimeout,clearTimeout,Promise});
for(const file of ['data/questions.js','data/practice-sets.js','data/heygen-part3.js','js/audio.js','js/heygen-player.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const run=code=>vm.runInContext(code,context);
const manifest=JSON.parse(run('JSON.stringify(HEYGEN_PART3_AUDIO)'));
assert.equal(manifest.recordings.length,13);
assert.equal(manifest.voices.female.id,'44c2584dd48f46b7bce9b66c8bf086e0');
assert.equal(manifest.voices.male.id,'6d140b3078404b9893f3279d53f13f74');
const ids=new Set();
for(const record of manifest.recordings){
 const bytes=fs.readFileSync(path.join(root,record.src));
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
 assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt32LE(24),24000);assert.equal(bytes.readUInt16LE(34),16);
 const duration=bytes.readUInt32LE(40)/48000;assert.ok(Math.abs(duration-record.duration)<1/24000);
 assert.ok(record.turns.length>=3);assert.equal(new Set(record.turns.map(turn=>turn.role)).size,2);
 record.turns.forEach((turn,i)=>{assert.ok(turn.start>=0&&turn.end>turn.start&&turn.end<=duration+1/24000);if(i)assert.ok(turn.start>=record.turns[i-1].end)});
 for(const id of record.questionIds){assert.ok(!ids.has(id));ids.add(id)}
}
assert.equal(ids.size,36);
assert.equal(run('BANK.filter(q=>q.part===3).every(q=>heygenRecordings.has(q.audio))'),true);
const changeSource=source=>{for(const listener of events.change)listener({target:{value:source,matches:selector=>selector==='[data-audio-source]'}})};
(async()=>{
 await run('speak(HEYGEN_PART3_AUDIO.recordings[0].text)');
 assert.equal(players.length,1);assert.equal(spoken.length,0);assert.equal(players[0].src,manifest.recordings[0].src);assert.equal(players[0].playbackRate,.92);assert.equal(players[0].preservesPitch,true);
 const first=players[0];first.currentTime=manifest.recordings[0].turns.find(turn=>turn.role==='male').start;first.ontimeupdate();assert.ok(status.textContent.includes('Dmitri'));
 const oldEnd=first.onended;run('stopAudio()');assert.equal(first.paused,true);assert.equal(first.src,'');oldEnd();assert.equal(status.textContent,'Playback stopped');
 run('voicePreferences.rate=1.1');await run('speak(HEYGEN_PART3_AUDIO.recordings[1].text)');assert.equal(players.at(-1).playbackRate,1.1);players.at(-1).onended();assert.equal(status.textContent,'Playback complete · HeyGen');
 changeSource('browser');assert.equal(storage.get('toeic-path-audio-source-v1'),'browser');await run('speak(HEYGEN_PART3_AUDIO.recordings[0].text)');assert.ok(spoken.length>0,'Explicit device fallback must work');
 changeSource('heygen');const before=players.length;await run('speak("An unrelated vocabulary example.")');assert.equal(players.length,before,'Other parts must keep device speech');
 FakeAudio.fail=true;await run('speak(HEYGEN_PART3_AUDIO.recordings[0].text)');assert.ok(notices.at(-1).includes('HeyGen recording'));assert.equal(run('preferredAudioSource'),'heygen','A load error must not silently change the selected source');
 assert.ok(run('voiceControls(HEYGEN_PART3_AUDIO.recordings[0].text)').includes('HeyGen · Faye & Dmitri'));assert.ok(run('voiceControls("Other listening part")').includes('Part 3 only'));
 console.log('PASS: 13 valid local WAV files; 36 Part 3 questions covered; exact approved voice pair; ordered turn timings; recorded playback, Stop, speed, explicit device fallback and load errors.');
})().catch(error=>{console.error(error);process.exitCode=1});
