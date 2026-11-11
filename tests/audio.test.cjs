const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..',process.argv.includes('--built')?'dist':'src');
let voices=[
 {name:'Microsoft David - English (United States)',lang:'en-US',voiceURI:'david'},
 {name:'Microsoft Zira - English (United States)',lang:'en-US',voiceURI:'zira'},
 {name:'Microsoft Hazel - English (Great Britain)',lang:'en-GB',voiceURI:'hazel'},
 {name:'French voice',lang:'fr-FR',voiceURI:'fr'},
];
const spoken=[],notices=[],listeners=new Map(),events={},store=new Map();
const synth={getVoices:()=>voices,cancel(){},speak:u=>spoken.push(u),addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn)},removeEventListener(type,fn){listeners.get(type)?.delete(fn)}};
const context=vm.createContext({console,window:{speechSynthesis:synth},SpeechSynthesisUtterance:class{constructor(text){this.text=text}},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},document:{querySelectorAll:()=>[],addEventListener:(type,fn)=>events[type]=fn},toast:message=>notices.push(message),escapeHTML:value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),setTimeout,clearTimeout,Promise});
vm.runInContext(fs.readFileSync(path.join(root,'js/audio.js'),'utf8'),context);
const run=code=>vm.runInContext(code,context);
const emitVoices=()=>[...(listeners.get('voiceschanged')||[])].forEach(fn=>fn());

(async()=>{
 assert.equal(run('dialogueVoices().female.voiceURI'),'zira');
 assert.equal(run('dialogueVoices().male.voiceURI'),'david');
 assert.equal(run('englishVoices().length'),3);
 await run('speak("Woman: Good morning. Man: Is the room ready? Woman: Yes, please come in.")');
 assert.equal(spoken.length,1);assert.equal(spoken[0].voice.voiceURI,'zira');assert.equal(spoken[0].text,'Good morning.');
 spoken[0].onend();assert.equal(spoken[1].voice.voiceURI,'david');assert.equal(spoken[1].text,'Is the room ready?');
 spoken[1].onend();assert.equal(spoken[2].voice.voiceURI,'zira');assert.equal(spoken[2].text,'Yes, please come in.');
 spoken[2].onend();assert.equal(spoken.length,3);
 assert.deepEqual(JSON.parse(run('JSON.stringify(dialogueTurns("Customer: I need a receipt. Assistant: Here you are."))')),[{role:'male',text:'I need a receipt.'},{role:'female',text:'Here you are.'}]);
 await run('speak("Welcome to the station.")');assert.equal(spoken.at(-1).voice.voiceURI,'zira');
 await run('speak("This is a male voice sample.","male")');assert.equal(spoken.at(-1).voice.voiceURI,'david');
 events.change({target:{matches:()=>true,dataset:{voiceRole:'female'},value:'hazel'}});
 assert.equal(JSON.parse(store.get('toeic-path-voices-v1')).female,'hazel');
 await run('speak("Woman: Thank you.")');assert.equal(spoken.at(-1).voice.voiceURI,'hazel');assert.equal(spoken.at(-1).lang,'en-GB');
 events.change({target:{matches:()=>true,dataset:{},value:'1.1'}});
 await run('speak("Woman: Please wait. Man: All right.")');assert.equal(spoken.at(-1).rate,1.1);
 const canceled=spoken.at(-1),beforeCancel=spoken.length;run('stopAudio()');canceled.onend();assert.equal(spoken.length,beforeCancel,'Stop must prevent the next turn.');
 voices=[];const waiting=run('speak("Woman: Voices have loaded. Man: I can hear you.")');const beforeLoad=spoken.length;
 voices=[{name:'Samantha',lang:'en-US',voiceURI:'samantha'},{name:'Daniel',lang:'en-GB',voiceURI:'daniel'}];emitVoices();await waiting;
 assert.equal(spoken.length,beforeLoad+1);assert.equal(spoken.at(-1).voice.voiceURI,'samantha');
 voices=[];const pending=run('speak("Woman: This must not play.")');run('stopAudio()');const beforeStop=spoken.length;voices=[{name:'Samantha',lang:'en-US',voiceURI:'samantha'}];emitVoices();await pending;assert.equal(spoken.length,beforeStop,'Stop must also cancel a pending voice load.');
 assert.equal(run('dialogueVoices().male.voiceURI'),'samantha');assert.ok(run('voiceNote()').includes('Only one English voice'));
 context.window.speechSynthesis=null;await run('speak("Hello")');assert.ok(notices.at(-1).includes('unavailable'));
 console.log('PASS: distinct female/male voices; dialogue turn order; speaker labels removed; narrator and preview roles; persisted selection; speed; late voice loading; cancellation and single-voice fallback.');
})().catch(error=>{console.error(error);process.exitCode=1});
