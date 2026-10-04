import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Icon } from "./Icon";
import { hasGeminiKey } from "../lib/legacy";

const tabs = [
  ["/practice", "練習"],
  ["/learn", "學習"],
  ["/tutor", "老師"],
  ["/me", "我的"]
] as const;

export function TeacherShell() {
  useEffect(() => { document.body.classList.remove("session-page"); }, []);

  return (
    <>
      <header className="app-header">
        <div className="shell inner">
          <div className="app-brand">
            <span className="app-mark teacher">T</span>
            <div className="app-title"><strong>Crew Teacher</strong><small>語言學習</small></div>
          </div>
          <a className={"status " + (hasGeminiKey() ? "connected" : "")} href="/settings.html">
            <i className="status-dot" />
            <span>{hasGeminiKey() ? "Gemini 已設定" : "設定 Gemini"}</span>
          </a>
        </div>
      </header>

      <main className="shell page teacher-spa-page">
        <nav className="subnav teacher-route-tabs" aria-label="Teacher 分頁">
          {tabs.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}>{label}</NavLink>)}
        </nav>
        <Outlet />
      </main>

      <nav className="global-nav">
        <div className="inner">
          <a className="navitem" href="/index.html"><span className="nav-icon"><Icon name="home" /></span><span>首頁</span></a>
          <NavLink className="navitem active" to="/practice"><span className="nav-icon"><Icon name="teacher" /></span><span>Teacher</span></NavLink>
          <a className="navitem" href="/story.html"><span className="nav-icon"><Icon name="story" /></span><span>Story</span></a>
          <a className="navitem" href="/fortune.html"><span className="nav-icon"><Icon name="fortune" /></span><span>Fortune</span></a>
          <a className="navitem" href="/settings.html"><span className="nav-icon"><Icon name="settings" /></span><span>設定</span></a>
        </div>
      </nav>
    </>
  );
}
