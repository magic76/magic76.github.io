import {useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {AGES,stage,olderNotes,clearNotes} from "./timeline";
import "./timeline.css";
export function TimelinePage(){
 const {i18n}=useTranslation(),en=i18n.language.startsWith("en");
 const language=useTeacherStore(s=>s.targetLanguage),setLanguage=useTeacherStore(s=>s.setTargetLanguage);
 const[refresh,setRefresh]=useState(0);
 return <main className="shell timeline-page" data-refresh={refresh}>
  <header className="hero timeline-hero"><span className="kicker">CREW TIMELINE</span>
   <h1>{en?"Meet Mira across a lifetime":"與 Mira 一起走過一生"}</h1>
   <p>{en?"One fictional person. Six ages. Countless stories.":"同一個虛構角色，六個人生階段。聊聊她的現在，也探索她的過去。"}</p>
  </header>
  <section className="section panel timeline-config">
   <label>{en?"Conversation language":"對話語言"} <select className="field" value={language} onChange={e=>setLanguage(e.target.value)}>
    {TARGET_LANGUAGES.map(l=><option key={l.value} value={l.value}>{l.value}</option>)}
   </select></label>
   <small>{en?"Age does not set your language level. Use your existing Gemini Key.":"角色年齡不等於你的語言程度，對話沿用現有 Gemini Key。"}</small>
  </section>
  <div className="section-head"><h2>{en?"Choose an age":"選一個年齡開始"}</h2><small>6 chapters</small></div>
  <div className="timeline-grid">{AGES.map(age=><Link key={age} className="timeline-age" to={"/timeline/live?age="+age}>
   <span className="timeline-monogram">M</span><strong>{age} {en?"years":"歲"}</strong>
   <span>{stage(age).phase}</span><small>{stage(age).story}</small>
   {olderNotes(age).length>0?<em>{olderNotes(age).length} {en?"saved moments":"則回憶"}</em>:null}
   <b>{en?"Talk to Mira":"與 Mira 對話"} ↗</b>
  </Link>)}</div>
  <section className="section panel timeline-privacy">
   <div><strong>{en?"Age-scoped keepsakes":"跨年齡的回憶"}</strong>
    <p>{en?"Only phrases you explicitly save travel forward, never backward. No automatic transcript capture. The existing topic-memory opt-out applies.":"只有你主動保存的話語能往未來延續，不會倒流。不自動保存逐字稿，也遵守原有話題記憶開關。"}</p>
   </div><button type="button" onClick={()=>{if(window.confirm(en?"Delete all Mira keepsakes?":"確定刪除 Mira 的全部回憶？")){clearNotes();setRefresh(v=>v+1)}}}>{en?"Clear memories":"清除回憶"}</button>
  </section>
  <p className="timeline-caption">{en?"Mira is fictional. Age-specific photographs and voices are not yet available.":"Mira 為虛構角色。不同年齡的照片與聲線尚未製作，現階段使用示意頭像。"}</p>
 </main>;
}
