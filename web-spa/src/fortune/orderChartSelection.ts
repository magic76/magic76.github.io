import type {FortuneProfile} from "./types";

export type OrderChartReading={id:string;mode:string;createdAt?:string;profile?:Partial<FortuneProfile>;result?:Record<string,any>};

// A chart is not a reading event. Only group complete matching birth conditions;
// never infer identity from the four pillars or a missing legacy profile.
function identity(row:OrderChartReading):string{
 const p=row.profile;
 if(!p||typeof p.birthDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)||
  typeof p.birthTime!=="string"||!/^\d{2}:\d{2}$/.test(p.birthTime)||
  typeof p.gender!=="string"||!p.gender.trim())return JSON.stringify(["reading",row.id]);
 return JSON.stringify(["birth",p.birthDate,p.birthTime,p.gender,...[p.city,p.latitude,p.longitude,p.utcOffset,p.timeZoneId].map(v=>typeof v==="string"?v.trim():"")]);
}

export function readOrderChartRecords(raw:unknown):OrderChartReading[]{
 if(!Array.isArray(raw))return [];
 return raw.filter((x:unknown):x is OrderChartReading=>{
  if(!x||typeof x!=="object"||Array.isArray(x))return false;
  const row=x as OrderChartReading;
  return row.mode==="bazi"&&typeof row.id==="string"&&!!row.id&&!!row.result&&typeof row.result==="object"&&!Array.isArray(row.result);
 });
}

// History is stored newest-first. Preserve explicitly linked older readings
// as the representative so the selected order snapshot does not silently change.
export function selectOrderCharts(records:OrderChartReading[],requestedId:string|null,limit=20):OrderChartReading[]{
 const groups=new Map<string,OrderChartReading>();
 for(const row of records){
  const key=identity(row);
  if(!groups.has(key)||row.id===requestedId)groups.set(key,row);
 }
 const all=[...groups.values()], visible=all.slice(0,limit);
 const requested=all.find(x=>x.id===requestedId);
 if(requested&&!visible.some(x=>x.id===requestedId))visible.push(requested);
 return visible;
}
