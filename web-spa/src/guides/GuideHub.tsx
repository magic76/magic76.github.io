import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";

const topics=[
 ["ai-english-speaking","AI 英文口說練習","AI speaking practice"],
 ["ai-conversation-partner","AI 英文聊天","AI conversation partner"],
 ["travel-english-dialogues","旅遊英文情境","Travel English dialogues"],
 ["english-pronunciation","英文發音練習","English pronunciation"],
 ["gemini-key-for-ai-practice","Gemini API Key 設定","Gemini API key setup"]
] as const;

/** Lightweight internal links: guide articles remain a separate lazy-loaded chunk. */
export function GuideHub(){
 const {i18n}=useTranslation();
 const english=i18n.language!=="zh-TW";
 return <section className="crew-guide-hub" aria-label={english?"English learning guides":"英文學習指南"}>
  <h2>{english?"English speaking guides":"英文口說與 AI 練習指南"}</h2>
  <div className="crew-guide-hub-links">{topics.map(([slug,zh,en])=>
   <Link key={slug} to={"/guides/"+slug}>{english?en:zh} ↗</Link>
  )}</div>
 </section>;
}
