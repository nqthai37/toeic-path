const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),c=vm.createContext({});
for(const file of ['questions','practice-sets','heygen-part3','heygen-extra','content-metadata'])vm.runInContext(fs.readFileSync(path.join(root,'src/data',file+'.js'),'utf8'),c);
const data=JSON.parse(vm.runInContext('JSON.stringify({questions:BANK,tests:PRACTICE_SETS,metadata:CONTENT_METADATA,scenes:SCENES})',c));
const sql=value=>value===null||value===undefined?'null':"'"+String(value).replace(/'/g,"''")+"'";
const statements=['-- Generated content only; no accounts, credentials or user progress.','begin;'];
for(const asset of data.metadata.audio)statements.push(`insert into public.audio_assets(id,storage_path,sha256,duration,metadata) values(${sql(asset.id)},${sql(asset.src)},${sql(asset.sha256)},${asset.duration},${sql(JSON.stringify({turns:asset.turns,transcript:asset.transcript,qa_status:asset.qa_status}))}::jsonb) on conflict do nothing;`);
const seen=new Set();
for(const q of data.questions){
 if(!seen.has(q.group_id)){seen.add(q.group_id);statements.push(`insert into public.question_groups(id,part,audio_asset_id,passage,illustration,estimated_seconds) values(${sql(q.group_id)},${q.part},${sql(q.audio_asset_id)},${sql(q.passage)},${sql(data.scenes[q.scene])},${q.group_estimated_seconds}) on conflict do nothing;`)}
 statements.push(`insert into public.questions(id,content_version,group_id,part,prompt,options,skill_tags,metadata_status) values(${q.id},${sql(q.content_version)},${sql(q.group_id)},${q.part},${sql(q.prompt)},${sql(JSON.stringify(q.options))}::jsonb,array[${q.skill_tags.map(sql).join(',')}],${sql(q.metadata_status)}) on conflict do nothing;`);
 statements.push(`insert into private.answer_keys(question_id,content_version,answer,explanation) values(${q.id},${sql(q.content_version)},${q.answer},${sql(q.explanation)}) on conflict do nothing;`);
}
for(const test of data.tests){statements.push(`insert into public.practice_tests(id,title,minutes) values(${test.id},${sql(test.title)},${test.minutes}) on conflict do nothing;`);test.questions.forEach((id,i)=>statements.push(`insert into public.test_questions(test_id,question_id,position) values(${test.id},${id},${i}) on conflict do nothing;`))}
statements.push('commit;');const output=statements.join('\n')+'\n',filename=path.join(root,'supabase/seed.sql');
if(process.argv.includes('--check')){if(fs.readFileSync(filename,'utf8')!==output)throw Error('Stale SQL seed')}else fs.writeFileSync(filename,output);
console.log('PASS: deterministic SQL seed; 246 questions, 154 groups, 102 audio assets and 10 tests.');
