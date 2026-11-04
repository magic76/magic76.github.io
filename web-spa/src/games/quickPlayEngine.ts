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
 if(state.winner||side!==state.turn||!Number.isInteger(value)||value<state.low||value>state.high)return null;
 const hint:BombHint=value===state.secret?"correct":value<state.secret?"higher":"lower";
 return {...state,low:hint==="higher"?value+1:state.low,high:hint==="lower"?value-1:state.high,
  turn:side==="player"?"friend":"player",winner:hint==="correct"?side:null,
  history:[...state.history,{side,value,hint}]};
}
export function bombComputerGuess(state:BombState):number{
 return Math.floor((state.low+state.high)/2);
}
export type MemoryState={
 cards:number[];open:number[];matched:number[];seen:Record<number,number[]>;
 turn:QuickSide;playerPairs:number;friendPairs:number;moves:number;finished:boolean;
};
export function newMemory(pairs=6,random:()=>number=Math.random):MemoryState{
 if(!Number.isInteger(pairs)||pairs<2||pairs>12)throw Error("Invalid pair count");
 const cards=Array.from({length:pairs*2},(_,index)=>index%pairs);
 for(let i=cards.length-1;i>0;i--){
  const r=Math.max(0,Math.min(0.999999999,random()));
  const j=Math.floor(r*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];
 }
 return {cards,open:[],matched:[],seen:{},turn:"player",playerPairs:0,friendPairs:0,moves:0,finished:false};
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
  turn:state.turn==="player"?"friend":"player",
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
