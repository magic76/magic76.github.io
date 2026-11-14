import {useState,type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {Link,useLocation} from "react-router-dom";
import "./gameVoiceDock.css";

/**
 * Wraps a game's voice panel. On narrow screens the panel is fixed above the
 * bottom nav, so it starts collapsed to one row (status + main control) and the
 * whole board stays visible; the toggle reveals the full panel. Desktop ignores
 * the collapsed state and always shows the full panel.
 */
export function GameVoiceDock({className,label,children}:{className:string;label?:string;children:ReactNode}){
 const {t}=useTranslation(["home","friends"]);
 const {pathname}=useLocation();
 const id=pathname.match(/^\/games\/([a-z0-9-]+)(?:\/|$)/)?.[1]||"";
 const topics:Record<string,string>={connect4:"game-connect4",reversi:"game-reversi",gomoku:"game-gomoku","friend-gomoku":"game-gomoku","1a2b":"game-1a2b","number-bomb":"game-number-bomb",memory:"game-memory",taboo:"game-taboo"};
 const topic=topics[id]||"game-play";
 const [collapsed,setCollapsed]=useState(true);
 return <section className={className+" game-voice-dock"+(collapsed?" is-collapsed":"")} aria-label={label||t("playHub.mini.voiceRegion")}>
  <button type="button" className="game-voice-dock-toggle" aria-expanded={!collapsed} onClick={()=>setCollapsed(value=>!value)}
   aria-label={collapsed?t("playHub.voiceDock.expand"):t("playHub.voiceDock.collapse")} title={collapsed?t("playHub.voiceDock.expand"):t("playHub.voiceDock.collapse")}>
   <span aria-hidden="true">{collapsed?"⌃":"⌄"}</span>
  </button>
  {children}
  <Link className="game-voice-dock-chat" to={"/friend/live?id=zoe&chat=text&topic="+topic}>{t("contentChat.gameText",{ns:"friends"})}</Link>
 </section>;
}
