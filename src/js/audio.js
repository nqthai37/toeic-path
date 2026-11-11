// SpeechSynthesis has no standard gender field. Recognize common voice names,
// and let the learner choose the actual English voices installed on their device.
const VOICE_STORAGE_KEY='toeic-path-voices-v1';
const FEMALE_VOICES=/\b(female|zira|aria|jenny|samantha|victoria|karen|moira|tessa|fiona|susan|hazel|libby|sonia|ava|emma|allison|joanna|salli|kimberly|kendra|amy)\b|Google US English/i;
const MALE_VOICES=/\b(male|david|mark|guy|ryan|daniel|alex|george|james|thomas|oliver|liam|tom|brian|matthew|justin|joey)\b/i;
let voicePreferences={female:'',male:'',rate:.92};
try{const saved=JSON.parse(localStorage.getItem(VOICE_STORAGE_KEY)||'{}');voicePreferences={female:typeof saved.female==='string'?saved.female:'',male:typeof saved.male==='string'?saved.male:'',rate:[.85,.92,1,1.1].includes(saved.rate)?saved.rate:.92}}catch{}
let speechGeneration=0,activeUtterance=null;
function speechEngine(){return window.speechSynthesis||null}
function englishVoices(){return speechEngine()?.getVoices().filter(v=>/^en(?:[-_]|$)/i.test(v.lang))||[]}
function voiceKey(voice){return voice.voiceURI||voice.name+'|'+voice.lang}
function dialogueVoices(){
 const voices=englishVoices();
 const preferred=role=>voices.find(v=>voiceKey(v)===voicePreferences[role]);
 const female=preferred('female')||voices.find(v=>FEMALE_VOICES.test(v.name))||voices.find(v=>!MALE_VOICES.test(v.name)&&v.lang==='en-US')||voices[0]||null;
 const male=preferred('male')||voices.find(v=>v!==female&&MALE_VOICES.test(v.name))||voices.find(v=>v!==female)||female;
 return {female,male};
}
function dialogueTurns(text,defaultRole='female'){
 const markers=[...text.matchAll(/\b(Woman|Man|Customer|Assistant):\s*/gi)];
 if(!markers.length)return [{role:defaultRole,text:text.trim()}].filter(turn=>turn.text);
 const turns=[];
 if(markers[0].index>0){const intro=text.slice(0,markers[0].index).trim();if(intro)turns.push({role:defaultRole,text:intro})}
 markers.forEach((marker,i)=>{const content=text.slice(marker.index+marker[0].length,markers[i+1]?.index??text.length).trim();if(content)turns.push({role:/^(woman|assistant)$/i.test(marker[1])?'female':'male',text:content})});
 return turns;
}
function audioStatus(text){document.querySelectorAll('[data-audio-status]').forEach(status=>{status.textContent=text})}
function stopAudio(){speechGeneration++;activeUtterance=null;speechEngine()?.cancel();audioStatus('English speech · female / male voices')}
function waitForVoices(engine){
 if(engine.getVoices().length)return Promise.resolve();
 return new Promise(resolve=>{
  let timeout;
  const ready=()=>{clearTimeout(timeout);engine.removeEventListener('voiceschanged',changed);resolve()};
  const changed=()=>{if(engine.getVoices().length)ready()};
  engine.addEventListener('voiceschanged',changed);
  timeout=setTimeout(ready,1200);
  changed();
 });
}
async function speak(text,defaultRole='female'){
 const engine=speechEngine();
 if(!engine){toast('Speech playback is unavailable in this browser. Use the transcript for this drill.');return}
 stopAudio();const generation=speechGeneration;
 await waitForVoices(engine);
 if(generation!==speechGeneration)return;
 const voices=dialogueVoices(),turns=dialogueTurns(text,defaultRole);
 const playTurn=index=>{
  if(generation!==speechGeneration||index>=turns.length){if(generation===speechGeneration){activeUtterance=null;audioStatus('Playback complete')}return}
  const turn=turns[index],voice=voices[turn.role];
  const utterance=new SpeechSynthesisUtterance(turn.text);
  activeUtterance=utterance;
  utterance.lang=voice?.lang||'en-US';utterance.rate=voicePreferences.rate;
  // Use the actual selected voice, rather than changing pitch to imitate a speaker.
  if(voice)utterance.voice=voice;
  utterance.onstart=()=>{if(generation===speechGeneration)audioStatus(`Playing · ${turn.role==='female'?'Female':'Male'} voice${voice?' · '+voice.name:''}`)};
  utterance.onend=()=>playTurn(index+1);
  utterance.onerror=event=>{if(generation!==speechGeneration)return;activeUtterance=null;audioStatus('Playback stopped');if(!['interrupted','canceled'].includes(event.error))toast('Playback could not start. Try another voice or use the transcript.')};
  engine.speak(utterance);
 };
 playTurn(0);
}
function voiceOptions(role){
 const selected=dialogueVoices()[role];
 return `<option value="">Automatic${selected?' · '+escapeHTML(selected.name):' · device default'}</option>`+englishVoices().map(v=>`<option value="${escapeHTML(voiceKey(v))}" ${voicePreferences[role]===voiceKey(v)?'selected':''}>${escapeHTML(v.name)} (${escapeHTML(v.lang)})</option>`).join('');
}
function voiceNote(){
 if(!speechEngine())return 'Speech playback is unavailable in this browser.';
 const {female,male}=dialogueVoices();
 if(!female)return 'English voices are loading or unavailable. Your device’s default English voice will be used. Add English voices to your device for more options.';
 if(female===male)return 'Only one English voice is available. Add another English voice to your device to hear two distinct speakers.';
 return 'Woman / Assistant uses the female voice; Man / Customer uses the male voice. Voices depend on your device; choose your preferred pair and listen to the samples.';
}
function voiceControls(){return `<details class="voice-settings"><summary>♬ Voice settings · female & male</summary><div class="voice-grid"><label>Female voice<select aria-label="Female voice" data-voice-role="female">${voiceOptions('female')}</select><button class="text-btn" data-preview-voice="female" type="button">▶ Test female voice</button></label><label>Male voice<select aria-label="Male voice" data-voice-role="male">${voiceOptions('male')}</select><button class="text-btn" data-preview-voice="male" type="button">▶ Test male voice</button></label><label>Playback speed<select aria-label="Playback speed" data-voice-rate>${[.85,.92,1,1.1].map(rate=>`<option value="${rate}" ${voicePreferences.rate===rate?'selected':''}>${rate}×${rate===.92?' · recommended':''}</option>`).join('')}</select></label></div><p class="note" data-voice-note>${voiceNote()}</p></details>`}
function refreshVoiceMenus(){document.querySelectorAll('[data-voice-role]').forEach(select=>{select.innerHTML=voiceOptions(select.dataset.voiceRole)});document.querySelectorAll('[data-voice-note]').forEach(note=>{note.textContent=voiceNote()})}
speechEngine()?.addEventListener('voiceschanged',refreshVoiceMenus);
document.addEventListener('change',event=>{
 const select=event.target;
 if(!select.matches('[data-voice-role], [data-voice-rate]'))return;
 stopAudio();
 if(select.dataset.voiceRole){const role=select.dataset.voiceRole;if(!['female','male'].includes(role))return;voicePreferences[role]=select.value}
 else{const rate=Number(select.value);if(![.85,.92,1,1.1].includes(rate))return;voicePreferences.rate=rate}
 try{localStorage.setItem(VOICE_STORAGE_KEY,JSON.stringify(voicePreferences))}catch{toast('Voice preferences could not be saved on this device.')}
 refreshVoiceMenus();
});
document.addEventListener('click',event=>{const button=event.target.closest('[data-preview-voice]');if(!button)return;const role=button.dataset.previewVoice;if(['female','male'].includes(role))speak(role==='female'?'Hello. I will read the female speaker’s lines in your practice conversations.':'Hello. I will read the male speaker’s lines in your practice conversations.',role)});
