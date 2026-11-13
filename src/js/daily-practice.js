function todayPractice(){return createDailyPractice({bank:BANK,history:state.history,mistakes:state.mistakes,minutes:state.minutes,today:dayKey()})}
function dailyPracticeCard(){
 const plan=todayPractice(),ready=plan.status==='ready';
 const explanation=plan.coldStart?'Start with a short balanced check. Your next session will adapt after the results.':'Your session combines due mistakes, parts with enough first-answer evidence, and new material.';
 const empty=plan.status==='goal-complete'?'You have reached today’s study-time goal. Review your results or return tomorrow.':plan.status==='all-practiced'?'You have practiced all available groups today. Rest, review your explanations, or return tomorrow.':`No complete group fits the time left. The shortest available group needs about ${Math.ceil((plan.shortest_group_seconds||0)/60)} minutes.`;
 return `<section class="panel daily-practice-card" style="margin-bottom:24px"><div class="eyebrow">YOUR NEXT SESSION · ${escapeHTML(plan.date)}</div><h3>${ready?'A practice session that fits today':'A good moment to review'}</h3><p class="sub">${ready?escapeHTML(explanation):escapeHTML(empty)}</p>${ready?`<p><b>${plan.questionIds.length} questions · about ${Math.ceil(plan.estimated_seconds/60)} min</b> · ${Math.floor(plan.budget_seconds/60)} min left in your daily goal</p><ul>${plan.groups.slice(0,4).map(g=>`<li><b>Part ${g.part}</b> · ${escapeHTML(g.reason.text)}</li>`).join('')}</ul><button type="button" class="primary" data-start-today="${plan.revision}">Start this session →</button>`:'<a class="secondary" href="#progress">View my progress →</a>'}<p class="note">Time is estimated. Shared passages count once; groups stay together. Suggestions are practice rules, not a calibrated diagnosis or a promised TOEIC score.</p></section>`;
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-start-today]');if(!button||button.dataset.startToday===undefined)return;
 const current=todayPractice();if(current.revision!==button.dataset.startToday||!current.questionIds.length){toast('Your plan has changed. Review the updated session.');render();return}
 start('today',5,{ids:current.questionIds,planRevision:current.revision});
});
