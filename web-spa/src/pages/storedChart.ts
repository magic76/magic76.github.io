// Keep this inexpensive local-only check in sync with the daily card.
export function hasStoredChart():boolean{
 for(const key of ["crew_fortune_profile_v2","crew_fortune_presets_v1","crew_fortune_readings_v2"]){
  try{
   const value=localStorage.getItem(key);
   if(!value)continue;
   const parsed=JSON.parse(value);
   if(key==="crew_fortune_profile_v2"&&typeof parsed?.birthDate==="string")return true;
   if(Array.isArray(parsed)&&parsed.some(x=>typeof x?.profile?.birthDate==="string"))return true;
  }catch{/* A corrupt record must not conceal the other saved charts. */}
 }
 return false;
}
