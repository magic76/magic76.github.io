import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon} from "../components/Icon";
import {CREW_FRIENDS} from "./friendProfiles";
import {useClientReady} from "../lib/useClientReady";
import {useRouteNamespace} from "../i18n/useRouteNamespace";

/** Friend-only intents live in /chat, never in the teacher/course area. */
export function FriendIntentCards(){
 const {t}=useTranslation("teacher");
 const ready=useClientReady();
 useRouteNamespace("lesson");
 let friendId:string|null=null;
 if(ready)try{friendId=localStorage.getItem("crew_web_selected_friend_v1")}catch{/* No saved selection. */}
 const friend=CREW_FRIENDS.find(x=>x.id===friendId)||CREW_FRIENDS[0];
 const selectedFriend=encodeURIComponent(friend.id);
 return <section className="section crew-daily-intents" aria-labelledby="crew-chat-topics">
  <div className="section-head"><h2 id="crew-chat-topics">{t("practiceEntry.intentsHeading")}</h2></div>
  <div className="crew-intent-grid">
   <Link className="crew-intent-card" to={"/friend/live?id="+selectedFriend+"&intent=share"}><Icon name="chat"/><strong>{t("practiceEntry.shareTitle")}</strong><small>{t("practiceEntry.shareDesc")}</small></Link>
   <Link className="crew-intent-card" to={"/friend/live?id="+selectedFriend+"&intent=speak"}><Icon name="mic"/><strong>{t("practiceEntry.speakTitle")}</strong><small>{t("practiceEntry.speakDesc")}</small></Link>
  </div>
 </section>;
}
