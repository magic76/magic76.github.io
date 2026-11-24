import {useRef,useState} from "react";
import {GUEST_TEXT_DAILY_TURNS} from "./guestAllowance";
import {guestTextWorkerError} from "./guestTextError";
type Config={dailyLimit?:number;memberDailyLimit?:number;remaining?:number};
/** Only the Worker advertises the new entitlement. Account proof is never persisted. */
export function useGuestTextQuota(){
 const [remaining,setRemaining]=useState<number|null>(null);
 const [dailyLimit,setDailyLimit]=useState(GUEST_TEXT_DAILY_TURNS);
 const [memberQuota,setMemberQuota]=useState(false);
 const enabled=useRef(false);
 async function applyConfig(config:Config,signal:AbortSignal){
  enabled.current=config.memberDailyLimit===50;
  setDailyLimit(config.dailyLimit??GUEST_TEXT_DAILY_TURNS);
  setMemberQuota(false);
  setRemaining(typeof config.remaining==="number"?config.remaining:null);
  if(!enabled.current)return false;
  const account=await fetch("/api/auth/session",{credentials:"same-origin",cache:"no-store",signal});
  if(!account.ok)throw Error("Account unavailable");
  const data=await account.json();
  if(signal.aborted)return false;
  if(data?.user?.id){
   setMemberQuota(true);setDailyLimit(config.memberDailyLimit!);
   const q=data.textTrial;
   const left=q?.limit===config.memberDailyLimit&&Number.isInteger(q.used)?Math.max(0,q.limit-q.used):null;
   setRemaining(left);return left===0;
  }
  return config.remaining===0;
 }
 async function textAuthTicket(){
  if(!enabled.current)return "";
  const response=await fetch("/api/auth/guest-ticket",{method:"POST",credentials:"same-origin",cache:"no-store"});
  if(response.status===401){setMemberQuota(false);return ""}
  if(!response.ok)throw guestTextWorkerError("TEMP_UNAVAILABLE",response.status);
  const proof=await response.json() as {ticket?:string};
  if(!proof.ticket)throw guestTextWorkerError("TEMP_UNAVAILABLE",503);
  setMemberQuota(true);
  return proof.ticket;
 }
 return {remaining,setRemaining,dailyLimit,setDailyLimit,memberQuota,memberQuotaEnabled:enabled.current,applyConfig,textAuthTicket};
}
