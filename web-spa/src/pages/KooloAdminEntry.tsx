import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {Icon} from "../components/Icon";

// The API verifies the session and server-side allowlist; no email or allowlist is shipped to the browser.
export function KooloAdminEntry({english}:{english:boolean}){
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
 return <Link className="crew-section-card" to="/usage">
  <span className="crew-section-card-icon"><Icon name="settings"/></span>
  <span className="crew-section-card-copy">
   <strong>{english?"Admin dashboard":"管理後台"}</strong>
   <small>{english?"Usage, accounts and membership diagnostics":"使用統計、帳號與會員測試"}</small>
  </span>
  <span className="crew-section-arrow" aria-hidden="true">→</span>
 </Link>;
}
