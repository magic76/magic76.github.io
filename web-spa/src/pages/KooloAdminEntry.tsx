import {Arrow} from "../components/Arrow";
import {useEffect,useState,type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {Icon} from "../components/Icon";

// The API verifies the session and server-side allowlist; no email or allowlist is shipped to the browser.
export function KooloAdminEntry({children}:{children?:ReactNode}){
 const {t}=useTranslation("home");
 const [authorized,setAuthorized]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  void fetch("/api/usage/admin",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async response=>response.ok?await response.json() as {admin?:boolean}:null)
   .then(value=>{if(!controller.signal.aborted)setAuthorized(value?.admin===true)})
   .catch(()=>{if(!controller.signal.aborted)setAuthorized(false)});
  return()=>controller.abort();
 },[]);
 if(!authorized)return null;
 return <section className="koolo-account-group">
  <h2>{t("sectionHubs.me.groups.adminTools")}</h2><div className="koolo-account-list">
   <Link className="koolo-account-row" to="/usage"><Icon name="settings"/><span className="koolo-account-label">{t("sectionHubs.me.groups.admin")}</span><Arrow direction="chevron-right" size={16}/></Link>
   {children}
  </div>
 </section>;
}
