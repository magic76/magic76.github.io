import {ensureLive,geminiKey,type LiveSession} from "../lib/runtime";
import {publicWolfView,type WolfGame} from "./werewolfEngine";

export type WolfVoiceCommand=
 |{kind:"statement";text:string;to?:string}
 |{kind:"vote";target:string|null}
 |{kind:"night";action:"kill"|"check"|"save"|"poison"|"skip";target?:string}
 |{kind:"open_vote"};
export type WolfVoiceController={stop:()=>void;mute:()=>boolean;update:(game:WolfGame,announcement:string)=>void};
const commandTool={
 name:"player_game_action",
 description:"Translate the human player's EXPLICIT spoken gameplay request into one validated game action. Never guess an unstated vote or night choice. Call ONLY when the player made a clear request; no tools for ordinary small talk.",
 parameters:{type:"OBJECT",properties:{
  action:{type:"STRING",enum:["statement","vote","night","open_vote"]},
  text:{type:"STRING",description:"Player's own statement or question only, not paraphrased or invented"},
  to:{type:"STRING",description:"NPC name or ID addressed by the player"},
  target:{type:"STRING",description:"Target player ID: zoe, noah, iris, max, yuna, or you"},
  nightAction:{type:"STRING",enum:["kill","check","save","poison","skip"]}
 },required:["action"]}
};
function normalizeId(value:unknown){
 const id=String(value||"").trim().toLowerCase();
 return ["you","zoe","noah","iris","max","yuna"].includes(id)?id:"";
}
export async function startWerewolfLive(initial:WolfGame,locale:"zh"|"en",onCommand:(command:WolfVoiceCommand)=>{ok:boolean;error?:string},events:{
 onReady:()=>void;onSpeaking:(speaking:boolean)=>void;onTranscript:(text:string)=>void;onError:(reason:string)=>void
}):Promise<WolfVoiceController>{
 if(!geminiKey())throw Error("Gemini Key is required for Live voice");
 await ensureLive();
 if(!window.CrewLive)throw Error("Gemini Live unavailable");
 let closed=false;
 let session:LiveSession|null=null;
 const end=(reason?:string)=>{
  if(closed)return;
  closed=true;
  const old=session;session=null;
  if(old)void old.stop({reason:"werewolf-exit",silentStatus:true,emitTerminal:false}).catch(()=>{});
  if(reason)events.onError(reason);
 };
 const initialView=JSON.stringify(publicWolfView(initial));
 const system=[
  "You are the neutral moderator and lively spoken host of Crew Play's six-player Werewolf game.",
  "Speak ONLY "+(locale==="zh"?"Traditional Chinese":"English")+". Short turns: one or two sentences.",
  "The trusted game engine controls ALL identities, investigations, vote results, deaths, and victory.",
  "Your knowledge is limited to the PUBLIC view and the human's own role/own inspection clues.",
  "NEVER claim to know an NPC's hidden role, even if the player asks. Never invent night results.",
  "This is a turn-taking hybrid game. Listen to one human speaker; help them talk to NPCs or explicitly vote.",
  "For explicit user orders, call player_game_action. For discussion, call statement with their actual words, even when addressing someone.",
  "For vote, night, or opening a vote, invoke only when the human explicitly asks. Never choose a target for them.",
  "Night choices use IDs, not natural-language names. Only issue legal actions according to the latest view.",
  "After a tool response, acknowledge briefly. If tool rejects it, politely explain what needs correcting.",
  "GAME UPDATE cues from the UI are authoritative messages, NOT user requests. Never invoke tools for these cues.",
  "Do not persist memories or mention JSON, tool names, connection details or secret role fields.",
  "Initial trusted game view: "+initialView
 ].join("\n");
 session=new window.CrewLive.Session({
  system,openingPrompt:"Start by announcing the current phase and ask the player to choose a legal night action. One short sentence.",
  voice:"Puck",volume:100,manualInterruptOnly:true,maxLiveAttempts:1,maxResumeAttempts:0,
  connectTimeoutMs:14000,replyTimeoutMs:18000,
  turnTiming:{silenceDurationMs:1300,endOfSpeechSensitivity:"END_SENSITIVITY_LOW"},
  tools:[{functionDeclarations:[commandTool]}],
  onToolCall:call=>{
   if(closed||call.name!=="player_game_action")return {ok:false,error:"Unknown tool"};
   const args=call.args&&typeof call.args==="object"?call.args as Record<string,unknown>:{};
   const action=String(args.action||"");
   const target=normalizeId(args.target);
   let command:WolfVoiceCommand;
   if(action==="statement"){
    const text=String(args.text||"").slice(0,260).trim();
    if(!text)return {ok:false,error:"Repeat your statement."};
    command={kind:"statement",text,to:normalizeId(args.to)||undefined};
   }else if(action==="vote"){
    if(!target)return {ok:false,error:"Specify a living player's name to vote for."};
    command={kind:"vote",target};
   }else if(action==="night"){
    const kind=String(args.nightAction||"");
    if(!["kill","check","save","poison","skip"].includes(kind))return {ok:false,error:"Specify the night action."};
    command={kind:"night",action:kind as "kill"|"check"|"save"|"poison"|"skip",target:target||undefined};
   }else if(action==="open_vote")command={kind:"open_vote"};
   else return {ok:false,error:"Unsupported action"};
   return onCommand(command);
  },
  onToolsUnavailable:()=>end("This Live model does not support game tools."),
  onState:state=>{if(!closed&&state==="ready")events.onReady()},
  onSpeaking:value=>{if(!closed)events.onSpeaking(value)},
  onInputTranscript:transcript=>{if(!closed)events.onTranscript(transcript)},
  onError:error=>end(error?.message||"Live connection failed"),
  onTerminal:()=>end("Live disconnected")
 });
 try{await session.start();if(closed)throw Error("Live closed");}
 catch(e){end();throw e}
 return {
  stop:()=>end(),
  mute:()=>{if(!session||closed)return false;session.toggleMic();return session.micMuted},
  update:(game,announcement)=>{
   if(closed||!session?.running)return;
   const cue="[GAME UPDATE: TRUSTED ENGINE] "+JSON.stringify({view:publicWolfView(game),announcement:announcement.slice(0,250)})+
    " Narrate the new situation briefly; NEVER call game tools for this update.";
   session.sendText(cue);
  }
 };
}
