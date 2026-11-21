import {Arrow} from "../components/Arrow";
import {useEffect} from "react";
import {Link,useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {getGuide,guideSlugs,type GuideSlug} from "./catalog";


const getLocale=(value:string)=>value==="zh-TW"?"zh":"en";
const url=(slug:GuideSlug)=>"/guides/"+slug;

export function GuidePage(){
 const {slug}=useParams();
 const {t,i18n}=useTranslation("friends");
 const locale=getLocale(i18n.language),english=locale==="en";
 const guide=getGuide(slug,locale);
 useEffect(()=>{if(guide)document.title=guide.title},[guide]);
 if(!guide)return <section className="guide-error section"><h1>{english?"Guide not found":"找不到這篇指南"}</h1><Link to="/teacher">{english?"Back to Crew Teacher":"返回 Crew Teacher"}</Link></section>;
 const related=guideSlugs.filter(other=>other!==slug).slice(0,4);
 return <article className="crew-guide">
  <nav className="crew-guide-breadcrumbs" aria-label={english?"Breadcrumb":"麵包屑導覽"}>
   <Link to="/">{english?"Home":"首頁"}</Link><Arrow className="crew-arrow--plain"/>
   <Link to="/teacher">Crew Teacher</Link><Arrow className="crew-arrow--plain"/>
   <span aria-current="page">{guide.label}</span>
  </nav>
  <header className="crew-guide-hero">
   <span className="kicker">CREW GUIDES / {guide.label}</span>
   <h1>{guide.headline}</h1>
   <p>{guide.intro}</p>
   <div className="crew-guide-actions">
    <Link className="btn" to={guide.target}>{guide.cta} <Arrow direction="up-right"/></Link>
    <Link className="btn secondary" to={guide.secondaryTarget}>{guide.secondary}</Link>
   </div>
   <small className="crew-guide-requirement">{english?
    "Try AI voice for free. After your trial, you can add your Gemini key to continue.":
    "AI 語音可先免費試用；用完額度後可設定自己的 Gemini API Key。"}</small>
  </header>
  <div className="crew-guide-layout">
   <div className="crew-guide-main">
    <section className="crew-guide-summary" aria-label={english?"Key takeaways":"重點整理"}>
     <h2>{english?"What to remember":"先記住這三件事"}</h2>
     <ul>{guide.bullets.map(item=><li key={item}>{item}</li>)}</ul>
    </section>
    {guide.sections.map((section,index)=><section className="crew-guide-section" key={section.heading}>
     <span className="crew-guide-step">0{index+1}</span>
     <h2>{section.heading}</h2>
     {section.paragraphs.map(p=><p key={p}>{p}</p>)}
     {section.sample&&<div className="crew-guide-sample">
      <strong>{section.sample.label}</strong>
      {section.sample.text.startsWith("https://")?
       <a href={section.sample.text} target="_blank" rel="noopener noreferrer">{section.sample.text} <Arrow direction="up-right"/></a>:
       <blockquote lang="en">{section.sample.text}</blockquote>}
      <small>{section.sample.note}</small>
     </div>}
    </section>)}
    <section className="crew-guide-faq" aria-label={english?"Frequently asked questions":"常見問題"}>
     <h2>{english?"Frequently asked questions":"常見問題"}</h2>
     {guide.faq.map(entry=><details key={entry.question}><summary>{entry.question}</summary><p>{entry.answer}</p></details>)}
    </section>
    <section className="crew-guide-end">
     <h2>{english?"Ready to try it yourself?":"想自己試試看？"}</h2>
     <p>{english?"Choose the Crew experience that fits your goal. No separate Crew account is required.":"選擇適合自己的 Crew 練習方式；不需要另外註冊 Crew 帳號。"}</p>
     <div className="crew-guide-chat-actions">
      <Link className="crew-guide-chat-primary" to={"/friend/live?id=zoe&chat=text&topic=guide-"+slug}>{t("contentChat.articleText")}</Link>
      <Link className="crew-guide-chat-secondary" to="/fortune?daily=1">{t("contentChat.todayFortune")}</Link>
     </div>
     <Link className="btn secondary" to={guide.target}>{guide.cta} <Arrow/></Link>
    </section>
   </div>
   <aside className="crew-guide-aside" aria-label={english?"Other useful guides":"其他指南"}>
    <h2>{english?"Continue exploring":"延伸閱讀"}</h2>
    <div className="crew-guide-related">{related.map(s=><Link key={s} to={url(s)}>
     <strong>{getGuide(s,locale)?.headline}</strong><Arrow direction="up-right"/>
    </Link>)}</div>
   </aside>
  </div>
 </article>;
}
