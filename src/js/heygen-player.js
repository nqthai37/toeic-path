// Part 3 recordings are local static assets. No HeyGen API or credentials run
// in the visitor's browser; other listening parts keep their device voices.
const HEYGEN_SOURCE_KEY='toeic-path-audio-source-v1';
const heygenRecordings=new Map(HEYGEN_PART3_AUDIO.recordings.map(record=>[record.text,record]));
let preferredAudioSource='heygen';
try{if(localStorage.getItem(HEYGEN_SOURCE_KEY)==='browser')preferredAudioSource='browser'}catch{}
let recordedAudio=null,recordedGeneration=0;
const speakWithDeviceVoices=speak;
const stopDeviceVoices=stopAudio;
const deviceVoiceControls=voiceControls;

function usesHeygen(text){return preferredAudioSource==='heygen'&&heygenRecordings.has(text)}
function audioSourceLabel(text){return usesHeygen(text)?'HeyGen · Faye & Dmitri':'English speech · device voices'}
stopAudio=function(){
 recordedGeneration++;
 if(recordedAudio){
  const player=recordedAudio;recordedAudio=null;
  player.onplay=player.ontimeupdate=player.onended=player.onerror=null;
  player.pause();player.removeAttribute('src');player.load();
 }
 stopDeviceVoices();
 audioStatus('Playback stopped');
};
speak=async function(text,defaultRole='female'){
 if(!usesHeygen(text))return speakWithDeviceVoices(text,defaultRole);
 stopAudio();const generation=recordedGeneration,record=heygenRecordings.get(text);
 const player=new Audio(record.src);recordedAudio=player;
 player.preload='auto';player.playbackRate=voicePreferences.rate;player.preservesPitch=true;
 let reported=false;
 const failed=()=>{
  if(generation!==recordedGeneration||reported)return;
  reported=true;audioStatus('HeyGen recording unavailable');
  toast('The HeyGen recording could not play. Try Play audio again, or choose Device voices in Voice settings.');
 };
 player.onplay=()=>{if(generation===recordedGeneration)audioStatus('Playing · HeyGen · Faye & Dmitri')};
 player.ontimeupdate=()=>{
  if(generation!==recordedGeneration)return;
  const turn=[...record.turns].reverse().find(turn=>turn.start<=player.currentTime);
  if(turn)audioStatus(`Playing · HeyGen · ${turn.role==='female'?'Faye (female)':'Dmitri (male)'}`);
 };
 player.onended=()=>{if(generation===recordedGeneration){recordedAudio=null;audioStatus('Playback complete · HeyGen')}};
 player.onerror=failed;
 try{await player.play()}catch{failed()}
};

voiceControls=function(text=''){
 const available=heygenRecordings.has(text),active=usesHeygen(text);
 const source=`<label class="audio-source-label">Audio source<select aria-label="Audio source" data-audio-source><option value="heygen" ${available?'':'disabled'} ${active?'selected':''}>HeyGen · Faye & Dmitri${available?'':' · Part 3 only'}</option><option value="browser" ${active?'':'selected'}>Device voices</option></select></label><div class="heygen-voice-pair" data-heygen-pair ${active?'':'hidden'}><b>Faye ♀ &nbsp; + &nbsp; Dmitri ♂</b><span>English · US · Original dialogue</span><button type="button" class="text-btn" data-preview-heygen>▶ Preview Faye & Dmitri</button></div>`;
 return deviceVoiceControls()
  .replace('<details class="voice-settings">',`<details class="voice-settings" data-heygen-recording="${available}">`)
  .replace('<div class="voice-grid">',source+'<div class="voice-grid">')
  .replace('<label>Female voice',`<label data-device-voice ${active?'hidden':''}>Female voice`)
  .replace('<label>Male voice',`<label data-device-voice ${active?'hidden':''}>Male voice`)
  .replace('data-voice-note>',`data-voice-note ${active?'hidden':''}>`)
  .replace('</details>',`<p class="note" data-heygen-note>${active?'This conversation uses a prerecorded HeyGen dialogue. Playback speed can be adjusted without changing the voices.':available?'Choose HeyGen above to hear Faye and Dmitri.':'HeyGen recordings are available for Part 3 conversations. This passage uses device voices.'}</p></details>`);
};
function refreshAudioSourceControls(){
 document.querySelectorAll('.voice-settings[data-heygen-recording]').forEach(panel=>{
  const available=panel.dataset.heygenRecording==='true',active=available&&preferredAudioSource==='heygen';
  panel.querySelector('[data-audio-source]').value=active?'heygen':'browser';
  panel.querySelectorAll('[data-device-voice]').forEach(label=>{label.hidden=active});
  panel.querySelector('[data-heygen-pair]').hidden=!active;
  panel.querySelector('[data-voice-note]').hidden=active;
  panel.querySelector('[data-heygen-note]').textContent=active?'This conversation uses a prerecorded HeyGen dialogue. Playback speed can be adjusted without changing the voices.':available?'Choose HeyGen above to hear Faye and Dmitri.':'HeyGen recordings are available for Part 3 conversations. This passage uses device voices.';
 });
}
document.addEventListener('change',event=>{
 if(!event.target.matches('[data-audio-source]'))return;
 const source=event.target.value;if(!['heygen','browser'].includes(source))return;
 stopAudio();preferredAudioSource=source;
 try{localStorage.setItem(HEYGEN_SOURCE_KEY,source)}catch{toast('Audio source preference could not be saved.')}
 refreshAudioSourceControls();
});
document.addEventListener('click',event=>{
 if(!event.target.closest('[data-preview-heygen]'))return;
 const record=HEYGEN_PART3_AUDIO.recordings[0];
 if(record)speak(record.text);
});
