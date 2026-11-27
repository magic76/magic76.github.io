import {BOARD_FUNCTION,BOARD_TOOLS,validateBoardPatch,type BoardCard} from "./boardProtocol";

// Rollback switch: disabling removes the optional tool and all inline UI.
// The standalone board and Live transport remain unchanged.
export const INLINE_TEACHER_BOARD_ENABLED=true;
export const INLINE_BOARD_POLICY="\n[OPTIONAL WHITEBOARD] Conversation comes first. Never propose a board for greetings, ordinary chat, simple corrections or the opening. Only propose a single concise comparison, pronunciation vocabulary, sentence example/correction, or quiz when the learner explicitly asks for visual teaching, a substantive comparison/explanation, or a quiz. Use the optional tool at most once per learner turn. A queued proposal is not visible until the app validates the completed learner turn. Never tell the learner a board is visible, or wait for one; finish your spoken answer naturally. If rejected, continue speaking without retrying.";
export const INLINE_BOARD_TOOLS=[{functionDeclarations:BOARD_TOOLS[0].functionDeclarations.map(tool=>({...tool,description:"Propose one optional teaching card for the current learner question. The app decides whether to show it after the turn. Do not retry. Only comparison, vocabulary (pronunciation), example, correction, quiz."}))}];
export type InlineGate={turn:number;lastTurn:number;lastShown:number;dismissedUntil:number;signature:string;pending:BoardCard|null;requested:boolean};
export const newInlineGate=():InlineGate=>({turn:0,lastTurn:-Infinity,lastShown:-Infinity,dismissedUntil:0,signature:"",pending:null,requested:false});
export const explicitBoardRequest=(input:string)=>/白板|比較表|對照表|用圖|畫出|視覺化|考我|測驗我|whiteboard|show me (?:a |the )?(?:chart|table|diagram|board)|(?:quiz|test) me/i.test(input);
const teachingCue=(input:string)=>/差別|差異|區別|怎麼區分|文法|句型|句子結構|發音規則|幾種發音|結尾.{0,8}(?:發音|念法)|(?:還是|仍然|真的)不懂|difference between|compare .{1,80}(?: and | with | vs)|grammar (?:rule|pattern)|sentence structure|pronunciation (?:rule|pattern)|(?:ed|s) ending|still (?:do not|don't) understand/i.test(input);
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
export function finishInlineTurn(gate:InlineGate,input:string,valid:boolean,auto:boolean,now=Date.now()):BoardCard|null{
 const card=gate.pending,manual=gate.requested||explicitBoardRequest(input);
 gate.pending=null;gate.requested=false;
 if(input.trim()||manual)gate.turn++;
 if(!card||!valid||(!manual&&(!input.trim()||!auto||!teachingCue(input))))return null;
 if(!manual&&(now<gate.dismissedUntil||now-gate.lastShown<90000||gate.turn-gate.lastTurn<3))return null;
 const signature=JSON.stringify([card.type,card.title.toLowerCase(),card.body,card.pairs,card.questions]);
 if(!manual&&signature===gate.signature)return null;
 gate.signature=signature;gate.lastShown=now;gate.lastTurn=gate.turn;
 return card;
}
export function dismissInlineBoard(gate:InlineGate,now=Date.now()){
 gate.pending=null;gate.requested=false;gate.dismissedUntil=now+180000;
}
