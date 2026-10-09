(function(global){
"use strict";
var MIN_DURATION=60000,MIN_TURNS=3,MIN_WORDS=20;
function studentTurns(turns){return(turns||[]).filter(function(t){return t&&t.input&&String(t.input).trim()})}
function countWords(turns){
 return studentTurns(turns).reduce(function(sum,t){
  var s=String(t.input||"").trim();
  return sum+(s?s.split(/\s+/).filter(Boolean).length:0);
 },0);
}
function eligible(snapshot){
 if(!snapshot)return false;
 return Number(snapshot.durationMs||0)>=MIN_DURATION&&studentTurns(snapshot.turns).length>=MIN_TURNS&&countWords(snapshot.turns)>=MIN_WORDS;
}
function cleanJson(raw){
 var text=String(raw||"").trim().replace(/^~~~json\s*/i,"").replace(/~~~$/,"").trim();
 try{return JSON.parse(text)}catch(_){return null}
}
function safeScore(v,fallback){v=Number(v);return isFinite(v)?Math.max(20,Math.min(98,Math.round(v))):fallback}
function reportText(data){
 var lines=[];
 lines.push(data.summary||"這次練習已完成。");
 if(data.strengths)lines.push("\n做得好\n"+data.strengths);
 var recasts=Array.isArray(data.recasts)?data.recasts:[];
 if(recasts.length){
  lines.push("\n要修正");
  recasts.slice(0,3).forEach(function(x){lines.push("• "+(x.original||"")+" → "+(x.corrected||"")+(x.explanation?"\n  "+x.explanation:""))});
 }
 var takeaways=Array.isArray(data.takeaways)?data.takeaways:[];
 if(takeaways.length){
  lines.push("\n帶走的表達");
  takeaways.slice(0,4).forEach(function(x){lines.push("• "+(x.phrase||"")+(x.translation?" — "+x.translation:""))});
 }
 if(data.next_focus)lines.push("\n下次重點\n"+data.next_focus);
 return lines.join("\n");
}
function render(card,data){
 if(!card||!data)return;
 card.hidden=false;
 var score=card.querySelector("[data-report-score]");
 var fluency=card.querySelector("[data-report-fluency]");
 var vocab=card.querySelector("[data-report-vocab]");
 var grammar=card.querySelector("[data-report-grammar]");
 var body=card.querySelector("[data-report-body]");
 if(score)score.textContent=safeScore(data.overall_score,70);
 if(fluency)fluency.textContent=safeScore(data.fluency_score,70);
 if(vocab)vocab.textContent=safeScore(data.vocab_score,70);
 if(grammar)grammar.textContent=safeScore(data.grammar_score,70);
 if(body)body.textContent=reportText(data);
}
async function generate(snapshot,options){
 options=options||{};
 if(!eligible(snapshot))return null;
 var transcript=global.CrewLiveUI.transcriptText(snapshot.turns,{user:"Student",ai:"Tutor"});
 var target=options.language||"英文";
 var allowPersonal=localStorage.getItem("crew_teacher_personal_memory_opt_in_v2")==="1";
 var prompt=
  "你是 Crew Teacher 的課後學習報告評估器。請根據學生真正說過的內容做嚴謹、具體的診斷。\n"+
  "目標語言："+target+"\n"+
  "禁止根據 transcript 評估 pronunciation，因為文字沒有聲學證據。\n"+
  "不要空泛鼓勵；評分使用真實 CEFR 程度尺度。\n"+
  "只輸出 JSON，鍵包含 overall_score, fluency_score, vocab_score, grammar_score, summary, strengths, recasts, takeaways, next_focus。"+
  "recasts 是 original/corrected/explanation 陣列；takeaways 是 phrase/translation 陣列。\n"+
  "此外回傳 memory_updates:{weaknesses:[{key,detail,confidence}],strengths:[...],wins:[...],next_focus:[...],resolved_weaknesses:[{key}],goals:[{key,detail,evidence_quote}],interests:[...],preferences:[...]}。"+
  "每種類型最多 2 筆。必須從學生說過的話提取，不能從老師的話推斷；不能從文字推斷發音。"+
  "個人資訊擷取："+(allowPersonal?"只允許學生明確提及、與學習有關且附其原話的目標/興趣/偏好。":"關閉。goals,interests,preferences 必須全是空陣列。")+
  "如果沒有明確證據，對應陣列設為空，不要杜撰。"+
  "對話：\n"+transcript.slice(-12000);
 try{
  var raw=await global.CrewAI.call(prompt,{preferLive:false,temperature:.2,maxOutputTokens:1900,json:true});
  var data=cleanJson(raw);
  if(!data)throw new Error("invalid report JSON");
  data.overall_score=safeScore(data.overall_score,70);
  data.fluency_score=safeScore(data.fluency_score,70);
  data.vocab_score=safeScore(data.vocab_score,70);
  data.grammar_score=safeScore(data.grammar_score,70);
  global.CrewLiveUI.patchSession("teacher",snapshot.ts,{report:data,preview:data.summary||snapshot.preview});
  return data;
 }catch(_){return null}
}
global.CrewTeacherReport={
 eligible:eligible,generate:generate,render:render,countWords:countWords,
 thresholds:{durationMs:MIN_DURATION,userTurns:MIN_TURNS,words:MIN_WORDS}
};
})(window);