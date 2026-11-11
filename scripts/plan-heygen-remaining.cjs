// Export existing approved copy only. This script does not generate speech.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const destination=path.resolve(process.argv[2]||path.join(root,'../artifacts/heygen-all-voices'));
const context=vm.createContext({});
for(const file of ['questions.js','practice-sets.js','heygen-part3.js'])vm.runInContext(fs.readFileSync(path.join(root,'src/data',file),'utf8'),context);
const data=JSON.parse(vm.runInContext('JSON.stringify({questions:BANK,vocabulary:VOCAB,existing:HEYGEN_PART3_AUDIO})',context));
const existing=new Set(data.existing.recordings.map(record=>record.text));
const recordings=[],seen=new Set();
function add(text,kind,turns,questionIds=[]){if(existing.has(text)||seen.has(text))return;seen.add(text);recordings.push({id:recordings.length+1,text,kind,questionIds,turns})}
for(const question of data.questions){
 if(!question.audio||question.part===3||seen.has(question.audio))continue;
 const text=question.audio,ids=data.questions.filter(q=>q.audio===text).map(q=>q.id);
 let turns;
 if(question.part===2){
  const firstOption=text.search(/\sA\.\s/);
  if(firstOption<0)throw Error('Question-response options are missing.');
  turns=[{role:'female',text:text.slice(0,firstOption).trim()},{role:'male',text:text.slice(firstOption).trim()}];
 }else turns=[{role:'female',text}];
 add(text,'part-'+question.part,turns,ids);
}
for(const [word,,example] of data.vocabulary){const text=word+'. '+example;add(text,'vocabulary',[{role:'female',text}])}
add('Hello. I will read the female speaker’s lines in your practice conversations.','preview-female',[{role:'female',text:'Hello. I will read the female speaker’s lines in your practice conversations.'}]);
add('Hello. I will read the male speaker’s lines in your practice conversations.','preview-male',[{role:'male',text:'Hello. I will read the male speaker’s lines in your practice conversations.'}]);
const batches=[];
for(const role of ['female','male']){
 let batch=null;
 for(const record of recordings)for(let turnIndex=0;turnIndex<record.turns.length;turnIndex++){
  const turn=record.turns[turnIndex];if(turn.role!==role)continue;
  if(!batch||batch.text.length+turn.text.length+2>3500){batch={id:role+'-'+String(batches.filter(b=>b.role===role).length+1).padStart(2,'0'),role,voice:data.existing.voices[role],text:'',segments:[]};batches.push(batch)}
  if(batch.text)batch.text+='\n\n';const start=batch.text.length;batch.text+=turn.text;
  const segment={recording:record.id,turn:turnIndex,role,text:turn.text,start,end:batch.text.length,batch:batch.id};
  batch.segments.push(segment);record.turns[turnIndex]=segment;
 }
}
const plan={scope:'All remaining listening, vocabulary and preview speech; reuse existing Part 3',voices:data.existing.voices,language:'en',settings:{encoding:'pcm',sample_rate_hertz:24000,bit_depth:16,num_channels:1},existingPart3:data.existing.recordings.length,recordings,batches};
fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,'plan.json'),JSON.stringify(plan,null,2));
console.log(JSON.stringify({newRecordings:recordings.length,existingPart3:plan.existingPart3,totalRecordings:recordings.length+plan.existingPart3,batches:batches.map(b=>({id:b.id,role:b.role,characters:b.text.length,segments:b.segments.length}))}));
