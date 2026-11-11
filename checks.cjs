const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const nodes={};let timer;
const element=()=>({innerHTML:'',textContent:'',style:{},classList:{remove(){}},insertAdjacentHTML(_,html){this.innerHTML+=html}});
const localData=new Map();
const context=vm.createContext({console,document:{querySelector:s=>nodes[s]??=element(),addEventListener(){}},window:{addEventListener(){},scrollTo(){}},localStorage:{getItem:key=>localData.get(key)||null,setItem:(key,value)=>localData.set(key,value)},location:{hash:''},history:{},setInterval:fn=>{timer=fn;return 1},runTimer:()=>timer(),clearInterval(){},setTimeout(){},confirm:()=>true,Date,Math,Set,Map,JSON,assert});
for(const file of ['questions.js','more-questions.js','practice-library.js','app.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),context,{filename:file});
vm.runInContext(`
assert.equal(BANK.length,246);assert.equal(PRACTICE_SETS.length,10);
const fingerprints=new Set();
for(const q of BANK){assert.ok(q.options[q.answer]);assert.ok(q.explanation);assert.equal(q.options.length,q.part===2?3:4);if(q.part<5)assert.ok(q.audio);if(q.part===1)assert.ok(SCENES[q.scene]);if(q.part>=6)assert.ok(q.passage);const fp=JSON.stringify([q.part,q.prompt,q.options,q.audio,q.passage,q.scene]);assert.ok(!fingerprints.has(fp),'Duplicate question '+q.id);fingerprints.add(fp)}
assert.equal(BANK[0].scene,'office');assert.equal(BANK[45].id,46);assert.equal(BANK[45].part,7);
const used=new Set();for(const set of PRACTICE_SETS){assert.equal(set.questions.length,20);for(const id of set.questions){assert.ok(!used.has(id),'Tests overlap');used.add(id);assert.equal(BANK.find(q=>q.id===id).setId,set.id)}assert.equal(new Set(set.questions.map(id=>BANK.find(q=>q.id===id).part)).size,7)}
assert.equal(used.size,200);
assert.equal(accuracy([{correct:true},{correct:false},{correct:false},{correct:false}]),25);
for(const view of [dashboard,plan,practice,tests,vocab,review,progress,settings])assert.ok(view().length);
for(const count of [10,14,20,30,50])for(let i=0;i<10;i++){const selected=balanced(count);assert.equal(selected.length,count);assert.equal(new Set(selected.map(q=>q.id)).size,count);assert.equal(new Set(selected.map(q=>q.part)).size,7)}
state=fresh();state.history.push({date:new Date().toISOString(),name:'Old progress',answers:[{id:1,chosen:1,correct:true}],seconds:30});assert.equal(freshFirst(BANK).at(-1).id,1);
start('part',2);assert.equal(quiz.questions.length,8);quiz=null;
testMode='timed';start('set',1);assert.equal(quiz.questions.length,20);assert.equal(quiz.limit,1200);quiz.questions.forEach(q=>quiz.answers[q.id]=q.answer);finishQuiz();assert.equal(state.history.at(-1).setId,1);assert.equal(accuracy(state.history.at(-1).answers),100);assert.ok(tests().includes('Best: 100%'));
testMode='learning';start('set',2);assert.equal(quiz.limit,0);finishQuiz();assert.equal(state.mistakes.length,20);
start('review');quiz.questions.forEach(q=>quiz.answers[q.id]=q.answer);finishQuiz();assert.equal(state.mistakes.length,0);
for(const scope of ['mixed','listening','reading'])for(const count of [10,20,30,50]){start('custom',5,{scope,count,mode:'timed'});assert.equal(quiz.questions.length,count);assert.equal(quiz.limit,count*60);assert.equal(new Set(quiz.questions.map(q=>q.id)).size,count);if(scope==='listening')assert.ok(quiz.questions.every(q=>q.part<=4));if(scope==='reading')assert.ok(quiz.questions.every(q=>q.part>=5));quiz=null}
start('custom',5,{scope:'reading',count:10,mode:'learning'});assert.equal(quiz.limit,0);quiz=null;
testMode='timed';start('set',3);quiz.deadline=Date.now()-1000;runTimer();assert.equal(quiz,null);assert.equal(state.history.at(-1).setId,3);assert.equal(state.history.at(-1).answers.length,20);assert.equal(accuracy(state.history.at(-1).answers),0);
const saved=JSON.parse(localStorage.getItem(storageKey));assert.ok(saved.history.some(h=>h.setId===1));assert.ok(saved.history.some(h=>h.name==='Old progress'));
console.log('PASS: 246 unique questions; 10 disjoint 20-question tests; all 7 parts; 50 balanced-selection runs; fresh-first selection; custom sessions; timed expiry; scoring; notebook; storage and legacy history.');
`,context);
