import {Arrow} from "../components/Arrow";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useClientReady} from "../lib/useClientReady";
import {completedLessons} from "./courseProgress";
import {COURSE_LESSONS} from "./courseCatalog";
import {dueDeckItems,learningDeck} from "./learningDeck";
import {history} from "../lib/runtime";

/** Device-local facts only. Do not infer skill levels from completion counts. */
export function LearningSnapshot({compact=false}:{compact?:boolean}={}){
 const ready=useClientReady();
 const {i18n}=useTranslation();
 const en=i18n.resolvedLanguage?.startsWith("en")??false;
 const lessons=ready?completedLessons():null;
 const reports=ready?history("teacher").filter((x:any)=>Boolean(x.report)).length:null;
 const saved=ready?learningDeck().length:null;
 const due=ready?dueDeckItems().length:null;
 if(compact)return <section className="section panel crew-learn-snapshot-compact" aria-label={en?"Learning progress":"學習進度"} style={{display:"grid",gap:8,minHeight:100}}>
  <div className="teacher-stats" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
   <div><strong>{lessons===null?"—":`${lessons} / ${COURSE_LESSONS.length}`}</strong><span>{en?"Lessons":"完成課程"}</span></div>
   <div><strong>{due??"—"}</strong><span>{en?"Due for review":"待複習"}</span></div>
  </div>
  <Link className="btn secondary small" to="/teacher/phrasebook" style={{minHeight:44,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{en?"Review phrases":"複習片語"} →</Link>
 </section>;
 return <section className="section panel" aria-label={en?"Learning progress":"學習進度"} style={{display:"grid",gap:12}}>
  <div className="section-head"><h2>{en?"Your progress":"你的學習進度"}</h2><small>{en?"Saved on this device":"儲存在這台裝置"}</small></div>
  <div className="teacher-stats" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>
   <div><strong>{lessons??"—"}</strong><span>{en?"Lessons":"完成課程"}</span></div>
   <div><strong>{reports??"—"}</strong><span>{en?"Reports":"練習報告"}</span></div>
   <div><strong>{saved??"—"}</strong><span>{en?"Saved":"收藏片語"}</span></div>
  </div>
  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
   <Link className="btn secondary small" to="/teacher/reports">{en?"View reports":"查看報告"} <Arrow/></Link>
   <Link className="btn secondary small" to="/teacher/phrasebook">{en?"Review phrases":"複習片語"}{due!==null&&due>0?` (${due})`:""} <Arrow/></Link>
  </div>
 </section>;
}
