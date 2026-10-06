import { useEffect } from "react";
import { NavLink,Outlet } from "react-router-dom";
import { Icon } from "./Icon";
import { geminiKey } from "../lib/runtime";

export type Product="home"|"teacher"|"story"|"fortune"|"settings";
const meta={
 home:["C","Crew","AI tools that work like apps"],
 teacher:["T","Crew Teacher","語言學習"],
 story:["S","Crew Story","故事創作"],
 fortune:["F","Crew Fortune","命盤探索"],
 settings:["C","Crew","設定"]
} as const;

export function AppChrome({product,children,headerAction}:{product:Product;children?:React.ReactNode;headerAction?:React.ReactNode}){
 const m=meta[product];
 useEffect(()=>{
  document.body.className=product==="teacher"?"teacher-theme":product==="story"?"story-theme":product==="fortune"?"fortune-theme":"";
  return()=>{document.body.className=""};
 },[product]);
 return <>
  <header className="app-header"><div className="shell inner"><div className="app-brand"><span className={"app-mark "+(product==="home"||product==="settings"?"":product)}>{m[0]}</span><div className="app-title"><strong>{m[1]}</strong><small>{m[2]}</small></div></div><div className="app-header-actions">{headerAction}<>{product!=="settings"&&<NavLink className={"status "+(geminiKey()?"connected":"")} to="/settings"><i className="status-dot"/><span>{geminiKey()?"Gemini 已設定":"設定 Gemini"}</span></NavLink>}</></div></div></header>
  <main className="shell page page-enter">{children||<Outlet/>}</main>
  <GlobalNav active={product}/>
 </>;
}
export function GlobalNav({active}:{active:Product}){return <nav className="global-nav"><div className="inner">
 <NavLink className={"navitem "+(active==="home"?"active":"")} to="/"><span className="nav-icon"><Icon name="home"/></span><span>首頁</span></NavLink>
 <NavLink className={"navitem "+(active==="teacher"?"active":"")} to="/teacher/practice"><span className="nav-icon"><Icon name="teacher"/></span><span>Teacher</span></NavLink>
 <NavLink className={"navitem "+(active==="story"?"active":"")} to="/story"><span className="nav-icon"><Icon name="story"/></span><span>Story</span></NavLink>
 <NavLink className={"navitem "+(active==="fortune"?"active":"")} to="/fortune"><span className="nav-icon"><Icon name="fortune"/></span><span>Fortune</span></NavLink>
 <NavLink className={"navitem "+(active==="settings"?"active":"")} to="/settings"><span className="nav-icon"><Icon name="settings"/></span><span>設定</span></NavLink>
 </div></nav>}
