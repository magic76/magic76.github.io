(function(global){
"use strict";
function fallbackPage(index){
 return {text:"",emotion:"warm",characterName:"",dialogue:"",context:{currentEvent:"",characters:[],revealedFacts:[],interactionHints:[],spoilerBoundary:"只能談到目前照片與之前已讀內容"},pageIndex:index,imageIndex:-1};
}
async function analyzeCover(image){
 var prompt="你正在看一本實體故事書封面。只根據照片真正看得到的資訊。回傳 JSON：{title,language,summary}。title 是可辨識書名，看不清楚填 我的故事書；language 用 zh-TW/en/ja/ko/fr/de/es；summary 只用一句描述封面可見角色、場景或物件。";
 return CrewGeminiVision.generate(prompt,[image],{json:true,temperature:.1,maxOutputTokens:500,timeoutMs:22000});
}
async function analyzePage(image,story,index){
 var recent=(story.pages||[]).slice(-3).map(function(p){
  return {text:p.text||"",event:p.context&&p.context.currentEvent||"",characters:p.context&&p.context.characters||[]};
 });
 var prompt="你正在協助成年人陪讀一本實體故事書，這是第 "+(index+1)+" 張書頁照片。書名："+(story.title||"")+"。主要語言："+(story.language||"")+"。"+
 "前文脈絡："+JSON.stringify(recent)+
 "。visibleText 必須忠實轉錄照片中可辨識、屬於故事正文的文字，保持原語言與標點，不改寫、不摘要、不補字；不要混入頁碼、出版社標誌或裝飾小字。"+
 "visualDescription 用一句話客觀描述本頁畫面。其餘欄位只做 Story Context，不要劇透照片外內容。"+
 "回傳 JSON：{visibleText,visualDescription,emotion,characterName,characters:[...],revealedFacts:[...],interactionHints:[...],spoilerBoundary}。emotion 只能是 warm/excited/mysterious/joyful/dramatic/whisper/tender。";
 try{
  var r=await CrewGeminiVision.generate(prompt,[image],{json:true,temperature:.1,maxOutputTokens:1000,timeoutMs:26000});
  var p=fallbackPage(index);
  p.text=String(r.visibleText||"").trim();
  p.emotion=String(r.emotion||"warm").trim()||"warm";
  p.characterName=String(r.characterName||"").trim();
  p.context.currentEvent=String(r.visualDescription||"").trim();
  p.context.characters=Array.isArray(r.characters)?r.characters.map(String):[];
  p.context.revealedFacts=Array.isArray(r.revealedFacts)?r.revealedFacts.map(String):[];
  p.context.interactionHints=Array.isArray(r.interactionHints)?r.interactionHints.map(String):[];
  p.context.spoilerBoundary=String(r.spoilerBoundary||p.context.spoilerBoundary);
  return p;
 }catch(error){var p2=fallbackPage(index);p2.context.currentEvent="照片已保存，文字辨識暫時失敗。";return p2}
}
global.CrewBookAnalyzer={analyzeCover:analyzeCover,analyzePage:analyzePage};
})(window);