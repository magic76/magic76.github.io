import type {Dispatch,SetStateAction} from "react";
import {useTranslation} from "react-i18next";
import {geminiKey} from "../lib/runtime";
import {GuestLiveStarter} from "../live/GuestLiveStarter";
import {LiveControls} from "../live/LiveControls";
import type {ReturnTypeOfLive} from "../live/types";

export function CreatureVoiceStart({live,guestStarted,setGuestStarted}:{
 live:ReturnTypeOfLive;guestStarted:boolean;setGuestStarted:Dispatch<SetStateAction<boolean>>;
}){
 const {t}=useTranslation(["common","voice"]);
 if(!geminiKey()&&!guestStarted)return <GuestLiveStarter role="friend" linksInNewTab
  onGrant={async grant=>{setGuestStarted(true);await live.start(grant)}}/>;
 if(guestStarted&&(live.state==="ended"||live.state==="error"))
  return <p role="status">{t(live.state==="error"?"guestTrial.interrupted":"guestTrial.ended")}</p>;
 return <LiveControls live={live} onEnd={()=>live.stop(true)} prominentInterrupt interruptLabel={t("voice:friendLive.interrupt")}/>;
}
