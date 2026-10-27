import type {ReactNode} from "react";
import{useTranslation}from"react-i18next";
import{formatVedicTerm}from"../fortuneTerminology";
import{useRouteNamespace}from"../../i18n/useRouteNamespace";
import {buildLocalReport} from "../report";
import {formatFortuneValue} from "../displayNumber";
import type {FortuneChapterId} from "../report";
import type {FortuneMode} from "../types";

export function ResultTabs({items,active,onChange}:{items:[string,string][];active:string;onChange:(id:string)=>void}){
 return <div className="fortune-result-tabs" role="tablist" aria-label="命理結果分頁">{items.map(([id,label])=><button type="button" key={id} role="tab" aria-selected={active===id} className={active===id?"active":""} onClick={()=>onChange(id)}>{label}</button>)}</div>;
}
export function Fact({label,children}:{label:string;children:ReactNode}){return <div className="fortune-fact"><small>{label}</small><strong>{typeof children==="number"||typeof children==="string"?formatFortuneValue(children):children}</strong></div>}

function plain(value:unknown):string{
 if(value==null||value==="")return "";
 if(typeof value==="string"||typeof value==="number")return formatFortuneValue(value);
 if(Array.isArray(value))return [...new Set(value.map(plain).filter(Boolean))].join("、");
 if(typeof value==="object"){
  const x=value as Record<string,unknown>;
  const parts=[x.year,x.ganZhi,x.sign,x.house&&"第"+x.house+"宮",x.lord,x.startDate&&String(x.startDate)+"–"+String(x.endDate||"")];
  return parts.filter(Boolean).join(" · ");
 }
 return "";
}
const profileFields:[string,string][]=[
 ["wealthElement","財星元素"],["directWealthCount","正財數"],["indirectWealthCount","偏財數"],
 ["officerCount","官殺數"],["resourceCount","印星數"],["outputCount","食傷數"],
 ["spousePalace","關係宮位"],["spousePalaceTenGods","日支十神"],["partnerGodCount","關係相關十神數"],
 ["currentLuck","目前大運"],["annualSignalYears","對應流年"],["evidence","計算依據"],["natalEvidence","本命依據"]
];
export function profileEvidence(profile:any):string[]{
 if(!profile||typeof profile!=="object")return [];
 const out:string[]=[];
 for(const [key,label] of profileFields){
  const v=plain(profile[key]);
  if(v)out.push(label+"："+v);
 }
 return out;
}
export function Evidence({title,profile,mode,result,chapter}:{title:string;profile:any;mode:FortuneMode;result:any;chapter:FortuneChapterId}){
 const{i18n}=useTranslation("fortune");
 const fmt=(v:unknown)=>mode==="vedic"?formatVedicTerm(v,i18n.resolvedLanguage||i18n.language):String(v??"");
 const local=buildLocalReport(mode,result).find(x=>x.id===chapter);
 const facts=profileEvidence(profile);
 if(!local&&!facts.length)return null;
 return <section className="fortune-topic-card fortune-topic-deep">
  <div><h3>{title}</h3><p>{fmt(local?.text||"這個主題目前沒有足夠固定資料可作完整解讀。")}</p></div>
  <details className="fortune-source-details">
   <summary>查看命盤依據（{facts.length+(local?.evidence.length||0)}）</summary>
   {profile?.evidenceRule||profile?.rule?<p className="fortune-method-note">{fmt(profile.evidenceRule||profile.rule)}</p>:null}
   <ul>{[...new Set([...facts,...(local?.evidence||[])])].map((x,i)=><li key={i}>{fmt(x)}</li>)}</ul>
  </details>
 </section>;
}
type TimeMode="bazi"|"tarot"|"vedic";
export function YearEvidence({mode,item}:{mode:TimeMode;item:any}){
 const{i18n}=useTranslation("fortune");const{t:rt}=useTranslation("fortuneReport");
 const loaded=useRouteNamespace("fortuneReport");
 const zh=(i18n.resolvedLanguage||i18n.language)==="zh-TW";
 const ui=(key:string)=>loaded?String(rt("yearUi."+key)):key;
 const god=(value:unknown)=>{const raw=String(value??"");if(zh||!loaded)return raw;return raw.replace(/比肩|劫財|食神|傷官|偏財|正財|七殺|正官|偏印|正印/g,word=>String(rt("glossary.tenGods."+word))+" ("+word+")")};
 const fmt=(v:unknown)=>mode==="vedic"?formatVedicTerm(v,i18n.resolvedLanguage||i18n.language):mode==="bazi"?god(v):String(v??"");
 const year=mode==="vedic"?String(item.date||item.startDate||""):String(item.year||"");
 const title=mode==="bazi"?year+" · "+(item.ganZhi||ui("year")):mode==="tarot"?year+" · "+ui("year")+" "+(item.personalYear||"—"):(item.planet?year+" · "+item.planet+" "+ui("transit"):String(item.lord||ui("period")));
 const summary=mode==="bazi"&&loaded&&!zh?String(rt("yearUi.baziSummary",{god:god(item.stemTenGod||"—"),luck:item.luckPillar||"—"})):mode==="bazi"?item.plainSummary:mode==="tarot"?item.plainSummary||item.cardName:item.planet?String(item.fromSign||"")+" → "+String(item.toSign||""):String(item.startDate||"")+" – "+String(item.endDate||"");
 const entries:[string,unknown][] = mode==="bazi"?
  [[ui("stemTenGod"),item.stemTenGod],[ui("stemMeaning"),item.stemTenGodMeaning],[ui("branchTenGods"),item.branchTenGods],[ui("luckPillar"),item.luckPillar],[ui("themes"),item.themes],[ui("natalInteractions"),item.natalInteractions]]:
  mode==="tarot"?
  [[ui("tarotCard"),item.cardName],[ui("keywords"),item.keywords],[ui("personalYear"),item.personalYear]]:
  [[ui("planetPeriod"),item.planet||item.lord],[ui("fromSign"),item.fromSign],[ui("toSign"),item.toSign],[ui("fromHouse"),item.fromHouse],[ui("toHouse"),item.toHouse],[ui("startDate"),item.startDate],[ui("endDate"),item.endDate]];
 return <details className="fortune-year-card fortune-year-inspect"><summary><strong>{fmt(title)}</strong><span>{fmt(summary||"展開查看已計算資料")}</span><small>{ui("viewEvidence")}</small></summary>
 <div className="fortune-year-evidence">
 {entries.filter(([,v])=>v!==undefined&&v!==null&&plain(v)!=="").map(([label,value])=><div key={label}><small>{label}</small><span>{fmt(plain(value))}</span></div>)}
 
 </div></details>;
}
function structuredAi(ai:string){
 const bits=ai.split(/^##[ \t]+/m).map(x=>x.trim()).filter(Boolean);
 if(bits.length<=1)return null;
 return bits.map((part,i)=>{const end=part.indexOf("\n");return {title:(end<0?part:part.slice(0,end)).trim(),body:end<0?"":part.slice(end+1).trim(),key:i};}).filter(x=>x.body);
}
function Chapters({sections}:{sections:{title:string;text:string;id?:string}[]}){
 return <div className="fortune-chapters">{sections.map((s,i)=><section className="fortune-chapter" key={s.id||i}><h4>{s.title}</h4><p>{s.text}</p></section>)}</div>;
}
export function AiPanel({mode,result,ai}:{mode:FortuneMode;result:any;ai:string}){
 const local=buildLocalReport(mode,result),aiParts=structuredAi(ai||"");
 return <section className="fortune-result-card fortune-full-report">
  <h3>完整個人解讀</h3><p className="meta">每章均以已計算的命盤資料為依據。</p>
  {ai?<>
   <span className="fortune-report-label">AI 深入解讀</span>
   {aiParts?<Chapters sections={aiParts.map(x=>({title:x.title,text:x.body,id:String(x.key)}))}/>:<div className="fortune-ai">{ai}</div>}
   <details className="fortune-source-details fortune-local-collapse"><summary>查看免費的固定資料解讀（{local.length} 章）</summary><Chapters sections={local}/></details>
  </>:<>
   <span className="fortune-report-label">免費完整解讀 · 無需 API Key</span>
   <Chapters sections={local}/>
  </>}
 </section>;
}