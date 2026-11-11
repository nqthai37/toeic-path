const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..',process.argv.includes('--built')?'dist':'src');
const context=vm.createContext({});
for(const file of ['questions.js','practice-sets.js','heygen-part3.js','heygen-extra.js'])vm.runInContext(fs.readFileSync(path.join(root,'data',file),'utf8'),context);
const data=JSON.parse(vm.runInContext('JSON.stringify({questions:BANK,vocabulary:VOCAB,manifests:[HEYGEN_PART3_AUDIO,HEYGEN_EXTRA_AUDIO]})',context));
const records=data.manifests.flatMap(m=>m.recordings),byText=new Map(records.map(r=>[r.text,r]));
assert.equal(records.length,102);assert.equal(byText.size,102);
for(const manifest of data.manifests){assert.equal(manifest.provider,'HeyGen');assert.equal(manifest.voices.female.id,'44c2584dd48f46b7bce9b66c8bf086e0');assert.equal(manifest.voices.male.id,'6d140b3078404b9893f3279d53f13f74')}
const provenance=['heygen-part3-provenance.json','heygen-all-voices-provenance.json'].flatMap(file=>JSON.parse(fs.readFileSync(path.join(__dirname,'../docs',file),'utf8')).recordings);
for(const record of records){
 const filename=path.resolve(root,record.src);assert.ok(!path.relative(root,filename).startsWith('..'));
 const bytes=fs.readFileSync(filename);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
 assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt32LE(24),24000);assert.equal(bytes.readUInt16LE(34),16);
 const frames=bytes.readUInt32LE(40)/2,duration=frames/24000;assert.equal(bytes.length,44+frames*2);assert.ok(Math.abs(duration-record.duration)<1/24000);
 const proof=provenance.find(p=>p.src===record.src);assert.ok(proof);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),proof.sha256);
 for(const [index,turn] of record.turns.entries()){
  assert.ok(['female','male'].includes(turn.role));assert.ok(turn.start>=0&&turn.end>turn.start&&turn.end<=duration+1/24000);
  if(index)assert.ok(turn.start>=record.turns[index-1].end);
  let square=0;const begin=Math.round(turn.start*24000),end=Math.round(turn.end*24000);
  for(let frame=begin;frame<end;frame++)square+=bytes.readInt16LE(44+frame*2)**2;
  assert.ok(Math.sqrt(square/(end-begin))>10,'A speech turn must contain audio');
 }
}
const listening=data.questions.filter(q=>q.audio);assert.equal(new Set(listening.map(q=>q.audio)).size,76);
for(const question of listening){const record=byText.get(question.audio);assert.ok(record,`Missing question ${question.id}`);assert.ok(record.questionIds.includes(question.id));if(question.part===2)assert.deepEqual(record.turns.map(t=>t.role),['female','male']);if(question.part===3)assert.equal(new Set(record.turns.map(t=>t.role)).size,2)}
for(const [word,,example] of data.vocabulary)assert.ok(byText.has(word+'. '+example));
assert.equal(data.manifests[1].recordings.filter(r=>r.kind.startsWith('preview-')).length,2);
console.log('PASS: 102 WAV files and hashes; all 76 listening passages, 24 vocabulary clips and 2 previews; selected voice IDs, timed turns, coverage and non-silent speech.');
