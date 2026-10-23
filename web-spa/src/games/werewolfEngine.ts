/** Offline-authoritative prototype rules for the six-seat Crew Werewolf game.
 * No hidden roles are ever included in the Live narrator context or NPC prompts.
 * This is a client-side single-player prototype, not a secure multiplayer server.
 */
export type WolfRole="wolf"|"seer"|"witch"|"villager";
export type WolfPhase="night"|"day"|"vote"|"finished";
export type WolfLanguage="zh"|"en";
export type WolfPlayer={id:string;name:string;role:WolfRole;alive:boolean;human:boolean};
export type WolfEntry={speaker:string;text:string;day:number;kind:"system"|"speech"|"vote"};
export type WolfAction={kind:"kill"|"check"|"save"|"poison"|"skip";target?:string};
export type WolfGame={
 players:WolfPlayer[];phase:WolfPhase;day:number;
 entries:WolfEntry[];privateNotes:string[];seerFindings:Record<string,string[]>;
 healUsed:boolean;poisonUsed:boolean;pendingKill:string|null;
 lastDeaths:string[];winner:"village"|"wolves"|null;
};
const seats=["you","zoe","noah","iris","max","yuna"] as const;
const names=["You","Zoe","Noah","Iris","Max","Yuna"];
const roles:WolfRole[]=["wolf","seer","witch","villager","villager","villager"];
const choose=<T,>(items:T[],rng:()=>number)=>items[Math.min(items.length-1,Math.floor(rng()*items.length))];
const living=(game:WolfGame)=>game.players.filter(p=>p.alive);
const player=(game:WolfGame,id:string)=>game.players.find(p=>p.id===id);
export function humanRole(game:WolfGame){return game.players[0].role}
export function livingTargets(game:WolfGame,includeHuman=true){
 return living(game).filter(p=>includeHuman||!p.human);
}
function safeName(game:WolfGame,id:string){return player(game,id)?.name||id}
function chooseKill(game:WolfGame,rng:()=>number){
 const available=living(game).filter(p=>p.role!=="wolf");
 return available.length?choose(available,rng).id:null;
}
function winState(game:WolfGame):WolfGame{
 const count=living(game).filter(p=>p.role==="wolf").length;
 const total=living(game).length;
 if(count===0||count*2>=total){
  return {...game,phase:"finished",winner:count===0?"village":"wolves",
   entries:[...game.entries,{speaker:"system",day:game.day,kind:"system",text:count===0?"Village wins! All wolves are eliminated.":"Wolves win! They control half of the surviving votes."}]};
 }
 return game;
}
export function makeWolfGame(rng:()=>number=Math.random,chosenRole:WolfRole|"random"="random"):WolfGame{
 const shuffled=[...roles].sort(()=>rng()-.5);
 // Avoid sort's implementation-dependent RNG consumption and allow role previews in setup.
 for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
 if(chosenRole!=="random"){
  const index=shuffled.indexOf(chosenRole);[shuffled[0],shuffled[index]]=[shuffled[index],shuffled[0]];
 }
 const players=seats.map((id,i)=>({id,name:names[i],role:shuffled[i],alive:true,human:i===0}));
 const game:WolfGame={players,phase:"night",day:1,entries:[
  {speaker:"system",day:1,kind:"system",text:"Night 1 begins. Close your eyes and choose your secret action."}
 ],privateNotes:[],seerFindings:{},healUsed:false,poisonUsed:false,pendingKill:null,lastDeaths:[],winner:null};
 if(humanRole(game)!=="wolf")game.pendingKill=chooseKill(game,rng);
 return game;
}
export function expectedNightActions(game:WolfGame):WolfAction["kind"][]{
 if(game.phase!=="night")return [];
 if(!game.players[0].alive)return ["skip"];
 switch(humanRole(game)){
 case "wolf":return ["kill"];
 case "seer":return ["check"];
 case "witch":return [...(!game.healUsed&&game.pendingKill?["save" as const]:[]),...(!game.poisonUsed?["poison" as const]:[]),"skip"];
 default:return ["skip"];
 }
}
export function takeNightAction(game:WolfGame,action:WolfAction,rng:()=>number=Math.random):WolfGame{
 if(game.phase!=="night")throw Error("Not night");
 if(!expectedNightActions(game).includes(action.kind))throw Error("Action not allowed");
 const target=action.target?player(game,action.target):undefined;
 if(action.kind==="kill"||action.kind==="check"||action.kind==="poison"){
  if(!target||!target.alive||target.human)throw Error("Choose a living AI player");
 }
 let pendingKill=game.pendingKill;
 let healUsed=game.healUsed,poisonUsed=game.poisonUsed;
 const notes=[...game.privateNotes];
 const findings=Object.fromEntries(Object.entries(game.seerFindings).map(([id,ids])=>[id,[...ids]]));
 let poisoned:string|null=null;
 if(action.kind==="kill")pendingKill=target!.id;
 if(action.kind==="check"){
  notes.push(target!.name+" is "+(target!.role==="wolf"?"a wolf.":"not a wolf."));
  (findings.you??=[]).push(target!.id+":"+(target!.role==="wolf"?"wolf":"human"));
 }
 if(action.kind==="save"){healUsed=true;pendingKill=null;notes.push("You saved tonight's target.");}
 if(action.kind==="poison"){poisonUsed=true;poisoned=target!.id;notes.push("You used your poison.");}
 // Each AI action uses ONLY its own role and past inspections, not other bot secrets.
 const aiSeer=living(game).find(p=>p.role==="seer"&&!p.human);
 if(aiSeer){
  const checked=new Set((findings[aiSeer.id]||[]).map(k=>k.split(":")[0]));
  const candidates=living(game).filter(p=>p.id!==aiSeer.id&&!checked.has(p.id));
  if(candidates.length){const inspected=choose(candidates,rng);(findings[aiSeer.id]??=[]).push(inspected.id+":"+(inspected.role==="wolf"?"wolf":"human"));}
 }
 const aiWitch=living(game).find(p=>p.role==="witch"&&!p.human);
 if(aiWitch&&pendingKill&&!healUsed){
  // The AI witch can save herself, or occasionally rescue a target.
  if(pendingKill===aiWitch.id||rng()<.23){pendingKill=null;healUsed=true;}
 }
 const deaths=[pendingKill,poisoned].filter((id):id is string=>Boolean(id));
 const nextPlayers=game.players.map(p=>deaths.includes(p.id)?{...p,alive:false}:p);
 const killedNames=deaths.map(id=>safeName(game,id));
 let next:WolfGame={...game,players:nextPlayers,privateNotes:notes,seerFindings:findings,
  pendingKill:null,healUsed,poisonUsed,lastDeaths:deaths,phase:"day",entries:[
   ...game.entries,{speaker:"system",day:game.day,kind:"system",
    text:killedNames.length?"Day "+game.day+": "+killedNames.join(", ")+" did not survive the night.":"Day "+game.day+": everyone survived the night."}
  ]};
 next=winState(next);
 return next;
}
export function recordSpeech(game:WolfGame,speaker:string,speech:string):WolfGame{
 if(game.phase!=="day")throw Error("Discussion is closed");
 const p=player(game,speaker);
 if(!p||!p.alive)throw Error("Speaker is not alive");
 const text=speech.replace(/[\u0000-\u001f]/g," ").trim().slice(0,260);
 if(!text)throw Error("Empty speech");
 return {...game,entries:[...game.entries,{speaker,day:game.day,kind:"speech",text}]};
}
export function startWolfVote(game:WolfGame):WolfGame{
 if(game.phase!=="day")throw Error("Cannot start vote");
 return {...game,phase:"vote",entries:[...game.entries,{speaker:"system",day:game.day,kind:"system",text:"Voting is open. Choose one suspect or abstain."}]};
}
/** Private seer intel is used only by the seer who found it. Never pass this state to the Live host. */
export function botSuspicion(game:WolfGame,botId:string,targetId:string){
 const bot=player(game,botId)!;
 const target=player(game,targetId)!;
 if(botId===targetId||!target.alive)return -999;
 let score=.5;
 const intel=(game.seerFindings[botId]||[]).find(f=>f.startsWith(targetId+":"));
 if(intel)score+=intel.endsWith(":wolf")?10:-8;
 // Bots can react to PUBLIC suspicion but cannot access target.role unless they are the wolf.
 const last=game.entries.filter(e=>e.kind==="speech"&&e.day===game.day).slice(-12);
 for(const e of last){
  const from=player(game,e.speaker);
  if(e.text.toLowerCase().includes(target.name.toLowerCase())||e.text.includes(target.id))score+=from?.human?1.9:.5;
 }
 if(bot.role==="wolf"&&target.role==="wolf")return -999;
 return score;
}
export function chooseBotVote(game:WolfGame,botId:string,rng:()=>number=Math.random){
 const choices=living(game).filter(p=>p.id!==botId);
 return choices.sort((a,b)=>(botSuspicion(game,botId,b.id)+rng()*.85)-(botSuspicion(game,botId,a.id)+rng()*.85))[0]?.id||"";
}
export function castWolfVote(game:WolfGame,voteId:string|null,rng:()=>number=Math.random):WolfGame{
 if(game.phase!=="vote")throw Error("Voting closed");
 if(voteId!==null&&!living(game).some(p=>p.id===voteId))throw Error("Target must be alive");
 if(!game.players[0].alive&&voteId!==null)throw Error("Eliminated player cannot vote");
 const votes:Record<string,string|null>={};
 if(game.players[0].alive)votes.you=voteId;
 const logs:WolfEntry[]=[];
 for(const p of living(game).filter(p=>!p.human)){
  const pick=chooseBotVote(game,p.id,rng);
  votes[p.id]=pick;logs.push({speaker:p.id,day:game.day,kind:"vote",text:pick?"Voted for "+safeName(game,pick):"Abstained"});
 }
 const counts:Record<string,number>={};
 for(const id of Object.values(votes)){if(id)counts[id]=(counts[id]||0)+1}
 if(voteId)logs.unshift({speaker:"you",day:game.day,kind:"vote",text:"Voted for "+safeName(game,voteId)});
 const highest=Math.max(0,...Object.values(counts));
 const winners=Object.keys(counts).filter(id=>counts[id]===highest);
 const eliminated=highest>0&&winners.length===1?winners[0]:null;
 const players=game.players.map(p=>p.id===eliminated?{...p,alive:false}:p);
 let next:WolfGame={...game,players,entries:[...game.entries,...logs,{speaker:"system",day:game.day,kind:"system",
  text:eliminated?safeName(game,eliminated)+" was eliminated by vote.": "The vote was tied. No one was eliminated."}]};
 next=winState(next);
 if(next.phase==="finished")return next;
 const day=game.day+1;
 next={...next,phase:"night",day,pendingKill:null,entries:[...next.entries,{speaker:"system",day,kind:"system",text:"Night "+day+" begins."}]};
 if(next.players[0].role!=="wolf")next.pendingKill=chooseKill(next,rng);
 return next;
}
/** Projection for the Live voice agent: no hidden roles, no NPC private memories. */
export function publicWolfView(game:WolfGame){
 return {phase:game.phase,day:game.day,players:game.players.map(p=>({id:p.id,name:p.name,alive:p.alive})),
  humanRole:humanRole(game),humanAlive:game.players[0].alive,
  notes:game.privateNotes.slice(-3),events:game.entries.slice(-12),winner:game.winner,
  allowedNightActions:expectedNightActions(game)};
}
/** Each bot receives exactly its own secrets, not all players' hidden role assignments. */
export function npcWolfView(game:WolfGame,npcId:string){
 const npc=player(game,npcId);
 if(!npc||npc.human)throw Error("Unknown NPC");
 return {role:npc.role,known:(game.seerFindings[npcId]||[]).map(s=>s),
  public:game.entries.slice(-14),
  alive:game.players.filter(p=>p.alive).map(p=>({id:p.id,name:p.name})),
  day:game.day};
}
export function fallbackWolfReply(game:WolfGame,npcId:string,zh:boolean):string{
 const candidates=living(game).filter(p=>p.id!==npcId);
 const suspect=candidates.sort((a,b)=>botSuspicion(game,npcId,b.id)-botSuspicion(game,npcId,a.id))[0];
 const npc=player(game,npcId)!;
 const known=(game.seerFindings[npcId]||[]).find(s=>s.endsWith(":wolf"));
 if(npc.role==="seer"&&known){const id=known.split(":")[0];return zh?"我查驗到 "+safeName(game,id)+" 是狼人，我願意為這個資訊負責。":"I checked "+safeName(game,id)+". They're a wolf. I stand by that.";}
 const lines=zh?[
  "先別急著投，我想聽聽其他人的理由。",
  "我對 "+(suspect?.name||"某個人")+" 有點懷疑，你們怎麼看？",
  "光憑直覺還不夠，我想看誰的說法有矛盾。",
  "昨晚的結果有點奇怪，可能有人在帶風向。",
  "我還沒決定投誰，先把線索說清楚。"
 ]:[
  "Let's hear everyone's reasoning before voting.",
  "I'm suspicious of "+(suspect?.name||"someone")+". What do you think?",
  "I want evidence, not just a gut feeling.",
  "Something about last night doesn't add up.",
  "I'm not ready to vote without hearing more."
 ];
 return lines[Math.max(0,seats.indexOf(npcId as typeof seats[number]))%lines.length];
}
