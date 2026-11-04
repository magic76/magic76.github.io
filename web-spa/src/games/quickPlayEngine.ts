/** Deterministic, offline rules for the two fast Crew Play games. */
export type QuickSide="player"|"friend";
export type BombHint="higher"|"lower"|"correct";
export type BombGuess={side:QuickSide;value:number;hint:BombHint};
export type BombState={
 secret:number;low:number;high:number;turn:QuickSide;winner:QuickSide|null;history:BombGuess[];
};
export function newBomb(random:()=>number=Math.random):BombState{
 const roll=Math.max(0,Math.min(0.999999999,random()));
 return {secret:1+Math.floor(roll*100),low:1,high:100,turn:"player",winner:null,history:[]};
}
export function bombGuess(state:BombState,value:number,side:QuickSide):BombState|null{
 // Host mode: only the player guesses. The Crew friend narrates verified outcomes.
 if(state.winner||side!=="player"||state.turn!=="player"||!Number.isInteger(value)||value<state.low||value>state.high)return null;
 const hint:BombHint=value===state.secret?"correct":value<state.secret?"higher":"lower";
 return {...state,low:hint==="higher"?value+1:state.low,high:hint==="lower"?value-1:state.high,
  turn:"player",winner:hint==="correct"?"player":null,
  history:[...state.history,{side,value,hint}]};
}
/** Midpoint for positioning the wheel, not an AI opponent move. */
export function bombComputerGuess(state:BombState):number{
 return Math.floor((state.low+state.high)/2);
}
export type MemoryState={
 cards:number[];open:number[];matched:number[];seen:Record<number,number[]>;
 turn:QuickSide;playerPairs:number;friendPairs:number;moves:number;finished:boolean;lastMatch:boolean|null;lastSide:QuickSide|null;
};
export function newMemory(pairs=6,random:()=>number=Math.random):MemoryState{
 if(!Number.isInteger(pairs)||pairs<2||pairs>12)throw Error("Invalid pair count");
 const cards=Array.from({length:pairs*2},(_,index)=>index%pairs);
 for(let i=cards.length-1;i>0;i--){
  const r=Math.max(0,Math.min(0.999999999,random()));
  const j=Math.floor(r*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];
 }
 return {cards,open:[],matched:[],seen:{},turn:"player",playerPairs:0,friendPairs:0,moves:0,finished:false,lastMatch:null,lastSide:null};
}
export function flipMemory(state:MemoryState,index:number):MemoryState|null{
 if(state.finished||state.open.length>=2||!Number.isInteger(index)||index<0||index>=state.cards.length||
  state.matched.includes(index)||state.open.includes(index))return null;
 const value=state.cards[index];
 const seen={...state.seen,[value]:[...new Set([...(state.seen[value]||[]),index])]};
 return {...state,open:[...state.open,index],seen};
}
export function resolveMemory(state:MemoryState):MemoryState|null{
 if(state.open.length!==2||state.finished)return null;
 const match=state.cards[state.open[0]]===state.cards[state.open[1]];
 const matched=match?[...state.matched,...state.open]:state.matched;
 return {...state,open:[],matched,moves:state.moves+1,
  playerPairs:state.playerPairs+(match&&state.turn==="player"?1:0),
  friendPairs:state.friendPairs+(match&&state.turn==="friend"?1:0),
  // A successful match earns another turn for the same player, including the Crew friend.
  turn:match?state.turn:state.turn==="player"?"friend":"player",lastMatch:match,lastSide:state.turn,
  finished:matched.length===state.cards.length};
}
/** The friend sees only previously revealed faces; hidden cards are never inspected for a strategic choice. */
export function memoryComputerPick(state:MemoryState,random:()=>number=Math.random):number|null{
 if(state.finished||state.turn!=="friend"||state.open.length>=2)return null;
 const available=state.cards.map((_,i)=>i).filter(i=>!state.matched.includes(i)&&!state.open.includes(i));
 if(!available.length)return null;
 if(state.open.length===1){
  const value=state.cards[state.open[0]];
  const known=(state.seen[value]||[]).find(i=>available.includes(i));
  if(known!==undefined)return known;
 }else{
  for(const indices of Object.values(state.seen)){
   const known=indices.filter(i=>available.includes(i));
   if(known.length>=2)return known[0];
  }
 }
 const roll=Math.max(0,Math.min(0.999999999,random()));
 return available[Math.floor(roll*available.length)];
}

/** Voice actions are parsed locally; unrelated conversation never changes the board. */
const zhDigit:Record<string,number>={"零":0,"〇":0,"一":1,"二":2,"兩":2,"两":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9};
const enSmall:Record<string,number>={
 zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,
 ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
 seventeen:17,eighteen:18,nineteen:19
};
const enTens:Record<string,number>={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
function spokenValue(token:string):number|null{
 const value=token.trim().toLowerCase().replace(/-/g," ").replace(/\s+/g," ");
 if(/^\d{1,3}$/.test(value))return Number(value);
 if(value==="one hundred")return 100;
 const en=value.split(" ");
 if(en.length===1&&enSmall[value]!==undefined)return enSmall[value];
 if(en.length===1&&enTens[value]!==undefined)return enTens[value];
 if(en.length===2&&enTens[en[0]]!==undefined&&enSmall[en[1]]>=1&&enSmall[en[1]]<=9)return enTens[en[0]]+enSmall[en[1]];
 if(value==="一百"||value==="壹佰")return 100;
 if(/^[零〇一二兩两三四五六七八九]$/.test(value))return zhDigit[value];
 const zh=value.match(/^([一二兩两三四五六七八九]?)[十]([零〇一二兩两三四五六七八九]?)$/);
 if(zh)return (zh[1]?zhDigit[zh[1]]:1)*10+(zh[2]?zhDigit[zh[2]]:0);
 return null;
}
function actionNumber(source:string,pattern:RegExp,max:number):number|null{
 const cleaned=source.normalize("NFKC").trim().replace(/[。！!？，,?.]+$/u,"");
 const standalone=cleaned.match(/^(\d{1,3}|[零〇一二兩两三四五六七八九十百]+|[a-z]+(?:[ -][a-z]+){0,2})$/iu);
 const first=standalone?spokenValue(standalone[1]):null;
 if(first!==null&&first>=1&&first<=max)return first;
 const action=cleaned.match(pattern);
 if(!action)return null;
 const value=spokenValue(action[1]);
 return value!==null&&value>=1&&value<=max?value:null;
}
const numberPhrase="(\\d{1,3}|[零〇一二兩两三四五六七八九十百]+|[a-z]+(?:[ -][a-z]+){0,2})";
export function parseBombSpeech(text:string):number|null{
 return actionNumber(text,new RegExp("(?:我猜|猜|我選|選|我想猜|guess|pick|choose|try|number|i think it is)\\s*(?:數字|number|是|第)?\\s*"+numberPhrase,"iu"),100);
}
export function parseMemorySpeech(text:string):number|null{
 return actionNumber(text,new RegExp("(?:翻開?|打開|選|我選|第|flip|turn over|open|choose|pick|card)\\s*(?:第|卡片|牌|card|number|no\\.?)?\\s*"+numberPhrase+"(?:\\s*張|\\s*號|\\s*card)?","iu"),24);
}
