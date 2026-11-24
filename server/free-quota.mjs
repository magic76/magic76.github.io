/** Shared free-service policy; no provider keys or personal data stored here. */
export const GUEST_TEXT_LIMIT=12, MEMBER_TEXT_LIMIT=50, GUEST_VOICE_LIMIT=1;
export const DEFAULT_TEXT_CAP=1500, DEFAULT_VOICE_CAP=100;
export const quotaV2=env=>env.GUEST_DAILY_QUOTAS_V2==="1";
export const freeQuotaDay=(now=Date.now())=>new Date(now+8*3600000).toISOString().slice(0,10);
const initialized=new WeakMap();
export async function ensureFreeQuotaTables(db){
 if(!db?.prepare)throw Error("Quota DB unavailable");
 if(!initialized.has(db)){
  const task=(async()=>{
   await db.prepare("CREATE TABLE IF NOT EXISTS crew_free_quota_policy (id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),text_cap INTEGER NOT NULL CHECK(text_cap BETWEEN 1 AND 10000),voice_cap INTEGER NOT NULL CHECK(voice_cap BETWEEN 1 AND 1000),updated_at INTEGER NOT NULL)").run();
   await db.prepare("INSERT OR IGNORE INTO crew_free_quota_policy (id,enabled,text_cap,voice_cap,updated_at) VALUES (1,1,1500,100,0)").run();
   await db.prepare("CREATE TABLE IF NOT EXISTS crew_guest_voice_daily (day TEXT PRIMARY KEY,used INTEGER NOT NULL DEFAULT 0)").run();
   await db.prepare("CREATE TABLE IF NOT EXISTS crew_guest_voice_usage (visitor_hash TEXT NOT NULL,day TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(visitor_hash,day))").run();
  })();
  initialized.set(db,task);
  task.catch(()=>{if(initialized.get(db)===task)initialized.delete(db)});
 }
 await initialized.get(db);
}
export async function readFreeQuotaPolicy(env){
 const db=env.CREW_AUTH_DB;
 await ensureFreeQuotaTables(db);
 const row=await db.prepare("SELECT enabled,text_cap,voice_cap FROM crew_free_quota_policy WHERE id=1").first();
 if(!row||![0,1].includes(row.enabled)||!Number.isInteger(row.text_cap)||row.text_cap<1||row.text_cap>10000||!Number.isInteger(row.voice_cap)||row.voice_cap<1||row.voice_cap>1000)throw Error("Invalid quota policy");
 return {enabled:row.enabled===1,textCap:row.text_cap,voiceCap:row.voice_cap};
}
export async function reserveVoiceCapacity(db,day,cap){
 await db.prepare("INSERT OR IGNORE INTO crew_guest_voice_daily (day,used) VALUES (?,0)").bind(day).run();
 const result=await db.prepare("UPDATE crew_guest_voice_daily SET used=used+1 WHERE day=? AND used<?").bind(day,cap).run();
 return result.meta?.changes===1;
}
export async function releaseVoiceCapacity(db,day){
 await db.prepare("UPDATE crew_guest_voice_daily SET used=MAX(0,used-1) WHERE day=?").bind(day).run();
}
export async function reserveGuestVoice(db,visitor,day){
 await db.prepare("INSERT OR IGNORE INTO crew_guest_voice_usage (visitor_hash,day,used) VALUES (?,?,0)").bind(visitor,day).run();
 const result=await db.prepare("UPDATE crew_guest_voice_usage SET used=used+1 WHERE visitor_hash=? AND day=? AND used<?").bind(visitor,day,GUEST_VOICE_LIMIT).run();
 return result.meta?.changes===1;
}
export async function releaseGuestVoice(db,visitor,day){
 await db.prepare("UPDATE crew_guest_voice_usage SET used=MAX(0,used-1) WHERE visitor_hash=? AND day=?").bind(visitor,day).run();
}
export const memberTextQuotaKey=uid=>"member:"+uid;
