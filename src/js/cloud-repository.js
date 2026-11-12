// Inject the SDK client so the data boundary can be tested independently.
function createCloudRepository(client){
 async function unwrap(request){const {data,error}=await request;if(error)throw error;return data}
 return {
  session:()=>unwrap(client.auth.getSession()),
  user:()=>unwrap(client.auth.getUser()),
  signIn:(email,redirect)=>unwrap(client.auth.signInWithOtp({email,options:{emailRedirectTo:redirect}})),
  signOut:()=>unwrap(client.auth.signOut({scope:'local'})),
  load:userId=>unwrap(client.from('progress_snapshots').select('state,session,revision,updated_at').eq('user_id',userId).maybeSingle()),
  save:(state,session,revision,ownerId)=>unwrap(client.rpc('save_progress',{p_state:{...state,_owner_id:ownerId},p_session:session,p_revision:revision})),
 };
}
function createProgressSync({repository,revision=0,userId=null,onStatus=()=>{},onCommit=()=>{}}){
 let pending=null,running=null,closed=false;
 const controller={
  get revision(){return revision},get pending(){return !!pending},
  enqueue(state,session){if(closed)return;pending=JSON.parse(JSON.stringify({state,session}));onStatus('pending')},
  close(){closed=true;pending=null},
  flush(){
   if(closed)return Promise.resolve(false);if(running)return running;
   running=(async()=>{
    while(pending&&!closed){
     const payload=pending;onStatus('saving');
     try{
      const result=await repository.save(payload.state,payload.session,revision,userId);
      if(closed)return false;
      if(!Number.isInteger(result?.revision)||result.revision<=revision)throw Error('Invalid save acknowledgement');
      revision=result.revision;if(pending===payload)pending=null;
      onCommit(revision,!!pending);onStatus(pending?'pending':'saved');
     }catch(error){if(!closed)onStatus(/Stale revision/i.test(error.message||'')?'conflict':'error');return false}
    }
    return !closed;
   })().finally(()=>{running=null});return running;
  }
 };
 return controller;
}
if(typeof module!=='undefined'&&module.exports)module.exports={createCloudRepository,createProgressSync};
