import {cafeWorldValid,catchUpCafeWorld,type CafeWorld} from "./lifeCafeEngine";

// A distinct namespace: neither canonical Timeline memories nor previous life
// observatory games are modified, even when this prototype is reset.
const CAFE_KEY="crew-life-cafe-v1";
export function loadCafeWorld(now=Date.now()):CafeWorld|null{
 try{
  const value:unknown=JSON.parse(localStorage.getItem(CAFE_KEY)||"null");
  if(!cafeWorldValid(value))return null;
  const prior=value as CafeWorld;
  const next=catchUpCafeWorld(prior,now);
  if(next!==prior)saveCafeWorld(next);
  return next;
 }catch{return null}
}
export function saveCafeWorld(world:CafeWorld):boolean{
 if(!cafeWorldValid(world))return false;
 try{localStorage.setItem(CAFE_KEY,JSON.stringify(world));return true}catch{return false}
}
export function clearCafeWorld():boolean{
 try{localStorage.removeItem(CAFE_KEY);return true}catch{return false}
}
