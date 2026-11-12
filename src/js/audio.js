// All speech is prerecorded. Playback never calls a speech service or device TTS.
const VOICE_STORAGE_KEY='toeic-path-voices-v1';
const VOICE_PREVIEWS={female:'Hello. I will read the female speaker’s lines in your practice conversations.',male:'Hello. I will read the male speaker’s lines in your practice conversations.'};
let voicePreferences={rate:.92};
try{const saved=JSON.parse(localStorage.getItem(VOICE_STORAGE_KEY)||'{}');if([.85,.92,1,1.1].includes(saved.rate))voicePreferences.rate=saved.rate}catch{}
const heygenRecordings=new Map([...HEYGEN_PART3_AUDIO.recordings,...HEYGEN_EXTRA_AUDIO.recordings].map(record=>[record.text,record]));
const heygenAssets=new Map((typeof CONTENT_METADATA==='undefined'?[]:CONTENT_METADATA.audio).map(asset=>[asset.id,asset]));
let recordedAudio=null,recordedGeneration=0;
function audioStatus(text){document.querySelectorAll('[data-audio-status]').forEach(status=>{status.textContent=text})}
function audioSourceLabel(){return 'HeyGen · Faye & Dmitri'}
function stopAudio(){
 recordedGeneration++;
 if(recordedAudio){
  const player=recordedAudio;recordedAudio=null;
  player.onplay=player.ontimeupdate=player.onended=player.onerror=null;
  player.pause();player.removeAttribute('src');player.load();
 }
 audioStatus('Playback stopped');
}
async function speak(text){
 stopAudio();
 const record=typeof text==='object'&&text?heygenAssets.get(text.audio_asset_id):heygenAssets.get(text)||heygenRecordings.get(text);
 if(!record){audioStatus('Recording unavailable');toast('This recording is unavailable. Please use the transcript.');return}
 const generation=recordedGeneration,player=new Audio(record.src);recordedAudio=player;
 player.preload='auto';player.playbackRate=voicePreferences.rate;player.preservesPitch=true;
 let reported=false;
 const current=()=>generation===recordedGeneration&&recordedAudio===player;
 const failed=()=>{
  if(!current()||reported)return;
  reported=true;stopAudio();audioStatus('HeyGen recording unavailable');
  toast('The recording could not play. Try Play audio again, or use the transcript.');
 };
 const updateStatus=()=>{
  if(!current())return;
  const turn=record.turns.find(turn=>turn.start<=player.currentTime&&player.currentTime<turn.end);
  audioStatus(turn?`Playing · HeyGen · ${turn.role==='female'?'Faye (female)':'Dmitri (male)'}`:'Playing · HeyGen · Faye & Dmitri');
 };
 player.onplay=updateStatus;player.ontimeupdate=updateStatus;
 player.onended=()=>{if(current()){stopAudio();audioStatus('Playback complete · HeyGen')}};
 player.onerror=failed;
 try{await player.play()}catch{failed()}
}
function voiceControls(){return `<details class="voice-settings"><summary>♬ Voice settings · Faye & Dmitri</summary><div class="voice-grid"><div class="heygen-voice-pair"><b>Faye ♀</b><span>Female · English</span><button class="text-btn" data-preview-voice="female" type="button">▶ Preview Faye</button></div><div class="heygen-voice-pair"><b>Dmitri ♂</b><span>Male · English</span><button class="text-btn" data-preview-voice="male" type="button">▶ Preview Dmitri</button></div><label>Playback speed<select aria-label="Playback speed" data-voice-rate>${[.85,.92,1,1.1].map(rate=>`<option value="${rate}" ${voicePreferences.rate===rate?'selected':''}>${rate}×${rate===.92?' · recommended':''}</option>`).join('')}</select></label></div><p class="note">All listening and vocabulary use Faye and Dmitri recordings. Changing speed keeps the original voices.</p></details>`}
document.addEventListener('change',event=>{
 if(!event.target.matches('[data-voice-rate]'))return;
 const rate=Number(event.target.value);if(![.85,.92,1,1.1].includes(rate))return;
 stopAudio();voicePreferences.rate=rate;
 try{localStorage.setItem(VOICE_STORAGE_KEY,JSON.stringify(voicePreferences))}catch{toast('Playback speed could not be saved on this device.')}
 document.querySelectorAll('[data-voice-rate]').forEach(select=>{select.value=String(rate)});
});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-preview-voice]');if(!button)return;
 const text=VOICE_PREVIEWS[button.dataset.previewVoice];if(text)speak(text);
});
