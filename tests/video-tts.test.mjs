import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWaveAudio,pollVideoTtsQueue,validVideoJob,videoTtsResult} from '../workers/guest-trial/video-tts.mjs';
function pcmWav(seconds=1){
 const raw=Buffer.alloc(Math.ceil(seconds*24000*2));
 const b=Buffer.alloc(44+raw.length);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);
 b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
 b.write('data',36);b.writeUInt32LE(raw.length,40);raw.copy(b,44);return b;
}
function fakeDB(){
 const rows=new Map();
 return {rows,prepare(sql){return {async run(){if(sql.startsWith('CREATE TABLE IF NOT EXISTS crew_video_tts_jobs')||sql.startsWith('CREATE INDEX IF NOT EXISTS crew_video_tts_jobs'))return {meta:{changes:0}};throw Error('Unexpected direct D1 run SQL: '+sql);},bind(...params){return {
  async run(){
   if(sql.startsWith('CREATE TABLE IF NOT EXISTS crew_video_tts_jobs')||sql.startsWith('CREATE INDEX IF NOT EXISTS crew_video_tts_jobs'))return {meta:{changes:0}};
   if(sql.startsWith('DELETE FROM crew_video_tts_jobs'))return {meta:{changes:0}};
   if(sql.startsWith('INSERT OR IGNORE INTO crew_video_tts_jobs')){
    const [id,day,createdAt,budgetDay,limit]=params;
    assert.equal(budgetDay,day);
    assert.ok(Number.isInteger(limit)&&limit>=1&&limit<=50,'D1 receives a bounded daily limit');
    if(rows.has(id)||[...rows.values()].filter(x=>x.day===day).length>=limit)return {meta:{changes:0}};
    rows.set(id,{status:'processing',day,createdAt});return {meta:{changes:1}};
   }
   if(sql.startsWith("UPDATE crew_video_tts_jobs SET status='ready'")){
    const [wav,seconds,id]=params;rows.set(id,{...rows.get(id),status:'ready',seconds,wav:Array.from(wav)});return {meta:{changes:1}};
   }
   if(sql.startsWith("UPDATE crew_video_tts_jobs SET status='failed'")){
    const [error,id]=params;rows.set(id,{...rows.get(id),status:'failed',error});return {meta:{changes:1}};
   }
   throw Error('Unexpected D1 run SQL: '+sql);
  },
  async first(){if(sql.startsWith('SELECT status,seconds,wav'))return rows.get(params[0])||null;throw Error('Unexpected D1 first SQL');}
 };}};}};
}
const now=Date.parse('2026-10-30T09:00:00Z');
const job={id:'crew-tts-permissions-101-20261030',day:'2026-10-30',voice:'Kore',text:'一個帳號，需要多少權限？只給真正需要的權限。'};
test('only short same/previous-day owner queue jobs are eligible',()=>{
 assert.equal(validVideoJob(job,now),true);
 assert.equal(validVideoJob({...job,day:'2026-10-29'},now),true);
 assert.equal(validVideoJob({...job,day:'2026-10-20'},now),false);
 assert.equal(validVideoJob({...job,text:'x'.repeat(400)},now),false);
 assert.equal(validVideoJob({...job,voice:'unsupported'},now),false);
});
test('a verified queue triggers one Gemini TTS call, stores audio and serves result, never shares key',async()=>{
 const db=fakeDB(),env={CREW_AUTH_DB:db,GEMINI_GUEST_API_KEY:'mock-secret'};
 const wav=pcmWav(3),calls=[];
 const requestFetch=async (url,init)=>{
  calls.push(String(url));
  if(String(url).startsWith('https://raw.githubusercontent.com/')){
   assert.ok(!String(url).includes('secret'));
   return Response.json({version:1,enabled:true,jobs:[job]});
  }
  if(String(url).endsWith('/v1beta/interactions')){
   assert.equal(init.headers['x-goog-api-key'],'mock-secret');
   const b=JSON.parse(init.body);
   assert.equal(b.model,'gemini-3.8-flash-tts');
   assert.equal(b.input[0].content[0].text,job.text);
   return Response.json({steps:[{type:'model_output',content:[{type:'audio',data:wav.toString('base64')}]}]});
  }
  throw Error('Unexpected fetch '+url);
 };
 const opts={now,requestFetch,pickKey:env=>env.GEMINI_GUEST_API_KEY};
 assert.deepEqual(await pollVideoTtsQueue(env,opts),{status:'ready',jobId:job.id,seconds:3});
 assert.equal(db.rows.size,1);
 assert.deepEqual(await pollVideoTtsQueue(env,opts),{status:'idle'});
 assert.equal(calls.filter(x=>x.endsWith('/v1beta/interactions')).length,1);
 const result=await videoTtsResult(new Request('https://crew-guest-trial.shanliyoung.workers.dev/api/video/tts/result?id='+job.id),env);
 assert.equal(result.status,200);assert.equal(result.headers.get('content-type'),'audio/wav');
 const resBytes=Buffer.from(await result.arrayBuffer());assert.equal(resBytes.byteLength,wav.byteLength);
 assert.equal(resBytes.toString('ascii',0,4),'RIFF');
});
test('feature is off by default and invalid WAV is rejected',async()=>{
 const db=fakeDB();assert.deepEqual(await pollVideoTtsQueue({CREW_VIDEO_TTS_ENABLED:'0',CREW_AUTH_DB:db}),{status:'disabled'});
 const r=await videoTtsResult(new Request('https://crew-guest-trial.shanliyoung.workers.dev/api/video/tts/result?id='+job.id),{CREW_VIDEO_TTS_ENABLED:'0',CREW_AUTH_DB:db});
 assert.equal(r.status,404);
 assert.throws(()=>parseWaveAudio('bm90IGEgV0FWIGZpbGU='));
});
test('TTS audio diagnostics distinguish malformed, too-small, oversized and overlong WAV payloads',()=>{
 const badPayload={message:'bad_audio_payload'};
 assert.throws(()=>parseWaveAudio(Buffer.alloc(100).toString('base64')),badPayload);
 assert.throws(()=>parseWaveAudio('A'.repeat(127)+'-'),badPayload);
 assert.throws(()=>parseWaveAudio('A'.repeat(2_133_340)+'!'),badPayload);
 const exact=Buffer.alloc(1_600_000);
 pcmWav(1).copy(exact,0,0,44);
 exact.writeUInt32LE(exact.length-8,4);
 exact.writeUInt32LE(48000,24);
 exact.writeUInt32LE(96000,28);
 exact.writeUInt32LE(exact.length-44,40);
 assert.equal(parseWaveAudio(exact.toString('base64')).bytes.length,1_600_000);
 assert.equal(parseWaveAudio(pcmWav(1).toString('base64').replace(/=+$/,'')).seconds,1);
 // The encoded lengths for 1,600,000 and 1,600,001 bytes can be equal.
 assert.throws(()=>parseWaveAudio(Buffer.alloc(1_600_001).toString('base64')),{message:'audio_too_large'});
 assert.throws(()=>parseWaveAudio(Buffer.alloc(1_600_003).toString('base64')),{message:'audio_too_large'});
 assert.throws(()=>parseWaveAudio(pcmWav(31.1).toString('base64')),{message:'bad_wav_length'});
});
test('an oversized upstream WAV yields the safe size code and is never retried automatically',async()=>{
 const db=fakeDB(),env={CREW_AUTH_DB:db};
 const audio=Buffer.alloc(1_600_003).toString('base64');
 let attempts=0;
 const requestFetch=async url=>{
  if(String(url).startsWith('https://raw.githubusercontent.com/'))return Response.json({version:1,enabled:true,jobs:[job]});
  attempts++;
  return Response.json({steps:[{type:'model_output',content:[{type:'audio',data:audio}]}]});
 };
 const opts={now,requestFetch,pickKey:()=> 'key'};
 assert.deepEqual(await pollVideoTtsQueue(env,opts),{status:'failed',jobId:job.id});
 const result=await videoTtsResult(new Request('https://crew-guest-trial.shanliyoung.workers.dev/api/video/tts/result?id='+job.id),env);
 assert.equal(result.status,202);
 assert.deepEqual(await result.json(),{status:'failed',error_code:'audio_too_large'});
 assert.deepEqual(await pollVideoTtsQueue(env,opts),{status:'idle'});
 assert.equal(attempts,1);
});
// A mock queue can change between cron invocations (the real queue has <=20 entries).
function ttsQueue(jobs){
 const wav=pcmWav(1).toString('base64');
 let calls=0;
 const state={jobs};
 const requestFetch=async url=>{
  if(String(url).startsWith('https://raw.githubusercontent.com/'))return Response.json({version:1,enabled:true,jobs:state.jobs});
  assert.ok(String(url).endsWith('/v1beta/interactions'));
  calls++;
  return Response.json({steps:[{type:'model_output',content:[{type:'audio',data:wav}]}]});
 };
 return {state,requestFetch,get calls(){return calls}};
}
function makeJobs(count,start=0){
 return Array.from({length:count},(_,i)=>({...job,id:'crew-tts-demo-request-'+(start+i)+'-abcde'}));
}
function seedRows(db,count){
 for(let i=0;i<count;i++)db.rows.set('old-'+i,{day:'2026-10-30',status:'ready',createdAt:now});
}
test('default limit is 20 per UTC day; each cron invocation reserves at most one job',async()=>{
 const db=fakeDB(),env={CREW_AUTH_DB:db};
 const queue=ttsQueue(makeJobs(20)),opts={requestFetch:queue.requestFetch,pickKey:()=> 'key',now};
 for(let i=0;i<20;i++){
  const result=await pollVideoTtsQueue(env,opts);
  assert.equal(result.status,'ready');
  assert.equal(db.rows.size,i+1,'only one reservation per cron invocation');
  assert.equal(queue.calls,i+1);
 }
 queue.state.jobs=makeJobs(1,20);
 assert.deepEqual(await pollVideoTtsQueue(env,opts),{status:'idle'});
 assert.equal(db.rows.size,20);
 assert.equal(queue.calls,20,'limit prevents another paid synthesis');
});
test('custom limit from Worker variable applies to new job reservations',async()=>{
 for(const [value,expected] of [['1',1],['2',2],['5',5],['50',50]]){
  const db=fakeDB(),env={CREW_AUTH_DB:db,CREW_VIDEO_TTS_MAX_JOBS_PER_DAY:value};
  const queue=ttsQueue([]),opts={requestFetch:queue.requestFetch,pickKey:()=> 'key',now};
  for(let i=0;i<expected;i++){
   // Queue is limited to 20 entries; a single cron never processes more than 1.
   queue.state.jobs=makeJobs(1,i);
   assert.equal((await pollVideoTtsQueue(env,opts)).status,'ready');
  }
  queue.state.jobs=makeJobs(1,expected);
  assert.deepEqual(await pollVideoTtsQueue(env,opts),{status:'idle'});
  assert.equal(db.rows.size,expected);
  assert.equal(queue.calls,expected);
 }
});
test('invalid/missing Worker limit falls back to 20, not unlimited',async()=>{
 for(const invalid of [undefined,'', 'abc','0','51','-1','1.5','Infinity',' 2 ','999999999999999999999999',null,{},20.5]){
  const db=fakeDB();seedRows(db,19);
  const env={CREW_AUTH_DB:db,CREW_VIDEO_TTS_MAX_JOBS_PER_DAY:invalid};
  const queue=ttsQueue(makeJobs(2)),opts={requestFetch:queue.requestFetch,pickKey:()=> 'key',now};
  assert.equal((await pollVideoTtsQueue(env,opts)).status,'ready',String(invalid));
  assert.deepEqual(await pollVideoTtsQueue(env,opts),{status:'idle'},String(invalid));
  assert.equal(db.rows.size,20,String(invalid));
  assert.equal(queue.calls,1,String(invalid));
 }
});
test('failed jobs count against budget and are terminal (no automatic retry)',async()=>{
 const db=fakeDB(),env={CREW_AUTH_DB:db,CREW_VIDEO_TTS_MAX_JOBS_PER_DAY:'1'};
 let attempts=0;
 const requestFetch=async url=>{
  if(String(url).startsWith('https://raw.githubusercontent.com/'))return Response.json({version:1,enabled:true,jobs:[job]});
  attempts++;
  return new Response('upstream error',{status:429});
 };
 const opts={now,requestFetch,pickKey:()=> 'key'};
 assert.deepEqual(await pollVideoTtsQueue(env,opts),{status:'failed',jobId:job.id});
 assert.equal(db.rows.get(job.id).status,'failed');
 assert.deepEqual(await pollVideoTtsQueue(env,opts),{status:'idle'});
 assert.equal(attempts,1);
 assert.equal(db.rows.size,1);
});

test('failed TTS result exposes only allowlisted diagnostic codes, not raw errors',async()=>{
 const db=fakeDB(),env={CREW_AUTH_DB:db};
 const req=new Request('https://crew-guest-trial.shanliyoung.workers.dev/api/video/tts/result?id='+job.id);
 for(const [raw,expected] of [
  ['upstream_429','upstream_429'],
  ['upstream_503','upstream_503'],
  ['bad_wav_length','bad_wav_length'],
  ['audio_too_large','audio_too_large'],
  ['The operation was aborted due to timeout','upstream_timeout'],
  ['api_key=do-not-leak','internal_error'],
  [null,'internal_error']
 ]){
  db.rows.set(job.id,{status:'failed',error:raw});
  const res=await videoTtsResult(req,env);
  assert.equal(res.status,202);
  assert.deepEqual(await res.json(),{status:'failed',error_code:expected});
 }
 db.rows.set(job.id,{status:'processing'});
 const pending=await videoTtsResult(req,env);
 assert.deepEqual(await pending.json(),{status:'processing'});
});
