/** Crew Mate's independent product contract. Do not reuse Teacher/Friend memory. */
export type MatePhase = "setup" | "supplement" | "private" | "review" | "external" | "decision" | "finished";
export type MateAudience = "IDLE" | "PRIVATE_TO_MATE" | "MATE_HANDLING" | "EXTERNAL_WITH_MATE" | "USER_DIRECT";
export type MateConsensus = {
  target: string;
  goal: string;
  constraints: string;
  escalation: string;
  userLanguage: string;
  otherLanguage: string;
};
export type MateTurn = {
  id: string;
  sender: "other" | "mate";
  original: string;
  translated?: string;
  time: number;
};
export type MateDecision = {question: string; reason: string} | null;
export type MateHistory = {
  id: string;
  status: "completed" | "stopped";
  target: string;
  goal: string;
  userLanguage: string;
  otherLanguage: string;
  turns: MateTurn[];
  outcome: string;
  updatedAt: number;
  /** Auto-saved task snapshot; legacy history entries may not include this field. */
  consensus?: MateConsensus;
};
export const MATE_HISTORY_KEY = "crew_mate_history_v1";
export const MATE_LANGUAGES = [
  {value:"zh-TW",label:"繁體中文"},
  {value:"en",label:"English"},
  {value:"ja",label:"日本語"},
  {value:"ko",label:"한국어"},
  {value:"fr",label:"Français"},
  {value:"es",label:"Español"}
] as const;
export const EMPTY_CONSENSUS: MateConsensus = {
  target:"",goal:"",constraints:"",escalation:"任何金額、付款、證件或條件變更都先問我",
  userLanguage:"zh-TW",otherLanguage:"en"
};
const trimmed = (v:unknown, limit=700) => typeof v==="string" ? v.trim().slice(0,limit) : "";
export function mateConsensusReady(c:MateConsensus) {
  return Boolean(c.target.trim() && c.goal.trim() && c.constraints.trim() && c.escalation.trim()
    && c.userLanguage && c.otherLanguage);
}
/** Tool output never controls the stage, audience, languages or approval state. */
export function applyMateConsensusPatch(current:MateConsensus, args:Record<string,unknown>):MateConsensus {
  return {
    ...current,
    target: trimmed(args.target || args.target_person) || current.target,
    goal: trimmed(args.goal || args.purpose) || current.goal,
    constraints: trimmed(args.constraints) || current.constraints,
    escalation: trimmed(args.escalation || args.escalation_boundary) || current.escalation
  };
}
export function parseMateToolArgs(raw:unknown):Record<string,unknown> {
  if(raw && typeof raw==="object" && !Array.isArray(raw)) return raw as Record<string,unknown>;
  if(typeof raw==="string") {
    try {const parsed:unknown=JSON.parse(raw);return parseMateToolArgs(parsed)} catch {return {}}
  }
  return {};
}
/** The audience guard is enforced by the UI runtime, never by the model's prompt. */
export function mateToolAllowed(
  phase:MatePhase, audience:MateAudience, name:string, externalInputSeen:boolean, externalOutputSeen:boolean
) {
  if(phase==="private" && audience==="PRIVATE_TO_MATE") {
    return name==="update_task_consensus" || name==="request_user_input";
  }
  if(phase==="external" && audience==="EXTERNAL_WITH_MATE" && externalInputSeen) {
    return name==="request_user_input" || (name==="complete_task" && externalOutputSeen);
  }
  return false;
}
export function mateToolDeclarations(phase:"private"|"external") {
  const consensus={
    name:"update_task_consensus",
    description:"Update the user's PRIVATE task briefing. Only callable in private mode. Never infer missing constraints.",
    parameters:{type:"OBJECT",properties:{
      target:{type:"STRING"},goal:{type:"STRING"},constraints:{type:"STRING"},escalation:{type:"STRING"}
    }}
  };
  const ask={
    name:"request_user_input",
    description:"Pause and ask the user to decide before any changes to money, commitments, documents, time or substitution.",
    parameters:{type:"OBJECT",properties:{
      question:{type:"STRING"},reason:{type:"STRING"}
    },required:["question"]}
  };
  const complete={
    name:"complete_task",
    description:"Report that the communication goal has factually been achieved. Never use when merely saying goodbye.",
    parameters:{type:"OBJECT",properties:{outcome:{type:"STRING"}},required:["outcome"]}
  };
  return [{functionDeclarations:phase==="private"?[consensus,ask]:[ask,complete]}];
}
export function readMateHistory():MateHistory[] {
  try {
    const value:unknown=JSON.parse(localStorage.getItem(MATE_HISTORY_KEY)||"[]");
    return Array.isArray(value)?value.slice(0,20) as MateHistory[]:[];
  } catch {return []}
}
/** Only unfinished records with a complete private consensus can be resumed. */
export function mateHistoryResumable(item:MateHistory):boolean {
  return item.status==="stopped" && !!item.consensus && mateConsensusReady(item.consensus);
}
export function storeMateHistory(record:MateHistory) {
  const previous=readMateHistory().filter(entry=>entry.id!==record.id);
  try {localStorage.setItem(MATE_HISTORY_KEY,JSON.stringify([record,...previous].slice(0,20)))} catch {/* storage is optional */}
}
export function deleteMateHistory(id:string) {
  try {localStorage.setItem(MATE_HISTORY_KEY,JSON.stringify(readMateHistory().filter(entry=>entry.id!==id)))} catch {/* optional */}
}
