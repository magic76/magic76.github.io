import type{FortuneMode}from"./types";

export type YearHighlight={year:number;label:string;summary:string;evidence:string};
type ScoredHighlight=YearHighlight&{score:number};

function currentYear(){return new Date().getFullYear()}
function top(items:ScoredHighlight[],count=4){return items.sort((a,b)=>b.score-a.score||a.year-b.year).slice(0,count)}
export function buildYearHighlights(mode:FortuneMode,result:any):YearHighlight[]{
 const now=currentYear();
 if(mode==="bazi"){
  const wealth=new Set((result.wealthProfile?.annualSignalYears||[]).map((x:any)=>Number(typeof x==="object"?x.year:x)));
  const career=new Set((result.careerProfile?.annualSignalYears||[]).map((x:any)=>Number(typeof x==="object"?x.year:x)));
  const relation=new Set((result.relationshipProfile?.annualSignalYears||[]).map((x:any)=>Number(typeof x==="object"?x.year:x)));
  const candidates:ScoredHighlight[]=(result.annualTimeline||[]).filter((x:any)=>Number(x.year)>=now).map((x:any)=>{
   const y=Number(x.year),tags:string[]=[];let score=0;
   if(wealth.has(y)){score+=3;tags.push("財務")}
   if(career.has(y)){score+=3;tags.push("工作")}
   if(relation.has(y)){score+=3;tags.push("感情")}
   if((x.natalInteractions||[]).length){score+=2;tags.push("合沖")}
   if(y===now)score+=1;
   return{year:y,score,label:tags.length?tags.join(" · "):(x.themes||[]).join(" · ")||"流年",summary:x.plainSummary||"",evidence:[x.ganZhi,x.stemTenGod,x.luckPillar&&"大運 "+x.luckPillar].filter(Boolean).join(" · ")};
  });
  return top(candidates).map(({year,label,summary,evidence})=>({year,label,summary,evidence}));
 }
 if(mode==="tarot"){
  const priority=(n:number)=>[1,5,8,9].includes(n)?5:[6,7].includes(n)?4:3;
  const candidates:ScoredHighlight[]=(result.personalYearTimeline||[]).filter((x:any)=>Number(x.year)>=now).map((x:any)=>{
   const n=Number(x.personalYear),year=Number(x.year);
   return{year,score:priority(n)+(year===now?1:0),label:"流年 "+n+(x.cardName?" · "+x.cardName:""),summary:x.plainSummary||"",evidence:x.keywords||""};
  });
  return top(candidates).map(({year,label,summary,evidence})=>({year,label,summary,evidence}));
 }
 const candidates:ScoredHighlight[]=[];
 for(const x of result.majorTransitTimeline||[]){
  const year=Number(String(x.date||"").slice(0,4));if(!year||year<now)continue;
  const planet=String(x.planet||"");
  const score=(planet==="Jupiter"||planet==="Saturn"?5:4)+(year===now?1:0);
  candidates.push({year,score,label:planet+" 換座",summary:(x.fromSign||"")+" → "+(x.toSign||""),evidence:"本命宮位 H"+(x.fromHouse||"?")+" → H"+(x.toHouse||"?")});
 }
 for(const x of result.mahadashaTimeline||[]){
  const year=Number(String(x.startDate||"").slice(0,4));if(!year||year<now)continue;
  candidates.push({year,score:5,label:"Mahadasha · "+x.lord,summary:(x.startDate||"")+"–"+(x.endDate||""),evidence:"Vimshottari 主週期切換"});
 }
 const seen=new Set<string>();return top(candidates,6).filter(x=>{const k=x.year+"|"+x.label;if(seen.has(k))return false;seen.add(k);return true}).slice(0,4).map(({year,label,summary,evidence})=>({year,label,summary,evidence}));
}
