import { lazy,Suspense,useEffect,useLayoutEffect,useState } from "react";
import {useTranslation} from "react-i18next";
import {LanguageSwitcher} from "../i18n/LanguageSwitcher";
import { Link,NavLink,Outlet,useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import {useHomeAmbientMotion} from "../lib/useHomeAmbientMotion";
import {CrewFeatureMenu} from "./CrewFeatureMenu";
import {OptionalWidgetBoundary} from "./OptionalWidgetBoundary";
const CrewInstallEntry=lazy(()=>import("./CrewInstallEntry").then(module=>({default:module.CrewInstallEntry})));
import "./mobileNavigation.css";
import "./desktopNavigation.css";
import {CREW_SECTIONS,type CrewSection} from "../pages/crewNavigation";

export type Product="home"|"teacher"|"story"|"fortune"|"settings"|"briefing";
const meta={
 home:"",
 teacher:"Teacher",
 story:"Story",
 fortune:"Fortune",
 settings:"",
 briefing:"Briefing"
} as const;

export function AppChrome({product,children,headerAction}:{product:Product;children?:React.ReactNode;headerAction?:React.ReactNode}){
 const {t,i18n}=useTranslation("common");
 const productName=meta[product],location=useLocation();
 const homeLogo=product==="home"&&location.pathname==="/";
 const homeMotion=useHomeAmbientMotion(homeLogo);
 const [logoTap,setLogoTap]=useState(0);
 const rolesLanding=location.pathname==="/teacher/roles"||location.pathname==="/teacher/roles/";
 const headerContext=location.pathname==="/teacher/shorts"||location.pathname==="/teacher/shorts/"
  ?[t("chrome.shortsSection"),t("chrome.shortsTitle")]
  :location.pathname==="/timeline"||location.pathname.startsWith("/timeline/")
  ?[t("chrome.timelineSection"),t("chrome.timelineTitle")]:null;
 // Apply the theme class before first paint so themed chrome (e.g. the role switcher) does not shift layout.
 useLayoutEffect(()=>{document.body.className=product==="teacher"?"teacher-theme":product==="story"?"story-theme":product==="fortune"?"fortune-theme":""},[product]);
 useEffect(()=>{
  document.body.className=product==="teacher"?"teacher-theme":product==="story"?"story-theme":product==="fortune"?"fortune-theme":"";
  return()=>{document.body.className=""};
 },[product]);
 useEffect(()=>{if(!location.pathname.startsWith("/guides/")&&!/^\/teacher\/course\/[^/]+\/?$/.test(location.pathname))document.title=t("seo."+product)},[product,t,i18n.resolvedLanguage,location.pathname]);
 return <>
  <header className="app-header"><div className="shell inner"><CrewFeatureMenu/><Link className="app-brand" to={product==="teacher"?"/teacher":"/"} aria-label={t("brand.homeLink",{name:"Koolo"+(!rolesLanding&&productName?" "+productName:"")})} data-home-blink={homeMotion?"on":"off"} data-logo-tapped={logoTap>0?"true":"false"} onClick={event=>{if(homeLogo&&homeMotion){event.preventDefault();setLogoTap(count=>count+1)}}}><span className="koolo-wordmark-frame"><img className="app-wordmark" src="/brand/koolo-wordmark-koo-v2.svg" alt="" aria-hidden="true" width="160" height="48"/>{homeLogo&&<svg key={logoTap} className="koolo-home-blink" viewBox="0 0 160 48" focusable="false" aria-hidden="true"><g fill="#fcf9f9"><ellipse cx="55" cy="22.7" rx="4.8" ry="4"/><ellipse cx="81" cy="22.7" rx="4.8" ry="4"/></g><g fill="none" stroke="#153A35" strokeLinecap="round" strokeWidth="2.2"><path d="M51 23q4 3 8 0"/><path d="M77 23q4 3 8 0"/></g></svg>}</span>{!rolesLanding&&<span className="app-title">{(headerContext||productName)&&<strong>{headerContext?.[0]||productName}</strong>}<small>{headerContext?.[1]||t("brand."+product)}</small></span>}</Link><div className="app-header-actions"><LanguageSwitcher/>{headerAction} </div></div></header>
  <main key={location.pathname} className="shell page page-enter">{children||<Outlet/>}</main>
  <footer className="crew-contact-footer shell" aria-label={t("contact.region")}>
   <span>{t("contact.label")}</span>
   <a href="mailto:cs@koolo.app">cs@koolo.app</a>
   <Link to="/purchase-info">{/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language)?"服務與收費":"Services & pricing"}</Link>
   <Link className="crew-contact-feedback" to={"/feedback?from="+encodeURIComponent(location.pathname)}>{t("contact.feedback")}</Link>
   <OptionalWidgetBoundary><Suspense fallback={null}><CrewInstallEntry/></Suspense></OptionalWidgetBoundary>
  </footer>
 </>;
}
/** Stable destinations shared by both responsive navigations. Product pages do not
 * supply their own bottom tabs. One data source prevents the phone and desktop
 * destinations from drifting apart. */
const NAV_SECTIONS=[
 {id:"home",to:"/",icon:"home"},
 {id:"learn",to:"/learn",icon:"teacher"},
 {id:"explore",to:"/explore",icon:"sparkles"},
 {id:"chat",to:"/chat",icon:"chat"},
 {id:"me",to:"/me",icon:"settings"}
] as const;

/** Single mobile dock on every regular Crew page, independent of product themes. */
export function MobileBottomNav({active,hiddenOnMobile=false}:{active:CrewSection;hiddenOnMobile?:boolean}){
 const {t}=useTranslation("common");
 return <nav className={"crew-mobile-dock"+(hiddenOnMobile?" crew-mobile-dock--immersive":"")}
  aria-label={t("nav.label")} data-active={active}>
  <div className="crew-mobile-dock-inner">
   {NAV_SECTIONS.map(item=><Link key={item.id} to={item.to}
    className={"crew-mobile-dock-item "+(active===item.id?"active":"")}
    aria-current={active===item.id?"page":undefined}>
    <span className="crew-mobile-dock-icon"><Icon name={item.icon}/></span>
    <span className="crew-mobile-dock-label">{t("nav."+item.id)}</span>
   </Link>)}
  </div>
 </nav>;
}
/** Desktop retains the original five-item global rail and SSG-required class. */
export function GlobalNav({active,mobileImmersive=false}:{active:CrewSection;mobileImmersive?:boolean}){
 const {t}=useTranslation("common");
 const index=CREW_SECTIONS.indexOf(active);
 return <>
  <nav className="global-nav" aria-label={t("nav.label")}>
   <div className="inner">
    <span className="nav-indicator" aria-hidden="true" data-inactive={index<0?"true":"false"}
     style={{"--nav-index":Math.max(0,index)} as React.CSSProperties}/>
    {NAV_SECTIONS.map(item=><NavLink key={item.id} to={item.to} end
     className={"navitem "+(active===item.id?"active":"")}
     aria-current={active===item.id?"page":undefined}>
     <span className="nav-icon"><Icon name={item.icon}/></span><span>{t("nav."+item.id)}</span>
    </NavLink>)}
   </div>
  </nav>
  <MobileBottomNav active={active} hiddenOnMobile={mobileImmersive}/>
 </>;
}
