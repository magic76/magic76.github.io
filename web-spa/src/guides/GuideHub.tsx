import {Arrow} from "../components/Arrow";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {internationalLearningCopy} from "../i18n/internationalLearningCopy";

const marketLinks=["/teacher","/teacher/course/travel","/teacher/course/business","/teacher/pronunciation"] as const;

const topics=[
 ["ai-english-speaking","AI 英文口說練習","AI English Speaking Practice"],
 ["ai-conversation-partner","AI 英文聊天","AI conversation partner"],
 ["travel-english-dialogues","旅遊英文：入住與問路","Travel English: hotels and directions"],
 ["english-pronunciation","英文發音練習","English pronunciation"],
 ["gemini-key-for-ai-practice","Gemini API Key 設定","Gemini API key setup"]
] as const;

/** Lightweight internal links: guide articles remain a separate lazy-loaded chunk. */
export function GuideHub({hideGeminiKey=false}:{hideGeminiKey?:boolean}={}){
 const {i18n}=useTranslation();
 const market=internationalLearningCopy(i18n.resolvedLanguage||i18n.language);
 if(market){
  const guide=market.guides;
  return <section className="crew-guide-hub" aria-label={guide.heading}>
   <h2>{guide.heading}</h2><p>{guide.intro}</p>
   <div className="grid two-col">{guide.examples.map(example=><div className="notice" key={example.label}><strong>{example.label}</strong><p lang="en">{example.english}</p><p>{example.meaning}</p></div>)}</div>
   <div className="crew-guide-hub-links">{marketLinks.map((to,index)=><Link key={to} to={to==="/teacher"&&hideGeminiKey?"/teacher/roles?mode=teacher":to}><span className="crew-guide-hub-label">{guide.links[index]}</span><Arrow direction="right" className="crew-guide-hub-arrow"/></Link>)}</div>
   <p className="meta">{guide.note}</p>
  </section>;
 }
 const english=i18n.language!=="zh-TW";
 return <section className="crew-guide-hub" aria-label={english?"English learning guides":"英文學習指南"}>
  <h2>{english?"Practice guides":"練習指南"}</h2>
  <div className="crew-guide-hub-links">{topics.filter(([slug])=>!hideGeminiKey||slug!=="gemini-key-for-ai-practice").map(([slug,zh,en])=>
   <Link key={slug} to={"/guides/"+slug+"/"}><span className="crew-guide-hub-label">{english?en:zh}</span><Arrow direction="right" className="crew-guide-hub-arrow"/></Link>
  )}</div>
 </section>;
}
