import type {FortuneMode} from "./types";

export type CurrentPhase={
 age:number; nominalAge?:number; current:string; next:string; promptLine:string;
 start?:string; end?:string; remainingYears?:number;
 thisYear?:string; nextYear?:string; transitionYear?:number;
};
const value=(v:unknown)=>v==null?"":String(v);
const asYear=(v:unknown)=>Number(String(v||"").slice(0,4));
export function computeCurrentPhase(mode:FortuneMode,result:any,birthDate:string,today:Date):CurrentPhase{
 const year=today.getFullYear(),month=today.getMonth()+1,day=today.getDate();
 const parts=String(birthDate||"").split("-").map(Number);
 const age=parts.length===3&&parts.every(Number.isFinite)
  ?Math.max(0,year-parts[0]-(month<parts[1]||(month===parts[1]&&day<parts[2])?1:0)):0;
 const r=result||{};
 if(mode==="bazi"){
  const list=Array.isArray(r.luckPillars)?r.luckPillars:[];
  const active=r.currentLuckPillar||list.find((x:any)=>Number(x.startYear)<=year&&Number(x.endYear)>=year)||{};
  const following=list.filter((x:any)=>Number(x.startYear)>year).sort((a:any,b:any)=>a.startYear-b.startYear)[0];
  const annual=Array.isArray(r.annualTimeline)?r.annualTimeline:[];
  const curr=annual.find((x:any)=>Number(x.year)===year);
  const nextY=annual.find((x:any)=>Number(x.year)===year+1);
  const current=value(active.ganZhi),next=value(following?.ganZhi);
  const remainingYears=Number.isFinite(Number(active.endYear))?Math.max(0,Number(active.endYear)-year+1):undefined;
  const nominalAge=Number.isFinite(Number(r.nominalAge))?Number(r.nominalAge):undefined;
  return{age,nominalAge,current,next,start:value(active.startYear),end:value(active.endYear),
   remainingYears,transitionYear:Number(following?.startYear)||undefined,
   thisYear:value(curr?.stemTenGod),nextYear:value(nextY?.stemTenGod),
   promptLine:"實歲 "+age+(nominalAge?"（八字虛歲 "+nominalAge+"）":"")+"；大運 "+current+"（"+value(active.startYear)+"–"+value(active.endYear)+"，剩 "+value(remainingYears)+" 年），下一大運 "+next+"（"+value(following?.startYear)+" 起）；"+year+" 流年十神 "+value(curr?.stemTenGod)+"；"+(year+1)+" 流年十神 "+value(nextY?.stemTenGod)};
 }
 if(mode==="tarot"){
  const timing=Array.isArray(r.pinnacleTiming)?r.pinnacleTiming:[];
  const numbers=Array.isArray(r.pinnacles)?r.pinnacles:[];
  const limits=timing.map((x:any)=>{const str=String(x).replace(/[–—]/g,"-");const m=str.match(/^(\d+)\s*-\s*(\d+)$/);const plus=str.match(/^(\d+)\s*\+$/);return m?{from:+m[1],to:+m[2]}:plus?{from:+plus[1],to:Infinity}:{from:0,to:-1}});
  const index=limits.findIndex((x:{from:number;to:number})=>age>=x.from&&age<=x.to);
  const active=index>=0?index:0;
  const current=value(numbers[active]),next=value(numbers[active+1]);
  const end=limits[active]?.to;
  const transitionYear=Number.isFinite(end)?parts[0]+end+1:undefined;
  const years=Array.isArray(r.personalYearTimeline)?r.personalYearTimeline:[];
  const py=(y:number)=>years.find((x:any)=>Number(x.year)===y);
  const thisYear=value(py(year)?.personalYear??(Number(r.personalYearCalendarYear)===year?r.personalYear:""));
  const nextYear=value(py(year+1)?.personalYear);
  return{age,current,next,transitionYear,thisYear,nextYear,start:timing[active]||"",
   promptLine:"實歲 "+age+"；目前巔峰期 "+value(active+1)+"（"+value(timing[active])+" 歲），巔峰數 "+current+"；下一期 "+next+(transitionYear?"，約 "+transitionYear+" 年切換":"")+"；"+year+" 個人年 "+thisYear+"；"+(year+1)+" 個人年 "+nextYear};
 }
 const md=r.currentMahadasha||{},ad=r.currentAntardasha||{};
 const timeline=Array.isArray(r.mahadashaTimeline)?r.mahadashaTimeline:[];
 const following=timeline.filter((x:any)=>asYear(x.startDate)>=year&&String(x.startDate)>String(md.startDate||"")&&x.lord!==md.lord).sort((a:any,b:any)=>String(a.startDate).localeCompare(String(b.startDate)))[0];
 const current=value(md.lord),next=value(following?.lord);
 return{age,current,next,start:value(md.startDate),end:value(md.endDate),transitionYear:asYear(following?.startDate)||undefined,
  promptLine:"實歲 "+age+"；Mahadasha "+current+"（"+value(md.startDate)+"–"+value(md.endDate)+"）；Antardasha "+value(ad.lord)+"（"+value(ad.startDate)+"–"+value(ad.endDate)+"）；下一 Mahadasha "+next+"（"+value(following?.startDate)+" 起）"};
}
