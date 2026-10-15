import { useEffect } from "react";
import {useClientReady} from "../lib/useClientReady";
import {useTranslation} from "react-i18next";
import {LanguageSwitcher} from "../i18n/LanguageSwitcher";
import { NavLink,Outlet,useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import { geminiKey,geminiVerified } from "../lib/runtime";

export type Product="home"|"teacher"|"story"|"fortune"|"settings"|"briefing";
const meta={
 home:["C","Crew","語言・故事・命理"],
 teacher:["T","Crew Teacher","語言學習"],
 story:["S","Crew Story","故事創作"],
 fortune:["F","Crew Fortune","命盤探索"],
 settings:["C","Crew","設定"],
 briefing:["C","Crew Briefing","每日研發情報"]
} as const;

export function AppChrome({product,children,headerAction}:{product:Product;children?:React.ReactNode;headerAction?:React.ReactNode}){
 const {t,i18n}=useTranslation("common");
 const ready=useClientReady();
 const m=meta[product],hasKey=ready&&Boolean(geminiKey()),verified=ready&&geminiVerified(),location=useLocation();
 useEffect(()=>{
  document.body.className=product==="teacher"?"teacher-theme":product==="story"?"story-theme":product==="fortune"?"fortune-theme":"";
  return()=>{document.body.className=""};
 },[product]);
 useEffect(()=>{document.title=t("seo."+product)},[product,t,i18n.resolvedLanguage]);
 return <>
  <header className="app-header"><div className="shell inner"><div className="app-brand"><span className={"app-mark "+(product==="home"||product==="settings"?"":product)}>{m[0]}</span><div className="app-title"><strong>{m[1]}</strong><small>{t("brand."+product)}</small></div></div><div className="app-header-actions"><LanguageSwitcher/>{headerAction}{product!=="settings"&&product!=="briefing"&&(ready
    ?<NavLink className={"status "+(verified?"connected":hasKey?"pending":"")} to="/settings"><i className="status-dot"/><span>{verified?t("gemini.connected"):hasKey?t("gemini.pending"):t("gemini.setup")}</span></NavLink>
    :<span className="status crew-key-status-placeholder" aria-hidden="true"/>)} </div></div></header>
  <main key={location.pathname} className="shell page page-enter">{children||<Outlet/>}</main>
  <footer className="crew-contact-footer shell" aria-label="聯絡資訊">
   <span>{t("contact.label")}</span>
   <a href="mailto:crew@3sssi.com">crew@3sssi.com</a>
  </footer>
 </>;
}
export function GlobalNav({active}:{active:Product}){const {t}=useTranslation("common");const index=["home","teacher","story","fortune","settings"].indexOf(active);return <nav className="global-nav" aria-label="主要導覽"><div className="inner"><span className="nav-indicator" aria-hidden="true" data-inactive={index<0?"true":"false"} style={{"--nav-index":Math.max(0,index)} as React.CSSProperties}/>
 <NavLink className={"navitem "+(active==="home"?"active":"")} to="/"><span className="nav-icon"><Icon name="home"/></span><span>{t("nav.home")}</span></NavLink>
 <NavLink className={"navitem "+(active==="teacher"?"active":"")} to="/teacher"><span className="nav-icon"><Icon name="teacher"/></span><span>{t("nav.teacher")}</span></NavLink>
 <NavLink className={"navitem "+(active==="story"?"active":"")} to="/story"><span className="nav-icon"><Icon name="story"/></span><span>{t("nav.story")}</span></NavLink>
 <NavLink className={"navitem "+(active==="fortune"?"active":"")} to="/fortune"><span className="nav-icon"><Icon name="fortune"/></span><span>{t("nav.fortune")}</span></NavLink>
 <NavLink className={"navitem "+(active==="settings"?"active":"")} to="/settings"><span className="nav-icon"><Icon name="settings"/></span><span>{t("nav.settings")}</span></NavLink>
 </div></nav>}
