import type {FortuneMode} from "./types";
import {buildLocalReport} from "./report";
import type {FortuneChapter} from "./report";

const primary=["overview","personality","career","wealth","relationships","currentCycle"];
const prompt:Record<string,string>={
 overview:"你的整體底盤",personality:"你如何思考與行動",career:"工作與職涯",wealth:"財務與資源",
 relationships:"感情與人際",family:"家庭與生活",currentCycle:"你目前的人生階段",
 longTerm:"接下來的長期節奏",keyYears:"重要年份",advice:"怎麼運用這份解讀"
};
function TextSection({chapter}:{chapter:FortuneChapter}){
 return <article className="fortune-reading-chapter">
  <h4>{prompt[chapter.id]||chapter.title}</h4>
  <p>{chapter.text}</p>
  {chapter.evidence.length>0&&<details className="fortune-source-details"><summary>這段使用的命盤依據</summary><ul>{chapter.evidence.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}
 </article>;
}
function aiHighlights(ai:string):Array<{title:string;body:string}>{
 const parts=ai.split(/^##[ \t]+/m).map(s=>s.trim()).filter(Boolean);
 const sections=parts.map(part=>{
  const line=part.indexOf("\n");
  return {title:line<0?"":part.slice(0,line).trim(),body:line<0?"":part.slice(line+1).trim()};
 }).filter(x=>x.title&&x.body);
 const wanted=["命盤總覽","事業與職涯","目前人生階段","重要年份與轉折"];
 const selected=wanted.map(title=>sections.find(x=>x.title===title)).filter((x):x is {title:string;body:string}=>Boolean(x));
 return selected.length?selected.slice(0,3):sections.slice(0,3);
}
export function FortuneReadingOverview({mode,result,ai}:{mode:FortuneMode;result:any;ai?:string}){
 const chapters=buildLocalReport(mode,result);
 if(!chapters.length)return null;
 const main=primary.map(id=>chapters.find(x=>x.id===id)).filter((c):c is FortuneChapter=>Boolean(c));
 const more=chapters.filter(x=>!primary.includes(x.id));
 const aiChapters=ai?aiHighlights(ai):[];
 return <section className="fortune-reading-overview" aria-label="你的命盤白話解讀">
  <div className="fortune-reading-head">
   <span className="kicker">先讀解讀，再看術語</span>
   <h3>你的命盤，有哪些值得了解的地方？</h3>
   <p>以下依照你的出生資料與固定命理計算整理，不用開啟語音，也不用等待 Gemini，就能先完整閱讀。命理是傳統的自我反思方式，並非可驗證的事件預測。</p>
  </div>
  <div className="fortune-reading-chapters">{main.map(chapter=><TextSection key={chapter.id} chapter={chapter}/>)}</div>
  {more.length>0&&<details className="fortune-reading-more">
   <summary>繼續閱讀其他 {more.length} 個主題：未來節奏、重要年份與建議</summary>
   <div className="fortune-reading-chapters">{more.map(chapter=><TextSection key={chapter.id} chapter={chapter}/>)}</div>
  </details>}
  {aiChapters.length>0&&<aside className="fortune-reading-ai">
   <h4>Gemini 的深入解讀</h4>
   <p className="fortune-ai-intro">AI 完成後會自動補上個人化段落，不需要開啟語音或額外追問。</p>
   {aiChapters.map(x=><article key={x.title} className="fortune-reading-ai-chapter"><h5>{x.title}</h5><p>{x.body}</p></article>)}
   <small>其餘章節可在下方「完整解讀」閱讀；語音適合針對特定問題繼續追問。</small>
  </aside>}
 </section>;
}