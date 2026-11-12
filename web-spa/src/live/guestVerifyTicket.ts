/** Same-tab human verification only; not a session, grant or analytics identifier. */
const KEY="crew_guest_verify_ticket_v1";
export function readVerifyTicket(capable:boolean):string{
 if(!capable||typeof sessionStorage==="undefined")return "";
 try{
  const value=JSON.parse(sessionStorage.getItem(KEY)||"null");
  if(typeof value?.ticket==="string"&&/^[0-9a-f]{64}$/.test(value.ticket)
     &&Number.isFinite(value.expiresAt)&&value.expiresAt>Date.now()+5000)return value.ticket;
 }catch{}
 clearVerifyTicket();return "";
}
export function saveVerifyTicket(data:{verifyTicket?:unknown;verifyTicketExpiresAt?:unknown}):void{
 if(typeof data.verifyTicket!=="string"||!/^[0-9a-f]{64}$/.test(data.verifyTicket)
    ||typeof data.verifyTicketExpiresAt!=="number"||!Number.isFinite(data.verifyTicketExpiresAt)
    ||data.verifyTicketExpiresAt<=Date.now()+5000||data.verifyTicketExpiresAt>Date.now()+30*60*1000+5000)return;
 try{sessionStorage.setItem(KEY,JSON.stringify({ticket:data.verifyTicket,expiresAt:data.verifyTicketExpiresAt}))}catch{}
}
export function clearVerifyTicket():void{try{sessionStorage.removeItem(KEY)}catch{}}
export const isVerifyTicketRejected=(code:unknown):boolean=>
 code==="VERIFY_REQUIRED"||code==="VERIFY_FAILED"||code==="VERIFY_TICKET_INVALID"||code==="VERIFY_TICKET_EXPIRED";
