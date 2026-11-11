const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..',process.argv.includes('--built')?'dist':'src');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scriptFiles=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1]);
assert.deepEqual(scriptFiles,['data/questions.js','data/practice-sets.js','js/practice-library.js','js/app.js'],'Script paths and load order must be preserved.');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if (/^(?:https?:|data:)/.test(match[1])) continue;
  const asset=path.resolve(root,match[1]);
  assert.ok(!path.relative(root,asset).startsWith('..'),'Assets must stay inside the site root.');
  assert.ok(fs.existsSync(asset),'Missing linked asset: '+match[1]);
}
const nodes={};let timer;
const element=()=>({innerHTML:'',textContent:'',style:{},classList:{remove(){}},insertAdjacentHTML(_,html){this.innerHTML+=html}});
const localData=new Map();
const clickListeners=[];
const viewport={scrollX:0,scrollY:0,addEventListener(){},scrollTo(x,y){this.scrollX=typeof x==='object'?(x.left??this.scrollX):x;this.scrollY=typeof x==='object'?(x.top??this.scrollY):y}};
const context=vm.createContext({console,document:{querySelector:s=>nodes[s]??=element(),querySelectorAll:()=>[],addEventListener(type,listener){if(type==='click')clickListeners.push(listener)}},window:viewport,dispatchClick(dataset){const button={dataset};for(const listener of clickListeners)listener({target:{closest:selector=>selector.startsWith('a[')?null:button},preventDefault(){}})},localStorage:{getItem:key=>localData.get(key)||null,setItem:(key,value)=>localData.set(key,value)},location:{hash:''},history:{},setInterval:fn=>{timer=fn;return 1},runTimer:()=>timer(),clearInterval(){},setTimeout(){},confirm:()=>true,Date,Math,Set,Map,JSON,assert});
for(const file of scriptFiles)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
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
start('part',7);window.scrollTo(0,480);dispatchClick({answer:'0'});assert.equal(window.scrollY,480,'Selecting an answer must preserve scroll');dispatchClick({action:'check'});assert.equal(window.scrollY,480,'Checking an answer must preserve scroll');assert.equal(quiz.checked,true);assert.ok(document.querySelector('#main').innerHTML.includes('class="explanation"'));dispatchClick({action:'next-q'});assert.equal(window.scrollY,0,'The next question should still start at the top');quiz=null;
testMode='timed';start('set',1);assert.equal(quiz.questions.length,20);assert.equal(quiz.limit,1200);quiz.questions.forEach(q=>quiz.answers[q.id]=q.answer);finishQuiz();assert.equal(state.history.at(-1).setId,1);assert.equal(accuracy(state.history.at(-1).answers),100);assert.ok(tests().includes('Best: 100%'));
testMode='learning';start('set',2);assert.equal(quiz.limit,0);finishQuiz();assert.equal(state.mistakes.length,20);
start('review');quiz.questions.forEach(q=>quiz.answers[q.id]=q.answer);finishQuiz();assert.equal(state.mistakes.length,0);
for(const scope of ['mixed','listening','reading'])for(const count of [10,20,30,50]){start('custom',5,{scope,count,mode:'timed'});assert.equal(quiz.questions.length,count);assert.equal(quiz.limit,count*60);assert.equal(new Set(quiz.questions.map(q=>q.id)).size,count);if(scope==='listening')assert.ok(quiz.questions.every(q=>q.part<=4));if(scope==='reading')assert.ok(quiz.questions.every(q=>q.part>=5));quiz=null}
start('custom',5,{scope:'reading',count:10,mode:'learning'});assert.equal(quiz.limit,0);quiz=null;
testMode='timed';start('set',3);quiz.deadline=Date.now()-1000;runTimer();assert.equal(quiz,null);assert.equal(state.history.at(-1).setId,3);assert.equal(state.history.at(-1).answers.length,20);assert.equal(accuracy(state.history.at(-1).answers),0);
const saved=JSON.parse(localStorage.getItem(storageKey));assert.ok(saved.history.some(h=>h.setId===1));assert.ok(saved.history.some(h=>h.name==='Old progress'));
console.log('PASS: 246 unique questions; 10 disjoint 20-question tests; all 7 parts; 50 balanced-selection runs; fresh-first selection; custom sessions; timed expiry; scoring; notebook; storage and legacy history.');
`,context);
