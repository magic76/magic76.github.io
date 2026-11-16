/** Localized BYOK errors; the key is selected without changing retry handling. */
export function textChatByokMessage(category:string,type:string,t:(key:string)=>string){
 const key=category==="key"?"key":category==="quota"?"quota":category==="model"?"model"
  :/transcri|no text|no reply/i.test(type)?"noText"
  :/1006|WebSocket|socket|setup/i.test(type)?"socket":"service";
 return t("textChat.byok."+key);
}
