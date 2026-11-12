// Pure learning logic shared by the web and a future native adapter.
// No DOM, storage, clock, network or global content dependencies.
const ToeicDomain=(()=>{
 const accuracy=answers=>answers.length?Math.round(100*answers.filter(a=>a.correct).length/answers.length):0;
 function shuffle(values,random=Math.random){const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
 function prioritized(pool,history,random=Math.random){
  const seen=new Map();history.forEach((h,index)=>h.answers.forEach(a=>{if(a.chosen!==null)seen.set(a.id,index+1)}));
  return shuffle(pool,random).sort((a,b)=>(seen.get(a.id)||0)-(seen.get(b.id)||0));
 }
 function groups(pool){
  const result=new Map();for(const q of pool){const key=q.group_id||'question-'+q.id;if(!result.has(key))result.set(key,[]);result.get(key).push(q)}
  return [...result.values()].map(items=>({id:items[0].group_id||'question-'+items[0].id,part:items[0].part,questions:items.sort((a,b)=>a.id-b.id),seconds:items[0].group_estimated_seconds||items.reduce((n,q)=>n+(q.estimated_seconds||45),0)}));
 }
 function selectQuestions(pool,count,history=[],{balanced=false,random=Math.random}={}){
  const ranked=prioritized(pool,history,random),ranks=new Map(ranked.map((q,i)=>[q.id,i]));
  const candidates=groups(pool).sort((a,b)=>Math.min(...a.questions.map(q=>ranks.get(q.id)))-Math.min(...b.questions.map(q=>ranks.get(q.id))));
  const chosen=[];
  if(balanced)for(const part of [...new Set(pool.map(q=>q.part))]){
   const available=candidates.filter(g=>g.part===part),min=Math.min(...available.map(g=>g.questions.length));
   const group=available.find(g=>g.questions.length===min);if(group)chosen.push(group);
  }
  const initial=chosen.reduce((n,g)=>n+g.questions.length,0),remaining=Math.max(0,count-initial),used=new Set(chosen.map(g=>g.id));
  // Keep whole groups. Fill the requested count when possible, otherwise the
  // closest smaller count; the seven-part minimum may exceed a short request.
  const possibilities=new Map([[0,[]]]);
  for(const group of candidates.filter(g=>!used.has(g.id)))for(const [size,selected] of [...possibilities].sort((a,b)=>b[0]-a[0])){
   const next=size+group.questions.length;if(next<=remaining&&!possibilities.has(next))possibilities.set(next,[...selected,group]);
  }
  chosen.push(...possibilities.get(Math.max(...possibilities.keys())));
  return chosen.flatMap(g=>g.questions).sort((a,b)=>a.part-b.part||a.id-b.id);
 }
 function selectWithinBudget(pool,seconds,history=[]){
  if(!Number.isInteger(seconds)||seconds<0)throw Error('Invalid time budget');
  const order=new Map(prioritized(pool,history).map((q,i)=>[q.id,i]));
  const available=groups(pool).sort((a,b)=>Math.min(...a.questions.map(q=>order.get(q.id)))-Math.min(...b.questions.map(q=>order.get(q.id))));
  const selected=[];let used=0;
  for(const group of available)if(used+group.seconds<=seconds){selected.push(group);used+=group.seconds}
  return {groups:selected,estimated_seconds:used,remaining_seconds:seconds-used,reason:selected.length?'within-budget':'no-complete-group-fits',shortest_group_seconds:available.length?Math.min(...available.map(g=>g.seconds)):null};
 }
 function performance(history,bank){
  const lookup=new Map(bank.map(q=>[q.id,q])),first=[],repeats=[],seen=new Set(),skills=new Map();
  const ordered=history.map((h,index)=>({h,index})).sort((a,b)=>Date.parse(a.h.date)-Date.parse(b.h.date)||a.index-b.index);
  for(const {h} of ordered)for(const answer of h.answers){
   if(answer.chosen===null||!lookup.has(answer.id))continue;
   if(seen.has(answer.id)){repeats.push(answer);continue}seen.add(answer.id);first.push(answer);
   const q=lookup.get(answer.id);if(q.metadata_status!=='reviewed')continue;
   for(const skill of q.skill_tags){if(!skills.has(skill))skills.set(skill,{id:skill,attempts:0,wrong:0});const item=skills.get(skill);item.attempts++;if(!answer.correct)item.wrong++}
  }
  return {first:{count:first.length,accuracy:accuracy(first)},repeats:{count:repeats.length,accuracy:accuracy(repeats)},skills:[...skills.values()].map(s=>({...s,confidence:s.attempts>=5?'enough-data':'low'}))};
 }
 function score(questions,answers){return questions.map(q=>({id:q.id,chosen:answers[q.id]??null,correct:answers[q.id]===q.answer}))}
 function validateBackup(data,bank,vocabularyCount){
  const s=data?.state,lookup=new Map(bank.map(q=>[q.id,q]));
  const validId=id=>Number.isInteger(id)&&lookup.has(id),date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
  if(data?.app!=='toeic-path'||data.version!==1||!s||![4,8,12].includes(s.weeks)||![20,30,45,60,90,120].includes(s.minutes)||!Number.isInteger(s.target)||s.target<10||s.target>990||s.target%5||!date(s.start))throw Error('Invalid preferences');
  if(!Array.isArray(s.history)||s.history.length>10000||!s.history.every(h=>typeof h.name==='string'&&h.name.length<=300&&date(h.date)&&Number.isFinite(h.seconds)&&h.seconds>=0&&h.seconds<=86400&&Array.isArray(h.answers)&&h.answers.length<=bank.length&&new Set(h.answers.map(a=>a.id)).size===h.answers.length&&h.answers.every(a=>validId(a.id)&&typeof a.correct==='boolean'&&(a.chosen===null||(Number.isInteger(a.chosen)&&a.chosen>=0&&a.chosen<lookup.get(a.id).options.length)))))throw Error('Invalid history');
  if(!Array.isArray(s.mistakes)||!s.mistakes.every(validId)||!Array.isArray(s.known)||!s.known.every(i=>Number.isInteger(i)&&i>=0&&i<vocabularyCount)||!Array.isArray(s.vocabDays)||!s.vocabDays.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&date(d)&&new Date(d).toISOString().slice(0,10)===d))throw Error('Invalid progress');
  // Whitelist fields. Never import account IDs, tokens or claimed cloud scores.
  return {weeks:s.weeks,target:s.target,minutes:s.minutes,start:s.start,history:s.history.map(h=>({date:h.date,name:h.name,seconds:h.seconds,setId:Number.isInteger(h.setId)?h.setId:null,source:'legacy_import',server_graded:false,answers:h.answers.map(a=>({id:a.id,chosen:a.chosen,correct:a.correct}))})),mistakes:[...new Set(s.mistakes)],known:[...new Set(s.known)],vocabDays:[...new Set(s.vocabDays)]};
 }
 const historyKey=h=>JSON.stringify([h.date,h.name,h.answers.map(a=>[a.id,a.chosen])]);
 function mergeBackup(current,incoming){
  const keys=new Set(current.history.map(historyKey)),added=incoming.history.filter(h=>{const key=historyKey(h);if(keys.has(key))return false;keys.add(key);return true});
  return {state:{...current,history:[...current.history,...added].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)),mistakes:[...new Set([...current.mistakes,...incoming.mistakes])],known:[...new Set([...current.known,...incoming.known])],vocabDays:[...new Set([...current.vocabDays,...incoming.vocabDays])]},added:added.length,duplicates:incoming.history.length-added.length};
 }
 return {accuracy,shuffle,prioritized,groups,selectQuestions,selectWithinBudget,performance,score,validateBackup,mergeBackup};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ToeicDomain;
