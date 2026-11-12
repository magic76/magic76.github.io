import {observerValidRun,type ObserverRun} from "./lifeObservatory";

/** Separate from Life Lab V1/V2 IndexedDB. One local save and one comparison slot. */
const KEY="crew-life-observatory-v3";
export type ObserverSave={version:1;current:ObserverRun;previous:ObserverRun|null};
export function loadObserverSave():ObserverSave|null{
 try{
  const raw=localStorage.getItem(KEY);
  if(!raw)return null;
  const value:unknown=JSON.parse(raw);
  if(!value||typeof value!=="object")return null;
  const saved=value as Partial<ObserverSave>;
  if(saved.version!==1||!observerValidRun(saved.current)||!(saved.previous===null||observerValidRun(saved.previous)))return null;
  if(saved.previous&&(saved.previous.seed!==saved.current.seed||saved.previous.phase!=="end"))return null;
  return saved as ObserverSave;
 }catch{return null}
}
export function writeObserverSave(save:ObserverSave):boolean{
 if(!observerValidRun(save.current)||save.previous!==null&&(!observerValidRun(save.previous)||save.previous.seed!==save.current.seed||save.previous.phase!=="end"))return false;
 try{localStorage.setItem(KEY,JSON.stringify(save));return true;}catch{return false}
}
export function removeObserverSave():boolean{
 try{localStorage.removeItem(KEY);return true;}catch{return false}
}
