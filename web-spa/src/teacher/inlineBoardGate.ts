import {BOARD_FUNCTION,validateBoardPatch,type BoardCard} from "./boardProtocol";

// Rollback switch: disabling removes the optional tool and all inline UI.
// The standalone board and Live transport remain unchanged.
export const INLINE_TEACHER_BOARD_ENABLED=true;
// The user owns the mode; tools remain registered for the lifetime of the socket.
export const INLINE_BOARD_POLICY="\n"+[
 "[WHITEBOARD TEACHING MODE — initially OFF. The app sends explicit mode controls.]",
 "OFF: converse naturally and teach aloud when asked. Never call update_teaching_board or focus_teaching_board, even if the learner asks a grammar question. The user controls the whiteboard button.",
 "ON: act as a visual tutor. CALL update_teaching_board for substantive rules, pronunciation, comparisons, examples or quizzes, even when the learner did not say whiteboard. Use one concise card per turn. Keep speaking and use the actual learning language. Skip the tool for greetings or ordinary small talk.",
 "When discussing a particular visible row, call focus_teaching_board with its cardId and zero-based item index. Do not change quiz answers, course stage or learner navigation. In a guided lesson, explain the app's card instead of generating replacements.",
 "Respect the latest app mode instruction. If rejected, continue speaking, never retry in the same turn or claim the screen rendered."
].join("\n");
export const INLINE_FOCUS_FUNCTION="focus_teaching_board";
export const INLINE_BOARD_COOLDOWN_MS=10000;
export function inlineModePrompt(on:boolean){return on
 ?"[APP WHITEBOARD MODE ON] Teach visually from now on. For the current learning topic, call update_teaching_board once with a concise useful card before or during the explanation; if no topic exists, ask what the learner wants to study. Use focus_teaching_board to point at visible items. Do not merely describe the tool."
 :"[APP WHITEBOARD MODE OFF] Pause any guided lesson. Continue ordinary natural voice conversation. Do not call whiteboard tools or refer to the hidden card. Wait until the app explicitly enables whiteboard mode again."}
export function inlineFocusIndex(card:BoardCard|null,args:unknown):number|null{
 if(!card||!args||typeof args!=="object")return null;
 const value=args as {cardId?:unknown;index?:unknown};
 const count=["comparison","example","vocabulary","correction","dialogue","explanation"].includes(card.type)?card.pairs.length:["steps","timeline"].includes(card.type)?card.points.length:0;
 return value.cardId===card.id&&typeof value.index==="number"&&Number.isInteger(value.index)&&value.index>=0&&value.index<count?value.index:null;
}
// Keep the Live declaration small: no director, speaking-task or timeline fields.
const inlineString={type:"STRING"};
export const INLINE_BOARD_TOOLS=[{functionDeclarations:[{
 name:BOARD_FUNCTION,
 description:"Only in user-enabled whiteboard mode, call for substantive grammar rules, pronunciation patterns, differences between expressions, quizzes, and explicit board requests. Give one concise teaching card: comparison, example, vocabulary or correction with pairs (source and target), or quiz with questions. The app decides whether to display it; continue speaking.",
 parameters:{type:"OBJECT",properties:{
  action:{type:"STRING",enum:["upsert","replace"]},
  cards:{type:"ARRAY",items:{type:"OBJECT",properties:{
   id:inlineString,title:inlineString,type:{type:"STRING",enum:["comparison","example","vocabulary","correction","quiz"]},body:inlineString,
   pairs:{type:"ARRAY",items:{type:"OBJECT",properties:{source:inlineString,target:inlineString,pronunciation:inlineString},required:["source","target"]}},
   questions:{type:"ARRAY",items:{type:"OBJECT",properties:{question:inlineString,options:{type:"ARRAY",items:inlineString},answerIndex:{type:"INTEGER"},explanation:inlineString},required:["question","options","answerIndex"]}}
  },required:["id","title","type"]}}
 },required:["action","cards"]}
},{name:INLINE_FOCUS_FUNCTION,description:"Point at an existing visible teaching card item while explaining. Only in whiteboard mode. Index starts at zero. Never change the lesson stage or quiz.",parameters:{type:"OBJECT",properties:{cardId:inlineString,index:{type:"INTEGER"}},required:["cardId","index"]}}]}];
export type InlineGate={turn:number;lastShown:number;dismissedUntil:number;seen:Set<string>;requested:boolean;topic:string;topicAt:number;outcome:"idle"|"shown"|"missing"|"dismissed";lastOutput:string;lastOutputAt:number;input:string;learnerStarted:boolean;shownThisTurn:boolean;toolCalls:number;validCards:number;accepted:number;fallbacks:number;completedTurns:number;reasons:Record<string,number>;lastReason:string;events:{event:string;at:number;reason?:string}[]};
export const newInlineGate=():InlineGate=>({turn:0,lastShown:-Infinity,dismissedUntil:0,seen:new Set(),requested:false,topic:"",topicAt:0,outcome:"idle",lastOutput:"",lastOutputAt:0,input:"",learnerStarted:false,shownThisTurn:false,toolCalls:0,validCards:0,accepted:0,fallbacks:0,completedTurns:0,reasons:{},lastReason:"",events:[]});
export function recordInlineEvent(g:InlineGate,event:string,reason?:string,now=Date.now()){
 g.events.push({event,at:now,...(reason?{reason}:{})});if(g.events.length>40)g.events.shift();
 if(reason){g.lastReason=reason;g.reasons[reason]=(g.reasons[reason]||0)+1}
}
const declinesBoard=(input:string)=>/(?:不要|不用|別|停止|關閉|收起|不需要).{0,12}(?:白板|比較表|對照表|圖|測驗)|(?:no|without|stop|close|hide|don[’\x27]t|do not).{0,24}(?:whiteboard|chart|diagram|quiz)/i.test(input);
export const explicitBoardRequest=(input:string)=>!declinesBoard(input)&&/(?:請|可以|幫我|我要|想看|能不能|打開|使用|顯示|拿出).{0,12}白板|白板[?？]?$|比較表|對照表|用圖|畫出|視覺化|考我|測驗我|(?:show|open|use|bring up).{0,24}whiteboard|show me (?:a |the )?(?:chart|table|diagram|board)|(?:quiz|test) me/i.test(input);
export const teachingCue=(input:string)=>/差別|差異|區別|怎麼區分|文法|句型|句子結構|發音規則|幾種發音|結尾.{0,8}(?:發音|念法)|(?:還是|仍然|真的)不懂|difference between|compare .{1,80}(?: and | with | vs)|grammar (?:rule|pattern)|sentence structure|pronunciation (?:rule|pattern)|(?:ed|s) ending|still (?:do not|don't) understand/i.test(input);
export const edTopic=(input:string)=>/(?:\b-?ed\b.{0,35}(?:發音|念法|讀音|字尾|結尾|ending|pronunci|sound)|(?:發音|念法|字尾|結尾|pronunci\w*|sound\w*).{0,35}\b-?ed\b)/i.test(input);
function meaningful(card:BoardCard){
 const pairs=card.pairs.filter(p=>p.source&&p.target&&p.source.toLowerCase()!==p.target.toLowerCase());
 if(card.type==="quiz")return card.questions.length>0&&card.questions.every(q=>new Set(q.options.map(o=>o.toLowerCase())).size===q.options.length);
 if(card.type==="comparison"||card.type==="example")return new Set(pairs.map(p=>p.source.toLowerCase())).size>=2;
 if(card.type==="vocabulary")return pairs.length>=2;
 if(card.type==="correction")return pairs.length>=1;
 if(card.type==="explanation")return card.body.trim().length>=60;
 return false;
}
const retryRequest=(g:InlineGate,input:string,now:number)=>now-Math.max(g.topicAt,g.lastOutputAt)<120000&&Boolean(g.topic||g.lastOutput)&&/(?:沒看到|沒有看到|看不到|沒有出現|沒出現|didn.t see|can.t see|not showing|did not appear)/i.test(input);
export function observeInlineInput(g:InlineGate,input:string){
 if(input.trim()){g.learnerStarted=true;g.input=input}
}
function manualRequest(g:InlineGate,input:string,now:number){return g.requested||explicitBoardRequest(input)||retryRequest(g,input,now)}
function blocked(g:InlineGate,manual:boolean,auto:boolean,now:number,input:string){
 if(!auto)return "mode-off";
 if(declinesBoard(input))return "learner-opt-out";
 if(g.shownThisTurn)return "already-shown-this-turn";
 if(!manual&&!g.learnerStarted&&g.completedTurns===0)return "opening";
 if(!manual&&now-g.lastShown<INLINE_BOARD_COOLDOWN_MS)return "cooldown";
 return "";
}
function accept(g:InlineGate,card:BoardCard,manual:boolean,source:"tool"|"fallback",now:number){
 const signature=JSON.stringify([card.type,card.title.toLowerCase(),card.body,card.pairs,card.questions]);
 if(!manual&&g.seen.has(signature))return "duplicate";
 if(g.seen.size>=100)g.seen.clear();
 g.seen.add(signature);g.lastShown=now;g.shownThisTurn=true;g.outcome="shown";g.accepted++;if(source==="fallback")g.fallbacks++;
 recordInlineEvent(g,source+"-accepted",undefined,now);return "";
}
export function proposeInlineBoard(g:InlineGate,call:{name:string;args?:unknown},auto=true,now=Date.now()):{ok:boolean;error?:string;card?:BoardCard}{
 if(call.name!==BOARD_FUNCTION)return {ok:false,error:"not-handled"};
 g.toolCalls++;recordInlineEvent(g,"tool-call",undefined,now);
 const reject=(reason:string)=>{recordInlineEvent(g,"tool-rejected",reason,now);return {ok:false,error:reason}};
 const patch=validateBoardPatch(call.args);
 const raw=patch&&patch.action!=="remove"?patch.cards.find(c=>c.type!=="explanation"&&meaningful(c)):undefined;
 if(!raw)return reject("invalid-or-low-value-card");
 const card={...raw,body:raw.body.slice(0,240),pairs:raw.pairs.slice(0,4),questions:raw.questions.slice(0,3),points:[]};
 if(!meaningful(card))return reject("invalid-truncated-card");
 g.validCards++;
 const manual=manualRequest(g,g.input,now),reason=blocked(g,manual,auto,now,g.input)||accept(g,card,manual,"tool",now);
 if(reason)return reject(reason);
 return {ok:true,card};
}
export function finishInlineTurn(g:InlineGate,input:string,valid:boolean,auto:boolean,now=Date.now(),backup?:(topic:string,output:string,manual:boolean,previousOutput:string)=>BoardCard|null,output=""):BoardCard|null{
 observeInlineInput(g,input);const actual=input.trim()?input:g.input;
 const manual=manualRequest(g,actual,now),retry=retryRequest(g,actual,now);
 const previousOutput=now-g.lastOutputAt<120000?g.lastOutput:"";
 if(actual.trim()&&!retry&&!declinesBoard(actual)){g.topic=actual;g.topicAt=now}
 const topic=retry||g.requested?g.topic:actual;
 if(valid&&output.trim()&&(g.learnerStarted||manual)){g.lastOutput=output;g.lastOutputAt=now}
 recordInlineEvent(g,"turn-complete",undefined,now);
 g.outcome=g.shownThisTurn?"shown":"idle";
 try{
  if(declinesBoard(actual)){dismissInlineBoard(g,now);return null}
  if(g.shownThisTurn)return null;
  if(!valid){if(manual){g.outcome="missing";recordInlineEvent(g,"fallback-rejected","invalid-turn",now)}return null}
  const reason=blocked(g,manual,auto,now,actual);
  if(reason){recordInlineEvent(g,"fallback-rejected",reason,now);return null}
  const card=backup?.(topic,output,manual,previousOutput);
  if(!card||!meaningful(card)||(!manual&&card.type==="explanation")){
   if(manual)g.outcome="missing";
   recordInlineEvent(g,"fallback-rejected","no-matching-card",now);return null;
  }
  const rejection=accept(g,card,manual,"fallback",now);
  if(rejection){recordInlineEvent(g,"fallback-rejected",rejection,now);return null}
  return card;
 }finally{g.requested=false;g.input="";g.shownThisTurn=false;g.turn++;g.completedTurns++}
}
export function dismissInlineBoard(g:InlineGate,now=Date.now()){
 g.requested=false;g.dismissedUntil=now;g.outcome="dismissed";recordInlineEvent(g,"dismiss",undefined,now);
}
