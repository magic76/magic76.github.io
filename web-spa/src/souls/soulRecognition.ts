/** Pure recognition guard. Scores are heuristics, NOT calibrated probabilities.
 * In a mixed old/new library, never treat unavailable embeddings as verified. */
export type RecognitionEvidence={
 score:number;legacy:number;cosine:number|null;
 embeddingExpected:boolean;hasEmbedding:boolean;
};
export function shouldAutoWake(best:RecognitionEvidence|undefined,second?:{score:number}):boolean{
 if(!best||!Number.isFinite(best.score)||best.score-(second?.score??0)<.12)return false;
 if(best.embeddingExpected){
  return best.hasEmbedding&&best.cosine!==null&&best.cosine>=.92
   &&best.legacy>=.90&&best.score>=.90;
 }
 // Pre-embedding items remain supported, but no more permissive than before.
 return !best.hasEmbedding&&best.legacy>=.965;
}
/** Conservative guard for automatically extracted memory, not user-entered notes. */
export function isSafeAutomaticMemory(note:string,evidence:string):boolean{
 const content=note+" "+evidence;
 if(!note.trim()||!evidence.trim()||note.length>180)return false;
 if(/https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|@\w{3,}/i.test(content))return false;
 if(/(?:\+?\d[\d\s()+.-]*){7,}/.test(content))return false;
 if(/password|passcode|pin code|api.?key|token|secret|passport|credit.?card|bank|account|address|diagnos|medic|health|religion|politic|sexual|密碼|住址|地址|地址在|銀行|帳號|帳戶|卡號|護照|身分證|身份證|疾病|病歷|診斷|藥物|政治|宗教|私人資料|金鑰|私鑰/i.test(content))return false;
 return true;
}
