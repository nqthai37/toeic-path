// Deterministic, rule-based session planning. Estimates are not TOEIC scores.
function createDailyPractice({bank,history,mistakes,minutes,today}){
 const learning=typeof ToeicDomain!=='undefined'?ToeicDomain:require('./core.js'),lookup=new Map(bank.map(q=>[q.id,q]));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today)||!Number.isFinite(minutes)||minutes<=0)throw Error('Invalid planning inputs');
 const day=value=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 const hash=value=>{let n=2166136261;for(const char of value){n^=char.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
 const ordered=history.slice().sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)),first=new Map(),latest=new Map(),touchedToday=new Set();
 for(const session of ordered)for(const answer of session.answers){
  if(!lookup.has(answer.id))continue;latest.set(answer.id,{...answer,date:session.date});if(answer.chosen!==null&&!first.has(answer.id))first.set(answer.id,answer);
  if(day(session.date)===today)touchedToday.add(answer.id);
 }
 const spent=Math.max(0,Math.round(ordered.filter(h=>day(h.date)===today).reduce((n,h)=>n+h.seconds,0))),budget=Math.max(0,Math.floor(minutes*60-spent));
 const parts=Array.from({length:7},(_,i)=>({part:i+1,count:0,wrong:0}));
 for(const [id,answer] of first){const question=lookup.get(id);if(question){const p=parts[question.part-1];p.count++;if(!answer.correct)p.wrong++}}
 const weak=parts.filter(p=>p.count>=5&&p.wrong/p.count>=.4).sort((a,b)=>b.wrong/b.count-a.wrong/a.count||a.part-b.part);
 const due=new Set(mistakes.filter(id=>latest.has(id)&&day(latest.get(id).date)<today));
 const all=learning.groups(bank),eligible=all.filter(g=>!g.questions.some(q=>touchedToday.has(q.id)));
 const seed=JSON.stringify([today,minutes,ordered.map(h=>[h.date,h.answers.map(a=>[a.id,a.chosen,a.correct])]),[...mistakes].sort((a,b)=>a-b)]);
 const seedHash=hash(seed);const priority=(a,b)=>hash(String(seedHash)+a.id)-hash(String(seedHash)+b.id)||a.id.localeCompare(b.id);
 const cold=first.size<14,selected=[],used=new Set();let seconds=0,count=0;
 function take(group,reason){if(!group||used.has(group.id)||seconds+group.seconds>budget||count+group.questions.length>50)return false;used.add(group.id);seconds+=group.seconds;count+=group.questions.length;selected.push({...group,reason});return true}
 if(cold){
  let n=seedHash;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
  const candidates=learning.selectQuestions(eligible.flatMap(g=>g.questions),14,history,{balanced:true,random});
  for(const group of learning.groups(candidates))take(group,{type:'diagnostic',text:'Build a balanced first-answer baseline. There is not enough evidence to identify a weak skill yet.'});
 }else{
  const review=eligible.filter(g=>g.questions.some(q=>due.has(q.id))).sort(priority);
  const focus=eligible.filter(g=>weak.some(p=>p.part===g.part)).sort((a,b)=>weak.findIndex(p=>p.part===a.part)-weak.findIndex(p=>p.part===b.part)||priority(a,b));
  const fresh=eligible.filter(g=>g.questions.some(q=>!first.has(q.id))).sort(priority);
  const buckets=[review,focus,fresh];let moved=true;
  while(moved){moved=false;for(let i=0;i<buckets.length;i++){
   while(buckets[i].length){const group=buckets[i].shift();const evidence=weak.find(p=>p.part===group.part);
    const reason=i===0?{type:'review',text:'Revisit a previous mistake after at least one day.'}:i===1?{type:'focus',part:group.part,sample:evidence.count,wrong:evidence.wrong,text:`Part ${group.part}: ${evidence.wrong} of ${evidence.count} first answers were incorrect. This is a limited practice sample.`}:{type:'new',text:'Include new material alongside review and focused practice.'};
    if(take(group,reason)){moved=true;break}
   }
  }}
  for(const group of eligible.slice().sort(priority))take(group,{type:'maintain',text:'Maintain your skills with material not practiced today.'});
 }
 if(cold&&!selected.length){const fallback=eligible.slice().sort((a,b)=>a.seconds-b.seconds||priority(a,b))[0];take(fallback,{type:'diagnostic',text:'Begin with a complete group that fits your remaining time.'})}
 const shortest=eligible.length?Math.min(...eligible.map(g=>g.seconds)):null;
 return {revision:hash(String(seedHash)+selected.map(g=>g.id).join(',')).toString(16),date:today,coldStart:cold,confidence:first.size<14?'low':'limited',firstAnswers:first.size,minutes,spent_seconds:spent,budget_seconds:budget,estimated_seconds:seconds,
  groups:selected,questionIds:selected.flatMap(g=>g.questions.map(q=>q.id)),remaining_seconds:budget-seconds,
  status:selected.length?'ready':budget===0?'goal-complete':!eligible.length?'all-practiced':'no-group-fits',shortest_group_seconds:shortest};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createDailyPractice};
