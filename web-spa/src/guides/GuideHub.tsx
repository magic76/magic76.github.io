import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {guideSlugs,getGuide} from "./catalog";
import "./guides.css";

/** Genuine internal links from the product; not a hidden SEO-only sitemap. */
export function GuideHub(){
 const {i18n}=useTranslation();
 const en=i18n.language.startsWith("en"),locale=en?"en":"zh";
 return <section className="crew-guide-hub" aria-label={en?"English learning guides":"英文學習指南"}>
  <h2>{en?"English speaking guides":"英文口說與 AI 練習指南"}</h2>
  <div className="crew-guide-hub-links">{guideSlugs.map(slug=>
   <Link key={slug} to={"/guides/"+slug}>{getGuide(slug,locale)?.label} ↗</Link>
  )}</div>
 </section>;
}
