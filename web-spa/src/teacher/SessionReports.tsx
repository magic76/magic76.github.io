import{useState}from"react";
import{history}from"../lib/runtime";
import{addPhrases,hasPhrase,togglePhrase}from"./phrasebook";

function score(v:any){return v==null?"--":String(v)}
function reportItems(r:any){
 const out:Array<{phrase:string;translation?:string;note?:string;source:string}>=[];
 (Array.isArray(r?.recasts)?r.recasts:[]).forEach((x:any)=>out.push({phrase:String(x.corrected||""),translation:String(x.original||""),note:String(x.explanation||""),source:"recast"}));
 (Array.isArray(r?.takeaways)?r.takeaways:[]).forEach((x:any)=>out.push({phrase:String(x.phrase||""),translation:String(x.translation||""),source:"takeaway"}));
 return out.filter(x=>x.phrase);
}
export function SessionReports(){
 const[version,setVersion]=useState(0);void version;
 const reports=history("teacher").filter((x:any)=>x.report);
 if(!reports.length)return <div className="notice"><div><b>還沒有課後報告</b><p>口說練習達到內容門檻後才會產生。</p></div></div>;
 return <div className="session-report-list">{reports.slice(0,20).map((item:any)=>{const r=item.report,items=reportItems(r);return <details className="session-report-item" key={item.id||item.ts}><summary><div><strong>{item.title||"口說練習"}</strong><small>{r?.summary||item.preview||""}</small></div><span className="pill">{score(r?.overall_score)}</span></summary><div className="session-report-detail">
  <div className="report-grid"><div className="report-stat"><b>{score(r?.fluency_score)}</b><span>流暢度</span></div><div className="report-stat"><b>{score(r?.vocab_score)}</b><span>詞彙</span></div><div className="report-stat"><b>{score(r?.grammar_score)}</b><span>文法</span></div></div>
  {r?.strengths&&<section className="report-section"><h4>優勢亮點</h4><p>{String(r.strengths)}</p></section>}
  {Array.isArray(r?.recasts)&&r.recasts.length>0&&<section className="report-section"><h4>母語者重述</h4>{r.recasts.slice(0,5).map((x:any,i:number)=>{const saved=hasPhrase(String(x.corrected||""),String(x.original||""));return <div className="report-learning-row" key={i}><div><del>{String(x.original||"")}</del><strong>{String(x.corrected||"")}</strong>{x.explanation&&<small>{String(x.explanation)}</small>}</div><button className={"save-phrase "+(saved?"saved":"")} onClick={()=>{togglePhrase({phrase:String(x.corrected||""),translation:String(x.original||""),note:String(x.explanation||""),source:"recast"});setVersion(v=>v+1)}}>{saved?"★":"☆"}</button></div>})}</section>}
  {Array.isArray(r?.takeaways)&&r.takeaways.length>0&&<section className="report-section"><h4>課後精選金句</h4>{r.takeaways.slice(0,6).map((x:any,i:number)=>{const saved=hasPhrase(String(x.phrase||""),String(x.translation||""));return <div className="report-learning-row" key={i}><div><strong>{String(x.phrase||"")}</strong><small>{String(x.translation||"")}</small></div><button className={"save-phrase "+(saved?"saved":"")} onClick={()=>{togglePhrase({phrase:String(x.phrase||""),translation:String(x.translation||""),source:"takeaway"});setVersion(v=>v+1)}}>{saved?"★":"☆"}</button></div>})}</section>}
  {r?.next_focus&&<section className="report-section focus"><h4>下次重點</h4><p>{String(r.next_focus)}</p></section>}
  {items.length>0&&<button className="btn secondary small" onClick={()=>{addPhrases(items);setVersion(v=>v+1)}}>★ 收藏全部精選</button>}
 </div></details>})}</div>
}
