/** Homepage share links are treated as untrusted routing hints, never copy or prompts. */
export const HOME_FRIEND_IDS=Object.freeze(["zoe","noah","iris","max","yuna","felix","luna","theo","isla","hugo","ada","finn","maya","oscar","bella","ryan"]);
export const HOME_FRIEND_NAMES=Object.freeze(Object.fromEntries(HOME_FRIEND_IDS.map(id=>[id,id[0].toUpperCase()+id.slice(1)])));
const TABS=new Set(["chat","learn","fortune","play"]);
const GAMES=new Set(["1a2b","connect4","reversi"]);
const SHORT_ID=/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,95}$/;
export function readHomeDeepLink(search){
 const empty={tab:null,friend:null,game:null,short:null};
 if(typeof search!=="string")return empty;
 try{
  const params=new URLSearchParams(search);
  const rawTab=params.get("tab");
  const tab=TABS.has(rawTab)?rawTab:null;
  const rawShort=params.get("short");
  if(rawShort&&SHORT_ID.test(rawShort))return {tab:"chat",friend:null,game:null,short:rawShort};
  const rawFriend=params.get("friend");
  const rawGame=params.get("game");
  return {tab,friend:tab==="chat"&&HOME_FRIEND_IDS.includes(rawFriend)?rawFriend:null,
   game:tab==="play"&&GAMES.has(rawGame)?rawGame:null,short:null};
 }catch{return empty}
}
