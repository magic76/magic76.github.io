import {Arrow} from "../components/Arrow";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {hasNativeDeviceBridge} from "../lib/deviceCapabilities";
import {CyberOrbPanel} from "./CyberOrbPanel";

export function CyberOrbPage(){
 const {t,i18n}=useTranslation("settings");
 return <div className="crew-orb-route">
  <Link to="/" className="crew-orb-back" style={{display:"inline-flex",marginBottom:12,color:"inherit",fontSize:13,textDecoration:"none"}}>
   ← {i18n.language.startsWith("zh")?"回首頁":"Home"}
  </Link>
  {hasNativeDeviceBridge()?<CyberOrbPanel/>:
   <section className="section panel"><h1>Cyber Orb</h1><p className="meta">{t("cyberOrb.unavailable")}</p></section>}
 </div>;
}
