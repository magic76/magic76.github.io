import {Arrow} from "../components/Arrow";
import {useState,type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import "./gameVoiceDock.css";

/**
 * Wraps a game's voice panel. On narrow screens the panel is fixed above the
 * bottom nav, so it starts collapsed to one row (status + main control) and the
 * whole board stays visible; the toggle reveals the full panel. Desktop ignores
 * the collapsed state and always shows the full panel.
 */
export function GameVoiceDock({className,label,children}:{className:string;label?:string;children:ReactNode}){
 const {t}=useTranslation("home");
 const [collapsed,setCollapsed]=useState(true);
 return <section className={className+" game-voice-dock"+(collapsed?" is-collapsed":"")} aria-label={label||t("playHub.mini.voiceRegion")}>
  <button type="button" className="game-voice-dock-toggle" aria-expanded={!collapsed} onClick={()=>setCollapsed(value=>!value)}
   aria-label={collapsed?t("playHub.voiceDock.expand"):t("playHub.voiceDock.collapse")} title={collapsed?t("playHub.voiceDock.expand"):t("playHub.voiceDock.collapse")}>
   <Arrow direction={collapsed?"up":"down"} className="crew-arrow--plain"/>
  </button>
  {children}
 </section>;
}
