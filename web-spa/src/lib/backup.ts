import {ensureStoryServices} from "./runtime";

const BACKUP_VERSION=1;
// Never export credentials, API keys, authorization state or transient Live context.
export function isBackupKey(key:string){
 if(/key|token|secret|password|auth|verified|live_context/i.test(key))return false;
 return /^(crew_history_|crew_live_last_|crew_teacher_|crew_vocab_|crew_story_|crew_fortune_)/.test(key);
}
export type CrewBackup={
 format:"crew-web-backup";
 version:number;
 exportedAt:string;
 entries:Record<string,string>;
 stories:Array<Record<string,unknown>>;
};
export async function buildBackup():Promise<CrewBackup>{
 const entries:Record<string,string>={};
 for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i);
  if(k&&isBackupKey(k)){const value=localStorage.getItem(k);if(value!==null)entries[k]=value}
 }
 await ensureStoryServices();
 const stories=await window.CrewStoryStore!.list() as unknown as Array<Record<string,unknown>>;
 return {format:"crew-web-backup",version:BACKUP_VERSION,exportedAt:new Date().toISOString(),entries,stories};
}
export async function downloadBackup(){
 const backup=await buildBackup();
 const blob=new Blob([JSON.stringify(backup)],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const anchor=document.createElement("a");
 anchor.href=url;
 anchor.download="crew-web-backup-"+new Date().toISOString().slice(0,10)+".json";
 document.body.appendChild(anchor);
 anchor.click();anchor.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 return {keys:Object.keys(backup.entries).length,stories:backup.stories.length};
}
export async function importBackup(file:File){
 // Safety: make imports additive. Existing data and Gemini credentials are never replaced.
 if(file.size>60*1024*1024)throw new Error("備份檔案過大（上限 60 MB）。");
 let data:unknown;
 try{data=JSON.parse(await file.text())}catch{throw new Error("無法讀取備份 JSON。")}
 if(!data||typeof data!=="object")throw new Error("備份格式不正確。");
 const backup=data as Partial<CrewBackup>;
 if(backup.format!=="crew-web-backup"||backup.version!==BACKUP_VERSION||!backup.entries||typeof backup.entries!=="object"||Array.isArray(backup.entries)||!Array.isArray(backup.stories))throw new Error("不支援這份備份格式。");
 const entries=Object.entries(backup.entries);
 if(entries.length>1000||backup.stories.length>200)throw new Error("備份紀錄超出支援上限。");
 // Validate before touching local data; do not import unsupported settings.
 for(const [key,value] of entries){
  if(key.length>180||typeof value!=="string"||value.length>10_000_000)throw new Error("備份內容不正確。");
 }
 for(const story of backup.stories){
  if(!story||typeof story!=="object"||typeof story.id!=="string"||!story.id||story.id.length>200||!Array.isArray(story.pages)||story.pages.length>1000)throw new Error("故事資料格式不正確。");
 }
 await ensureStoryServices();
 const previousLastBook=localStorage.getItem("crew_story_last_book_id");
 let restored=0,stories=0,skipped=0;
 // Restore books first. Browser quota errors stop import and keep existing data intact.
 for(const story of backup.stories){
  if(await window.CrewStoryStore!.get(story.id as string)){skipped++;continue}
  await window.CrewStoryStore!.save({...story,id:story.id as string} as any);
  stories++;
 }
 if(!previousLastBook&&typeof backup.entries.crew_story_last_book_id==="string"){
  const savedLast=backup.entries.crew_story_last_book_id;
  if(await window.CrewStoryStore!.get(savedLast))localStorage.setItem("crew_story_last_book_id",savedLast);
 }
 for(const [key,value] of entries){
  if(!isBackupKey(key)){skipped++;continue}
  if(localStorage.getItem(key)!==null){skipped++;continue}
  localStorage.setItem(key,value);restored++;
 }
 return {entries:restored,stories,skipped};
}
