import {dailyProfileHash} from "./dailyCard";

/** A saved BaZi result is enough for the daily theme; the home needs no calculator. */
export function readSavedBaziResult(hash:string):unknown|null{
 if(!/^[a-f0-9]{64}$/.test(hash))return null;
 try{
  const raw=localStorage.getItem("crew_fortune_readings_v2");
  const readings=raw?JSON.parse(raw):null;
  if(!Array.isArray(readings))return null;
  for(const reading of readings){
   if(reading?.mode!=="bazi"||!reading.profile?.birthDate||!reading.profile?.birthTime)continue;
   if(dailyProfileHash(reading.profile)!==hash)continue;
   const result=reading.result;
   const master=result?.dayMaster||result?.dayPillar?.charAt?.(0);
   if(typeof master==="string"&&"甲乙丙丁戊己庚辛壬癸".includes(master)&&
      typeof result?.dayPillar==="string"&&typeof result?.yearPillar==="string")return result;
  }
 }catch{/* damaged or inaccessible device storage */}
 return null;
}
