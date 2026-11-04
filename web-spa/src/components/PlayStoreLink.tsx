import {useTranslation} from "react-i18next";
import {isCrewAndroidShell} from "../lib/platform";
import {useClientReady} from "../lib/useClientReady";
type Product="teacher"|"story"|"fortune";

export const CREW_ANDROID_PLAY_STORE_URL="https://play.google.com/store/apps/details?id=com.crewpocket.teacher";

const APPS:Record<Product,{name:string;url:string|null}>={
 teacher:{name:"Crew",url:CREW_ANDROID_PLAY_STORE_URL},
 story:{name:"Crew Story",url:"https://play.google.com/store/apps/details?id=com.crewpocket.story"},
 fortune:{name:"Crew Fortune",url:null}
};

export function PlayStoreLink({product,compact=false}:{product:Product;compact?:boolean}){
 const ready=useClientReady();
 const {t}=useTranslation("home");
 const app=APPS[product];
 const appName=product==="teacher"?t("android.appName"):app.name;
 // Don't promote the Play Store to people already inside the Crew app.
 // Wait until mounted so server-rendered HTML and hydration stay consistent.
 if(!ready||isCrewAndroidShell())return null;
 const content=<>
  <span className="play-store-mark" aria-hidden="true">{app.url?"▶":"…"}</span>
  <span className="play-store-copy">
   <small>{app.url?(compact?"Android 版":"GET IT ON Google Play"):"COMING SOON"}</small>
   <strong>{appName}</strong>
   <span className="play-store-platform">{app.url?"Google Play":"Google Play 準備中"}</span>
  </span>
  <span className="play-store-arrow" aria-hidden="true">{app.url?"↗":"即將推出"}</span>
 </>;
 if(!app.url)return <div className={"play-store-link "+product+" unavailable"+(compact?" compact":"")} aria-label={appName+" - Google Play 準備中"}>{content}</div>;
 return <a className={"play-store-link "+product+(compact?" compact":"")} href={app.url} target="_blank" rel="noopener noreferrer" aria-label={appName+" - Google Play"}>{content}</a>;
}
