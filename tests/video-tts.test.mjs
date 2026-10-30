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
 return {rows,prepare(sql){return {bind(...params){return {
  async run(){
   if(sql.startsWith('DELETE FROM crew_video_tts_jobs'))return {meta:{changes:0}};
   if(sql.startsWith('INSERT OR IGNORE INTO crew_video_tts_jobs')){
    const [id,day,createdAt]=params;
    if(rows.has(id)||[...rows.values()].filter(x=>x.day===day).length>=3)return {meta:{changes:0}};
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
 const db=fakeDB(),env={CREW_VIDEO_TTS_ENABLED:'1',CREW_AUTH_DB:db,GEMINI_GUEST_API_KEY:'mock-secret'};
 const wav=pcmWav(3),calls=[];
 const requestFetch=async (url,init)=>{
  calls.push(String(url));
  if(String(url).startsWith('https://raw.githubusercontent.com/')){
   assert.ok(!String(url).includes('secret'));
   return Response.json({version:1,jobs:[job]});
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
 const db=fakeDB();assert.deepEqual(await pollVideoTtsQueue({CREW_AUTH_DB:db}),{status:'disabled'});
 const r=await videoTtsResult(new Request('https://crew-guest-trial.shanliyoung.workers.dev/api/video/tts/result?id='+job.id),{CREW_AUTH_DB:db});
 assert.equal(r.status,404);
 assert.throws(()=>parseWaveAudio('bm90IGEgV0FWIGZpbGU='));
});
test('daily budget only permits three unique TTS jobs',async()=>{
 const db=fakeDB(),env={CREW_VIDEO_TTS_ENABLED:'1',CREW_AUTH_DB:db};
 const b64=pcmWav(1).toString('base64');let count=0;
 const requestFetch=async url=>String(url).startsWith('https://raw.githubusercontent.com/')
  ?Response.json({version:1,jobs:Array.from({length:5},(_,i)=>({...job,id:'crew-tts-demo-request-'+i+'-abcde'}))})
  :(count++,Response.json({steps:[{type:'model_output',content:[{type:'audio',data:b64}]}]}));
 for(let i=0;i<5;i++)await pollVideoTtsQueue(env,{requestFetch,pickKey:()=> 'key',now});
 assert.equal(count,3);
});