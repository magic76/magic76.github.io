import type{FortuneMode}from"./types";

export type YearHighlight={year:number;label:string;summary:string;evidence:string};
type ScoredHighlight=YearHighlight&{score:number};

function currentYear(){return new Date().getFullYear()}
function top(items:ScoredHighlight[],count=4){return items.sort((a,b)=>b.score-a.score||a.year-b.year).slice(0,count)}

const BA_ZI_FOCUS:Record<string,{group:string;name:string}>={
 "正財":{group:"wealth",name:"穩定資源與財務"},"偏財":{group:"wealth",name:"機會與資源運用"},
 "正官":{group:"career",name:"工作責任與制度"},"七殺":{group:"career",name:"壓力與重要決策"},
 "正印":{group:"learning",name:"學習與支持"},"偏印":{group:"learning",name:"研究與新思路"},
 "食神":{group:"output",name:"穩定產出與創作"},"傷官":{group:"output",name:"表達與突破"},
 "比肩":{group:"peers",name:"自主與同儕"},"劫財":{group:"peers",name:"合作競爭與分配"}
};
function chooseDistinctYears(items:Array<ScoredHighlight&{group:string}>,count:number):YearHighlight[]{
 const remaining=[...items],selected:Array<ScoredHighlight&{group:string}>=[];
 while(remaining.length&&selected.length<count){
  remaining.sort((a,b)=>{
   const effective=(x:ScoredHighlight&{group:string})=>x.score-selected.filter(y=>y.group===x.group).length*7;
   return effective(b)-effective(a)||b.score-a.score||a.year-b.year;
  });
  selected.push(remaining.shift()!);
 }
 return selected.map(({year,label,summary,evidence})=>({year,label,summary,evidence}));
}

export function buildYearHighlights(mode:FortuneMode,result:any):YearHighlight[]{
 const now=currentYear();
 if(mode==="bazi"){
  const wealth=new Set((result.wealthProfile?.annualSignalYears||[]).map((x:any)=>Number(typeof x==="object"?x.year:x)));
  const career=new Set((result.careerProfile?.annualSignalYears||[]).map((x:any)=>Number(typeof x==="object"?x.year:x)));
  const relation=new Set((result.relationshipProfile?.annualSignalYears||[]).map((x:any)=>Number(typeof x==="object"?x.year:x)));
  const candidates:Array<ScoredHighlight&{group:string}>=(result.annualTimeline||[]).filter((x:any)=>Number(x.year)>=now).map((x:any)=>{
   const year=Number(x.year),god=String(x.stemTenGod||""),focus=BA_ZI_FOCUS[god];
   const interactions=(Array.isArray(x.natalInteractions)?x.natalInteractions:[]).map(String).filter((v:string)=>!v.includes("未偵測"));
   const group=focus?.group||(interactions.length?"interactions":"year");
   const topic=focus?.name||(interactions.length?"命局互動與變化":String((x.themes||[])[0]||"流年節奏"));
   const score=(wealth.has(year)?3:0)+(career.has(year)?3:0)+(relation.has(year)?3:0)+Math.min(4,interactions.length*2)+(year===now?2:0)+(year<=now+3?1:0);
   const basis=focus&&x.stemTenGodMeaning?god+"（"+x.stemTenGodMeaning+"）":god||topic;
   const summary="以「"+basis+"」為主要觀察方向"+
    (interactions.length?"；與本命可核對「"+interactions[0]+"」":"")+
    (x.luckPillar?"，並放在「"+x.luckPillar+"」大運背景下理解":"")+"。";
   const evidence=[x.ganZhi,god&&"流年十神 "+god,x.luckPillar&&"大運 "+x.luckPillar,...interactions.slice(0,2)].filter(Boolean).join(" · ");
   return{year,group,score,label:god?god+" · "+topic:topic,summary,evidence};
  });
  return chooseDistinctYears(candidates,4);
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
