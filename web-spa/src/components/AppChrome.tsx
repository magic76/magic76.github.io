import { useEffect } from "react";
import { NavLink,Outlet,useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import { geminiKey,geminiVerified } from "../lib/runtime";

export type Product="home"|"teacher"|"story"|"fortune"|"settings";
const meta={
 home:["C","Crew","語言・故事・命理"],
 teacher:["T","Crew Teacher","語言學習"],
 story:["S","Crew Story","故事創作"],
 fortune:["F","Crew Fortune","命盤探索"],
 settings:["C","Crew","設定"]
} as const;

export function AppChrome({product,children,headerAction}:{product:Product;children?:React.ReactNode;headerAction?:React.ReactNode}){
 const m=meta[product],hasKey=Boolean(geminiKey()),verified=geminiVerified(),location=useLocation();
 useEffect(()=>{
  document.body.className=product==="teacher"?"teacher-theme":product==="story"?"story-theme":product==="fortune"?"fortune-theme":"";
  return()=>{document.body.className=""};
 },[product]);
 return <>
  <header className="app-header"><div className="shell inner"><div className="app-brand"><span className={"app-mark "+(product==="home"||product==="settings"?"":product)}>{m[0]}</span><div className="app-title"><strong>{m[1]}</strong><small>{m[2]}</small></div></div><div className="app-header-actions">{headerAction}<>{product!=="settings"&&<NavLink className={"status "+(verified?"connected":hasKey?"pending":"")} to="/settings"><i className="status-dot"/><span>{verified?"Gemini 已連線":hasKey?"Gemini 待驗證":"設定 Gemini"}</span></NavLink>}</></div></div></header>
  <main key={location.pathname+location.search} className="shell page page-enter">{children||<Outlet/>}</main>
  <footer className="crew-contact-footer shell" aria-label="聯絡資訊">
   <span>聯絡我們</span>
   <a href="mailto:crew@3sssi.com">crew@3sssi.com</a>
  </footer>
 </>;
}
export function GlobalNav({active}:{active:Product}){const index=["home","teacher","story","fortune","settings"].indexOf(active);return <nav className="global-nav" aria-label="主要導覽"><div className="inner"><span className="nav-indicator" aria-hidden="true" data-inactive={index<0?"true":"false"} style={{"--nav-index":Math.max(0,index)} as React.CSSProperties}/>
 <NavLink className={"navitem "+(active==="home"?"active":"")} to="/"><span className="nav-icon"><Icon name="home"/></span><span>首頁</span></NavLink>
 <NavLink className={"navitem "+(active==="teacher"?"active":"")} to="/teacher/practice"><span className="nav-icon"><Icon name="teacher"/></span><span>Teacher</span></NavLink>
 <NavLink className={"navitem "+(active==="story"?"active":"")} to="/story"><span className="nav-icon"><Icon name="story"/></span><span>Story</span></NavLink>
 <NavLink className={"navitem "+(active==="fortune"?"active":"")} to="/fortune"><span className="nav-icon"><Icon name="fortune"/></span><span>Fortune</span></NavLink>
 <NavLink className={"navitem "+(active==="settings"?"active":"")} to="/settings"><span className="nav-icon"><Icon name="settings"/></span><span>設定</span></NavLink>
 </div></nav>}
