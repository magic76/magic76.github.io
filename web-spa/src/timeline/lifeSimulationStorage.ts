import {isLifeRun,type LifeRun} from "./lifeSimulation";

// Separate, opt-in game state. No existing Timeline keepsakes, transcripts or friend memory is copied.
const DB_NAME="crew-life-simulator-v1";
const STORE="runs";
type StoredRun={key:string;value:LifeRun};
function openDatabase():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==="undefined"){reject(new Error("Storage unavailable"));return;}
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:"key"});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error("Storage unavailable"));
  request.onblocked=()=>reject(new Error("Storage blocked"));
 });
}
async function transaction<T>(mode:IDBTransactionMode,fn:(store:IDBObjectStore,done:(value:T)=>void)=>void):Promise<T>{
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  let settled=false;
  const stop=(reason:unknown)=>{if(!settled){settled=true;reject(reason);}db.close();};
  try{
   const tx=db.transaction(STORE,mode);
   let value:T;
   tx.oncomplete=()=>{db.close();if(!settled){settled=true;resolve(value);}};
   tx.onerror=()=>stop(tx.error||new Error("Save failed"));
   tx.onabort=()=>stop(tx.error||new Error("Save cancelled"));
   fn(tx.objectStore(STORE),v=>{value=v});
  }catch(error){stop(error);}
 });
}
export async function loadLifeRun():Promise<LifeRun|null>{
 const saved=await transaction<unknown>("readonly",(store,done)=>{
  const request=store.get("active");
  request.onsuccess=()=>done((request.result as StoredRun|undefined)?.value??null);
 });
 return isLifeRun(saved)?saved:null;
}
export function saveLifeRun(run:LifeRun):Promise<void>{
 if(!isLifeRun(run))return Promise.reject(new Error("Invalid game state"));
 return transaction<void>("readwrite",(store,done)=>{
  const request=store.put({key:"active",value:run});
  request.onsuccess=()=>done(undefined);
 });
}
export function clearLifeRun():Promise<void>{
 return transaction<void>("readwrite",(store,done)=>{
  const request=store.delete("active");request.onsuccess=()=>done(undefined);
 });
}
