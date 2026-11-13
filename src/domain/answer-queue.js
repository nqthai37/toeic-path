function createAnswerQueue({save,revision=0,pending={},onStatus=()=>{},onAck=()=>{}}){
 const choices=new Map(Object.entries(pending).map(([id,value])=>[Number(id),value]));let running=null,closed=false;
 const queue={
  get revision(){return revision},get pending(){return Object.fromEntries(choices)},get size(){return choices.size},
  enqueue(id,choice){if(closed)return;choices.set(id,choice);onStatus('pending')},
  close(){closed=true},
  flush(){
   if(closed)return Promise.resolve(false);if(running)return running;
   running=(async()=>{
    while(choices.size&&!closed){
     const [id,choice]=choices.entries().next().value;onStatus('saving');
     try{
      const next=await save(id,choice,revision);if(closed)return false;
      if(!Number.isInteger(next)||next<=revision)throw Error('Invalid answer acknowledgement');
      revision=next;if(choices.get(id)===choice)choices.delete(id);onAck(id,choice,revision);
     }catch(error){if(!closed)onStatus(/Stale revision/i.test(error.message||'')?'conflict':'error');return false}
    }
    if(!closed)onStatus('saved');return !closed;
   })().finally(()=>{running=null});return running;
  }
 };
 return queue;
}
if(typeof module!=='undefined'&&module.exports)module.exports={createAnswerQueue};
