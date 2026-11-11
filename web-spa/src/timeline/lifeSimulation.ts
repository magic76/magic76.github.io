import {LIFE_EVENTS,type LifeEvent,type LifeTrait} from "./lifeEvents";
import {LIFE_ARC_EVENTS,characterArcEvent} from "./lifeArcs";
import {immediateLifeConsequence} from "./lifeConsequences";
import {lifeArcConsequence} from "./lifeArcConsequences";
import type {TimelineCharacterId} from "./timelineCharacters";

export const LIFE_AGES=[7,10,13,16,19,22,25,35,40,50,55,70] as const;
export type Traits=Record<LifeTrait,number>;
export type LifeDecision={age:number;eventId:string;choice:0|1|2;labelZh:string;labelEn:string;delta:Traits;after:Traits};
export type LifeRun={version:1;ruleset?:2;character:TimelineCharacterId;seed:number;step:number;phase:"event"|"result"|"end";traits:Traits;history:LifeDecision[];createdAt:number};
export const ALL_LIFE_EVENTS:LifeEvent[]=[...LIFE_EVENTS,...LIFE_ARC_EVENTS];
const ARC_AGES=[16,25,40,70] as const;
export function lifeEventTitleById(id:string,english:boolean):string{
 const value=ALL_LIFE_EVENTS.find(event=>event.id===id);return value?(english?value.title.en:value.title.zh):id;
}
const TRAITS:LifeTrait[]=["courage","trust","ambition","empathy"];
const START:Record<TimelineCharacterId,Traits>={
 mira:{courage:53,trust:60,ambition:64,empathy:65},
 ethan:{courage:42,trust:58,ambition:72,empathy:59},
 hana:{courage:61,trust:55,ambition:62,empathy:70}
};
const validCharacter=(value:unknown):value is TimelineCharacterId=>value==="mira"||value==="ethan"||value==="hana";
const clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value)));
const hash=(value:string):number=>{
 let h=2166136261;
 for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
 return h>>>0;
};
export function newLifeRun(character:TimelineCharacterId,seed:number):LifeRun{
 if(!validCharacter(character)||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new Error("Invalid simulator start");
 return {version:1,ruleset:2,character,seed,step:0,phase:"event",traits:{...START[character]},history:[],createdAt:Date.now()};
}
export function lifeEventFor(run:LifeRun):LifeEvent{
 if(run.phase==="end"||run.step<0||run.step>=LIFE_AGES.length)throw new Error("No pending event");
 const age=LIFE_AGES[run.step];
 if(run.phase==="result"){
  const last=run.history.at(-1);
  const result=ALL_LIFE_EVENTS.find(e=>e.id===last?.eventId&&e.age===age);
  if(!result)throw new Error("Missing resolved event");
  return result;
 }
 if(run.ruleset===2&&ARC_AGES.some(a=>a===age)){
  const previousAge=age===25?16:age===40?25:age===70?40:null;
  const previous=previousAge===null?undefined:run.history.find(d=>d.age===previousAge);
  const branch=previous?.choice===0||(previous?.choice===2&&previous.after.courage>=60)?"bold":"steady";
  return characterArcEvent(run.character,age as 16|25|40|70,branch);
 }
 const pool=LIFE_EVENTS.filter(e=>e.age===age);
 if(!pool.length)throw new Error("No events for age "+age);
 const weights=pool.map(e=>1+Math.max(0,Math.floor((run.traits[e.trait]-50)/15)));
 const total=weights.reduce((a,b)=>a+b,0);
 // Same seed + life state + stage always generates the same event.
 const state=TRAITS.map(k=>run.traits[k]).join(":");
 let target=hash(run.seed+":"+run.character+":"+age+":"+state)%total;
 for(let i=0;i<pool.length;i++){target-=weights[i];if(target<0)return pool[i];}
 return pool[pool.length-1];
}
export function chooseLifeEvent(run:LifeRun,choice:0|1|2):LifeRun{
 if(run.phase!=="event"||![0,1,2].includes(choice))throw new Error("Decision is not available");
 const event=lifeEventFor(run),delta:Traits={courage:0,trust:0,ambition:0,empathy:0};
 if(choice===0){delta[event.trait]+=8;delta.courage+=3;delta.trust-=1;}
 if(choice===1){delta[event.trait]+=3;delta.trust+=4;delta.empathy+=3;delta.ambition-=1;}
 if(choice===2){
  // No intervention still has a small but deterministic effect.
  const coin=hash(run.seed+":"+event.id+":observe")%2;
  delta[event.trait]+=coin===0?2:-2;
  delta.empathy+=1;
 }
 const after={...run.traits};
 for(const trait of TRAITS){after[trait]=clamp(after[trait]+delta[trait]);delta[trait]=after[trait]-run.traits[trait];}
 const [labelZh,labelEn]=[event.choices[choice].zh,event.choices[choice].en];
 return {...run,phase:"result",traits:after,history:[...run.history,{age:event.age,eventId:event.id,choice,labelZh,labelEn,delta,after}]};
}
export function advanceLife(run:LifeRun):LifeRun{
 if(run.phase!=="result")throw new Error("Resolve event before advancing");
 if(run.step===LIFE_AGES.length-1)return {...run,phase:"end"};
 return {...run,step:run.step+1,phase:"event"};
}
export function lifeOutcome(run:LifeRun,english=false):string{
 const last=run.history.at(-1);
 if(!last)return "";
 const consequence=immediateLifeConsequence(last.eventId,last.choice,english)||lifeArcConsequence(last.eventId,last.choice,english);
 const changed=TRAITS.filter(k=>last.delta[k]!==0).map(k=>{
  const label=english?({courage:"Courage",trust:"Trust",ambition:"Ambition",empathy:"Empathy"} as Record<LifeTrait,string>)[k]:({courage:"勇氣",trust:"信任",ambition:"野心",empathy:"同理心"} as Record<LifeTrait,string>)[k];
  return label+" "+(last.delta[k]>0?"+":"")+last.delta[k];
 }).join(" · ");
 return consequence+"\n"+(english?"Personality: ":"人格變化：")+changed;
}
export function isLifeRun(v:unknown):v is LifeRun{
 if(!v||typeof v!=="object")return false;
 const r=v as Partial<LifeRun>;
 if(r.ruleset!==undefined&&r.ruleset!==2)return false;
 if(r.version!==1||!validCharacter(r.character)||!Number.isSafeInteger(r.seed)||Number(r.seed)<0||Number(r.seed)>0xffffffff)return false;
 if(!Number.isInteger(r.step)||Number(r.step)<0||Number(r.step)>=LIFE_AGES.length||!["event","result","end"].includes(r.phase||""))return false;
 if(!r.traits||!TRAITS.every(k=>Number.isFinite(r.traits?.[k])&&Number(r.traits?.[k])>=0&&Number(r.traits?.[k])<=100))return false;
 if(!Array.isArray(r.history)||r.history.length>LIFE_AGES.length||!Number.isFinite(r.createdAt))return false;
 if(r.history.length!==Number(r.step)+(r.phase==="event"?0:1))return false;
 if(r.phase==="end"&&r.step!==LIFE_AGES.length-1)return false;
 return r.history.every((h,i)=>h&&h.age===LIFE_AGES[i]&&ALL_LIFE_EVENTS.some(e=>e.age===h.age&&e.id===h.eventId)&&[0,1,2].includes(h.choice)&&
  typeof h.labelZh==="string"&&typeof h.labelEn==="string"&&h.delta&&h.after&&
  TRAITS.every(k=>Number.isFinite(h.delta[k])&&Number.isFinite(h.after[k])&&h.after[k]>=0&&h.after[k]<=100));
}
export function lifeEnding(run:LifeRun,english=false):string{
 const sorted=[...TRAITS].sort((a,b)=>run.traits[b]-run.traits[a]);
 const labels=english?{courage:"courage",trust:"trust",ambition:"ambition",empathy:"empathy"}:{courage:"勇氣",trust:"信任",ambition:"野心",empathy:"同理心"};
 const high=labels[sorted[0]],low=labels[sorted[sorted.length-1]];
 const name=run.character==="mira"?"Mira":run.character==="ethan"?"Ethan":"Hana";
 return english?
  `${name} reaches seventy with ${high} as a defining strength. ${low} remains something to work on. The story is shaped by ${run.history.length} choices and events, not by a single score.`:
  `${name} 走到 70 歲，最鮮明的特質是${high}，而${low}仍有成長空間。這段人生由 ${run.history.length} 次事件與決定累積而成，並不是單一分數決定的結局。`;
}

/** Fork a completed (or partially played) life from a decision, preserving the same seed and everything before it. */
export function forkLifeRun(original:LifeRun,forkAge:number):LifeRun{
 const index=LIFE_AGES.indexOf(forkAge as typeof LIFE_AGES[number]);
 if(index<0||index>=original.history.length)throw new Error("Choose a completed age to fork");
 let next=newLifeRun(original.character,original.seed);
 // Legacy V1 games still use their original, non-arc event catalog.
 if(original.ruleset!==2)next={...next,ruleset:undefined};
 for(let i=0;i<index;i++){
  const old=original.history[i],event=lifeEventFor(next);
  if(!old||event.id!==old.eventId)throw new Error("Cannot replay a changed or corrupted past");
  next=advanceLife(chooseLifeEvent(next,old.choice));
 }
 return next;
}
