const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..',process.argv.includes('--built')?'dist':'src'),c=vm.createContext({});
for(const file of ['data/questions.js','data/practice-sets.js','data/heygen-part3.js','data/heygen-extra.js','data/content-metadata.js','domain/core.js','domain/daily-plan.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const bank=JSON.parse(vm.runInContext('JSON.stringify(BANK)',c)),plan=vm.runInContext('createDailyPractice',c);
const input={bank,history:[],mistakes:[],minutes:20,today:'2026-11-13'};
const normal=v=>JSON.parse(JSON.stringify(v));
assert.deepEqual(normal(plan(input)),normal(plan(input)),'Reload must produce the same session');
for(const minutes of [.01,1,5,20,45,120]){
 const p=plan({...input,minutes});assert.ok(p.estimated_seconds<=p.budget_seconds);assert.ok(p.questionIds.length<=50);
 assert.equal(p.estimated_seconds,p.groups.reduce((n,g)=>n+g.seconds,0),'Shared material counts once');
 for(const g of p.groups)assert.deepEqual(Array.from(g.questions,q=>q.id),bank.filter(q=>q.group_id===g.id).map(q=>q.id));
}
assert.equal(plan({...input,minutes:.1}).status,'no-group-fits');
const sample=bank.slice(0,18),answer=(q,correct)=>({id:q.id,chosen:0,correct});
const old={date:'2026-11-12T10:00:00',seconds:120,answers:sample.map(q=>answer(q,false))};
const recent={date:'2026-11-13T10:00:00',seconds:300,answers:[answer(bank[0],false)]};
const p=plan({...input,history:[old,recent],mistakes:sample.map(q=>q.id)});
assert.equal(p.budget_seconds,900);assert.ok(!p.groups.some(g=>g.id===bank[0].group_id),'Exclude the entire group touched today');
assert.ok(p.groups.some(g=>g.reason.type==='review'));
assert.equal(plan({...input,history:[{...recent,seconds:1200}]}).status,'goal-complete');
const all=plan({...input,history:[{...recent,seconds:1,answers:bank.map(q=>answer(q,true))}]});assert.equal(all.status,'all-practiced');
const repeats=Array.from({length:20},(_,i)=>({...old,date:`2026-10-${String(i+1).padStart(2,'0')}`,answers:[answer(bank[0],false)]}));
const sparse=plan({...input,history:repeats});assert.equal(sparse.firstAnswers,1);assert.ok(sparse.groups.every(g=>g.reason.type!=='focus'));
const synthetic=Array.from({length:7},(_,i)=>Array.from({length:12},(_,j)=>({id:i*12+j+1,part:i+1,group_id:`g-${i}-${j}`,group_estimated_seconds:60}))).flat();
const profile=weakPart=>({bank:synthetic,minutes:3,today:input.today,mistakes:[],history:[{...old,answers:synthetic.filter(q=>q.id%12<3||q.part===weakPart&&q.id%12<7).map(q=>answer(q,q.part!==weakPart))}]});
const a=plan(profile(2)),b=plan(profile(5));
assert.ok(a.groups.some(g=>g.reason.type==='focus'&&g.part===2));assert.ok(b.groups.some(g=>g.reason.type==='focus'&&g.part===5));assert.notDeepEqual(Array.from(a.questionIds),Array.from(b.questionIds));
assert.ok(plan({...input,history:[{...old,answers:[{id:999999,chosen:0,correct:false}]}]}).coldStart);
console.log('PASS: deterministic daily sessions, whole groups, shared time, daily budget, spaced mistakes, first-answer evidence and different learner profiles.');

