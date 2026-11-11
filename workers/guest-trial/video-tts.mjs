/** Crew Video TTS: owner-controlled GitHub queue, shared secret Gemini keypool.
 * No public endpoint can supply arbitrary TTS text or Gemini credentials.
 * The queue lives on the protected main branch of magic76/crew-social-agent.
 * This module is disabled unless CREW_VIDEO_TTS_ENABLED=1 and the D1 migration exists.
 */
const QUEUE_URL='https://raw.githubusercontent.com/magic76/crew-social-agent/main/content/video-tts/requests/index.json';
const MODEL='gemini-3.8-flash-tts';
const JOB_ID=/^crew-tts-[a-z0-9-]{8,60}$/;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_MAX_JOBS_PER_DAY=20;
const maxJobsPerDay=env=>{
 const raw=env?.CREW_VIDEO_TTS_MAX_JOBS_PER_DAY;
 // Worker vars are strings; only a whole decimal number in 1–50 is valid.
 if(typeof raw!=='string'&&typeof raw!=='number')return DEFAULT_MAX_JOBS_PER_DAY;
 if(!/^\d+$/.test(String(raw)))return DEFAULT_MAX_JOBS_PER_DAY;
 const limit=Number(raw);
 return Number.isSafeInteger(limit)&&limit>=1&&limit<=50?limit:DEFAULT_MAX_JOBS_PER_DAY;
};
const MAX_AUDIO_BYTES=1_600_000; // Cloudflare D1 row limit: 2MB
const keepDays=7;
const SAFE_TTS_FAILURES=new Set([
 'bad_audio_payload','audio_too_large','bad_audio_format','bad_wav_chunk',
 'bad_pcm_format','bad_wav_length','upstream_response_too_large',
 'invalid_upstream_response','upstream_audio_missing','missing_key_selector'
]);
// Public endpoint exposes only fixed diagnostic codes, never raw provider errors, tokens or stack traces.
function publicTtsFailureCode(raw){
 const code=typeof raw==='string'?raw:'';
 if(SAFE_TTS_FAILURES.has(code)||/^upstream_[45][0-9]{2}$/.test(code))return code;
 if(/timeout|timed out/i.test(code))return 'upstream_timeout';
 return 'internal_error';
}
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const enabled=env=>env?.CREW_VIDEO_TTS_ENABLED!=='0'&&env?.CREW_AUTH_DB;
const today=date=>new Date(date).toISOString().slice(0,10);

export function validVideoJob(job, now=Date.now()){
 if(!job||typeof job!=='object'||Array.isArray(job))return false;
 if(!JOB_ID.test(job.id||'')||!DAY.test(job.day||''))return false;
 if(![today(now),today(now-86400000)].includes(job.day))return false;
 if(typeof job.text!=='string'||job.text.length<10||job.text.length>300)return false;
 if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(job.text))return false;
 return job.voice===undefined||job.voice==='Kore'; // fixed voice, no user-controlled model
}
export function parseWaveAudio(base64){
 // Check the base64 shape before reporting size: malformed data is not evidence
 // that a recording merely needs to be split into shorter segments.
 if(typeof base64!=='string'||base64.length<128||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)||base64.length%4===1||(base64.endsWith('=')&&base64.length%4!==0))throw Error('bad_audio_payload');
 if(base64.length>4*Math.ceil(MAX_AUDIO_BYTES/3))throw Error('audio_too_large');
 let decoded;try{decoded=atob(base64)}catch{throw Error('bad_audio_payload')}
 const bytes=Uint8Array.from(decoded,char=>char.charCodeAt(0));
 if(bytes.length>MAX_AUDIO_BYTES)throw Error('audio_too_large');
 if(bytes.length<1000)throw Error('bad_audio_payload');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const fourcc=p=>String.fromCharCode(...bytes.subarray(p,p+4));
 if(fourcc(0)!=='RIFF'||fourcc(8)!=='WAVE')throw Error('bad_audio_format');
 let pos=12,byteRate=0,audioBytes=0;
 while(pos+8<=bytes.length){
  const tag=fourcc(pos),len=view.getUint32(pos+4,true);
  if(pos+8+len>bytes.length)throw Error('bad_wav_chunk');
  if(tag==='fmt '){
   if(len<16||view.getUint16(pos+8,true)!==1||view.getUint16(pos+10,true)!==1||view.getUint16(pos+22,true)!==16)throw Error('bad_pcm_format');
   byteRate=view.getUint32(pos+16,true);
  }
  if(tag==='data')audioBytes=len;
  pos+=8+len+(len%2);
 }
 if(!byteRate||!audioBytes||audioBytes>bytes.length||audioBytes/byteRate>31)throw Error('bad_wav_length');
 return {bytes,seconds:Math.round(audioBytes/byteRate*1000)/1000};
}

export async function synthesizeVideoNarration(env, text, voice='Kore', requestFetch=fetch, pickKey){
 if(typeof pickKey!=='function')throw Error('missing_key_selector');
 const key=pickKey(env);
 const request={model:MODEL,input:[{type:'user_input',content:[{type:'text',text,annotations:[{type:'speech_metadata',style:'Natural Taiwan Mandarin (zh-TW); calm, warm, conversational explanation; consistent one-take flow, subtle pauses, clear articulation. Do not add or omit words.'}]}]}],response_format:{type:'audio'},generation_config:{speech_config:[{voice}]}};
 const upstream=await requestFetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
  method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},
  body:JSON.stringify(request),signal:AbortSignal.timeout(90000)
 });
 if(!upstream.ok)throw Error('upstream_'+upstream.status);
 // Keep response bounded before JSON parsing (encoded WAV ~2.2MB max).
 const raw=await upstream.text();
 if(raw.length>2_400_000)throw Error('upstream_response_too_large');
 let result;try{result=JSON.parse(raw)}catch{throw Error('invalid_upstream_response')}
 const blocks=[];
 for(const step of result.steps||[])if(step.type==='model_output')for(const item of step.content||[])if(item.type==='audio'&&typeof item.data==='string')blocks.push(item.data);
 if(!blocks.length)throw Error('upstream_audio_missing');
 return parseWaveAudio(blocks.at(-1));
}

export async function pollVideoTtsQueue(env,{requestFetch=fetch,now=Date.now(),pickKey}={}){
 if(!enabled(env))return {status:'disabled'};
 const db=env.CREW_AUTH_DB;
 const response=await requestFetch(QUEUE_URL+'?v='+Math.floor(now/300000),{headers:{'accept':'application/json'},signal:AbortSignal.timeout(8000)});
 if(!response.ok)return {status:'queue_unavailable'};
 const raw=await response.text();
 if(raw.length>32000)return {status:'queue_too_large'};
 let input;try{input=JSON.parse(raw)}catch{return {status:'invalid_queue'}}
 if(input?.version!==1||!Array.isArray(input.jobs)||input.jobs.length>20)return {status:'invalid_queue'};
 // A main-branch commit with enabled:true is the owner's explicit spend authorization.
 if(input.enabled!==true||!input.jobs.some(job=>validVideoJob(job,now)))return {status:'idle'};
 // Create this isolated table only on the first authorized job. Existing guest data is untouched.
 await db.prepare("CREATE TABLE IF NOT EXISTS crew_video_tts_jobs (id TEXT PRIMARY KEY, created_day TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('processing','ready','failed')), seconds REAL, wav BLOB, error TEXT)").run();
 await db.prepare('CREATE INDEX IF NOT EXISTS crew_video_tts_jobs_created ON crew_video_tts_jobs (created_at)').run();
 await db.prepare('CREATE INDEX IF NOT EXISTS crew_video_tts_jobs_daily ON crew_video_tts_jobs (created_day)').run();
 await db.prepare('DELETE FROM crew_video_tts_jobs WHERE created_at < ?').bind(now-keepDays*86400000).run();
 // Only bounded jobs from the owner's protected public main branch are trusted.
 for(const job of input.jobs){
  if(!validVideoJob(job,now))continue;
  const reservation=await db.prepare("INSERT OR IGNORE INTO crew_video_tts_jobs (id,created_day,created_at,status) SELECT ?,?,?,'processing' WHERE (SELECT COUNT(*) FROM crew_video_tts_jobs WHERE created_day=?)<?")
   .bind(job.id,today(now),now,today(now),maxJobsPerDay(env)).run();
  if(reservation.meta?.changes!==1)continue;
  try{
   const {bytes,seconds}=await synthesizeVideoNarration(env,job.text,job.voice||'Kore',requestFetch,pickKey);
   await db.prepare("UPDATE crew_video_tts_jobs SET status='ready',wav=?,seconds=? WHERE id=? AND status='processing'")
    .bind(bytes,seconds,job.id).run();
   return {status:'ready',jobId:job.id,seconds};
  }catch(error){
   // Failure is terminal by design; no unbounded retries or quota amplification.
   try{await db.prepare("UPDATE crew_video_tts_jobs SET status='failed',error=? WHERE id=? AND status='processing'")
    .bind(String(error.message||'error').slice(0,40),job.id).run()}catch{}
   return {status:'failed',jobId:job.id};
  }
 }
 return {status:'idle'};
}

export async function videoTtsResult(request,env){
 if(!enabled(env))return reply({error:'Not found'},404);
 const url=new URL(request.url),id=url.searchParams.get('id')||'';
 if(!JOB_ID.test(id))return reply({error:'Invalid job ID'},400);
 let row;
 try{row=await env.CREW_AUTH_DB.prepare('SELECT status,seconds,wav,error FROM crew_video_tts_jobs WHERE id=?').bind(id).first()}
 catch{return reply({error:'Video TTS unavailable'},503)}
 if(!row)return reply({error:'Not found'},404);
 if(row.status==='failed')return reply({status:'failed',error_code:publicTtsFailureCode(row.error)},202);
 if(row.status!=='ready')return reply({status:row.status},202);
 if(!Array.isArray(row.wav)||row.wav.length<1000||row.wav.length>MAX_AUDIO_BYTES)return reply({error:'Audio unavailable'},503);
 return new Response(new Uint8Array(row.wav),{headers:{'content-type':'audio/wav','content-disposition':'attachment; filename="'+id+'.wav"','cache-control':'no-store','x-content-type-options':'nosniff','x-crew-tts-seconds':String(row.seconds)}});
}