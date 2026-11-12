const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..',process.argv.includes('--built')?'dist':'src'),c=vm.createContext({});
for(const file of ['data/questions.js','data/practice-sets.js','data/heygen-part3.js','data/heygen-extra.js','data/content-metadata.js','domain/core.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const {bank,metadata}=JSON.parse(vm.runInContext('JSON.stringify({bank:BANK,metadata:CONTENT_METADATA})',c));
vm.runInContext('this.domain=ToeicDomain',c);const d=c.domain;
assert.equal(metadata.questions.length,246);assert.equal(metadata.audio.length,102);assert.equal(metadata.questions.filter(q=>q.metadata_status==='reviewed').length,12);
for(const q of bank){assert.ok(q.group_id&&q.content_version);assert.equal(q.difficulty,null);if(q.audio)assert.ok(metadata.audio.some(a=>a.id===q.audio_asset_id));assert.ok(q.group_estimated_seconds>=q.estimated_seconds)}
for(const count of [10,14,20,30,50])for(let i=0;i<15;i++){
 const selected=d.selectQuestions(bank,count,[],{balanced:true});assert.equal(new Set(selected.map(q=>q.part)).size,7);assert.ok(Math.abs(selected.length-count)<=1);
 for(const q of selected)assert.deepEqual(Array.from(selected).filter(s=>s.group_id===q.group_id).map(s=>s.id),bank.filter(s=>s.group_id===q.group_id).map(s=>s.id),'Never split a shared passage');
}
for(const group of d.groups(bank)){const qs=bank.filter(q=>q.group_id===group.id);assert.equal(group.seconds,qs[0].shared_seconds+qs.reduce((n,q)=>n+q.estimated_seconds,0))}
for(const budget of [0,30,60,300,1200,2700]){const plan=d.selectWithinBudget(bank,budget);assert.ok(plan.estimated_seconds<=budget);assert.equal(plan.estimated_seconds+plan.remaining_seconds,budget);assert.equal(plan.groups.reduce((n,g)=>n+g.seconds,0),plan.estimated_seconds)}
assert.equal(d.selectWithinBudget(bank,0).reason,'no-complete-group-fits');
const history=[{date:'2026-01-01',name:'First',seconds:10,answers:[{id:24,chosen:0,correct:false},{id:27,chosen:2,correct:true},{id:25,chosen:null,correct:false}]},{date:'2026-01-02',name:'Again',seconds:10,answers:[{id:24,chosen:2,correct:true}]}];
const evidence=d.performance(history,bank);assert.equal(evidence.first.count,2);assert.equal(evidence.first.accuracy,50);assert.equal(evidence.repeats.count,1);assert.equal(evidence.repeats.accuracy,100);assert.equal(evidence.skills[0].confidence,'low');
const empty={weeks:8,target:750,minutes:20,start:'2026-01-01',history:[],mistakes:[],known:[],vocabDays:[]};
const incoming=d.validateBackup({app:'toeic-path',version:1,state:{...empty,user_id:'forged',history,mistakes:[24,24],known:[1,1]}},bank,24);assert.equal(incoming.user_id,undefined);assert.equal(incoming.history[0].server_graded,false);
const merged=d.mergeBackup(empty,incoming);assert.equal(merged.added,2);const twice=d.mergeBackup(merged.state,incoming);assert.equal(twice.added,0);assert.equal(twice.duplicates,2);assert.equal(twice.state.target,750);
assert.throws(()=>d.validateBackup({app:'toeic-path',version:1,state:{...empty,history:[{...history[0],answers:[{id:24,chosen:99,correct:true}]}]}},bank,24));
assert.throws(()=>d.validateBackup({app:'toeic-path',version:1,state:{...empty,vocabDays:['2026-02-31']}},bank,24));
console.log('PASS: content identities, whole-group selection, shared time counted once, first/repeat evidence, strict import and deduplicated merge.');
