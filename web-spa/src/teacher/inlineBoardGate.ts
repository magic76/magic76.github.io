import {BOARD_FUNCTION,BOARD_TOOLS,validateBoardPatch,type BoardCard} from "./boardProtocol";

// Rollback switch: disabling removes the optional tool and all inline UI.
// The standalone board and Live transport remain unchanged.
export const INLINE_TEACHER_BOARD_ENABLED=true;
export const INLINE_BOARD_POLICY="\n[OPTIONAL WHITEBOARD] Conversation comes first. Never propose a board for greetings, ordinary chat, simple corrections or the opening. Only propose a single concise comparison, pronunciation vocabulary, sentence example/correction, or quiz when the learner explicitly asks for visual teaching, a substantive comparison/explanation, or a quiz. Use the optional tool at most once per learner turn. A queued proposal is not visible until the app validates the completed learner turn. Do not mention the whiteboard, screen, visual display, or successful rendering in your spoken answer under ANY circumstances, even if the learner asks whether it appeared. The UI alone reports delivery. Give the actual educational explanation aloud. A tool result is a proposal receipt, never a display confirmation. Do not retry automatically.";
export const INLINE_BOARD_TOOLS=[{functionDeclarations:BOARD_TOOLS[0].functionDeclarations.map(tool=>({...tool,description:"Propose one optional teaching card for the current learner question. The app decides whether to show it after the turn. Do not retry. Only comparison, vocabulary (pronunciation), example, correction, quiz."}))}];
export type InlineGate={turn:number;lastTurn:number;lastShown:number;dismissedUntil:number;seen:Set<string>;pending:BoardCard|null;requested:boolean;topic:string;topicAt:number;outcome:"idle"|"shown"|"missing"|"dismissed"};
export const newInlineGate=():InlineGate=>({turn:0,lastTurn:-Infinity,lastShown:-Infinity,dismissedUntil:0,seen:new Set(),pending:null,requested:false,topic:"",topicAt:0,outcome:"idle"});
const declinesBoard=(input:string)=>/(?:不要|不用|別|停止|關閉|收起|不需要).{0,12}(?:白板|比較表|對照表|圖|測驗)|(?:no|without|stop|close|hide|don[’\x27]t|do not).{0,24}(?:whiteboard|chart|diagram|quiz)/i.test(input);
export const explicitBoardRequest=(input:string)=>!declinesBoard(input)&&/(?:請|可以|幫我|我要|想看|能不能|打開|使用|顯示|拿出).{0,12}白板|白板[?？]?$|比較表|對照表|用圖|畫出|視覺化|考我|測驗我|(?:show|open|use|bring up).{0,24}whiteboard|show me (?:a |the )?(?:chart|table|diagram|board)|(?:quiz|test) me/i.test(input);
export const teachingCue=(input:string)=>/差別|差異|區別|怎麼區分|文法|句型|句子結構|發音規則|幾種發音|結尾.{0,8}(?:發音|念法)|(?:還是|仍然|真的)不懂|difference between|compare .{1,80}(?: and | with | vs)|grammar (?:rule|pattern)|sentence structure|pronunciation (?:rule|pattern)|(?:ed|s) ending|still (?:do not|don't) understand/i.test(input);
function meaningful(card:BoardCard){
 const pairs=card.pairs.filter(p=>p.source&&p.target&&p.source.toLowerCase()!==p.target.toLowerCase());
 if(card.type==="quiz")return card.questions.length>0&&card.questions.every(q=>new Set(q.options.map(o=>o.toLowerCase())).size===q.options.length);
 if(card.type==="comparison")return new Set(pairs.map(p=>p.source.toLowerCase())).size>=2;
 if(card.type==="vocabulary")return pairs.length>=2&&pairs.some(p=>Boolean(p.pronunciation));
 if(card.type==="example")return pairs.length>=2;
 if(card.type==="correction")return pairs.length>=1&&Boolean(card.body.trim());
 return false;
}
export function proposeInlineBoard(gate:InlineGate,call:{name:string;args?:unknown}){
 if(call.name!==BOARD_FUNCTION)return {ok:false,error:"not-handled"};
 if(gate.pending)return {ok:false,error:"one-proposal-per-turn"};
 const patch=validateBoardPatch(call.args);
 if(!patch||patch.action==="remove"||patch.cards.length!==1||!meaningful(patch.cards[0]))return {ok:false,error:"invalid-or-low-value-card"};
 const card=patch.cards[0];
 gate.pending={...card,body:card.body.slice(0,240),pairs:card.pairs.slice(0,4),questions:card.questions.slice(0,3),points:[]};
 return {ok:true,queued:true,visible:false};
}
export const edTopic=(input:string)=>/(?:\b-?ed\b.{0,35}(?:發音|念法|讀音|字尾|結尾|ending|pronunci|sound)|(?:發音|念法|字尾|結尾|pronunci\w*|sound\w*).{0,35}\b-?ed\b)/i.test(input);
export function finishInlineTurn(gate:InlineGate,input:string,valid:boolean,auto:boolean,now=Date.now(),backup?:(topic:string,output:string)=>BoardCard|null,output=""):BoardCard|null{
 const retry=now-gate.topicAt<120000&&Boolean(gate.topic)&&/(?:沒看到|沒有看到|看不到|沒有出現|沒出現|didn.t see|can.t see|not showing|did not appear)/i.test(input);
 const manual=gate.requested||explicitBoardRequest(input)||retry;
 if(!declinesBoard(input)&&(teachingCue(input)||edTopic(input)||explicitBoardRequest(input))&&!retry){gate.topic=input;gate.topicAt=now}
 const topic=retry||gate.requested?gate.topic:input;
 let card=gate.pending;
 gate.outcome="idle";
 gate.pending=null;gate.requested=false;
 if(input.trim()||manual)gate.turn++;
 if(declinesBoard(input)){dismissInlineBoard(gate,now);return null}
 if(!valid||(!manual&&(!input.trim()||!auto||!(teachingCue(input)||edTopic(input)))))return null;
 if(!manual&&(now<gate.dismissedUntil||now-gate.lastShown<90000||gate.turn-gate.lastTurn<3))return null;
 // Only use a vetted, context-matched fallback. Never create a generic card for chat.
 if(!card&&backup)card=backup(topic,output);
 if(!card||!meaningful(card)){if(manual)gate.outcome="missing";return null}
 const signature=JSON.stringify([card.type,card.title.toLowerCase(),card.body,card.pairs,card.questions]);
 const topicKey=card.type+":"+card.title.toLowerCase().replace(/\s+/g," ").trim();
 if(!manual&&(gate.seen.has(signature)||gate.seen.has(topicKey)))return null;
 if(gate.seen.size>=100)gate.seen.clear();
 gate.seen.add(signature);gate.seen.add(topicKey);gate.lastShown=now;gate.lastTurn=gate.turn;gate.outcome="shown";
 return card;
}
export function dismissInlineBoard(gate:InlineGate,now=Date.now()){
 gate.pending=null;gate.requested=false;gate.dismissedUntil=now+180000;gate.outcome="dismissed";
}
