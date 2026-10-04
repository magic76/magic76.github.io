CrewAI.nav("story");
["topic","style","pace","interaction","voice"].forEach(function(id){
 var el=document.getElementById(id),key="crew_story_"+id;
 var saved=localStorage.getItem(key);if(saved)el.value=saved;
 var eventName=el.tagName==="INPUT"?"input":"change";
 el.addEventListener(eventName,function(){localStorage.setItem(key,el.value)});
});
var continueContext=null;
var storyBookContext=null;
try{storyBookContext=JSON.parse(localStorage.getItem("crew_story_book_live_context")||"null")}catch(_){}
if(storyBookContext&&storyBookContext.title)document.getElementById("topic").value=storyBookContext.title;
var pendingStoryImage=null;
var storyResultText="";
var storyResultCard=document.getElementById("storyResultCard");
var storyResultBody=document.getElementById("storyResultBody");
var storyResultStatus=document.getElementById("storyResultStatus");

function renderStoryResult(text,status){
 storyResultText=String(text||"").trim();
 storyResultCard.hidden=!storyResultText;
 storyResultBody.textContent=storyResultText;
 storyResultStatus.textContent=status||"";
}

async function generateStoryResult(snapshot){
 if(!snapshot||!snapshot.turns||!snapshot.turns.length)return;
 renderStoryResult("正在整理故事進度…","AI 整理中");
 var transcript=CrewLiveUI.transcriptText(snapshot.turns,{user:"使用者",ai:"阿奇"});
 try{
  var result=await CrewAI.call(
   "請根據以下互動故事 Live 對話，整理一張繁體中文故事進度卡。\n"+
   "請嚴格用以下格式，簡短但能讓下一次直接接續：\n"+
   "本章發生：2-4 句\n"+
   "目前角色：列出重要角色與狀態\n"+
   "世界設定：只列本次新增或重要設定\n"+
   "還沒解開：最多 3 個線索或問題\n"+
   "下次從這裡開始：一句明確接點\n\n"+
   "對話：\n"+transcript.slice(-14000),
   {preferLive:false,temperature:.35,maxOutputTokens:850}
  );
  CrewLiveUI.patchSession("story",snapshot.ts,{resultCard:result,preview:result.slice(0,180)});
  renderStoryResult(result,"已儲存");
 }catch(error){
  renderStoryResult("這次故事已保存，但進度整理失敗。你仍可從「繼續上次故事」直接接著講。","整理失敗");
 }
}

function storyVisionPrompt(){
 return "我剛傳了一張圖片，請把它當成目前故事的真實視覺素材。"+
  "如果是插圖或照片，先用 1-2 句描述最重要的角色、場景或物件，再自然把它融入故事；"+
  "如果是故事書頁面，只概述這一頁並陪我聊，不要長篇逐字重現頁面文字。"+
  "最後繼續故事或問我一個簡短選擇。";
}

function sendStoryImage(image){
 var session=storyUI&&storyUI.getSession?storyUI.getSession():null;
 if(!session||!session.ready)return false;
 var ok=session.sendImage(image,{prompt:storyVisionPrompt(),statusText:"圖片已送給阿奇，正在看圖…"});
 if(ok){
  document.getElementById("storyVisionStatus").textContent="已送進目前 Live session，圖片現在是故事的一部分。";
  document.getElementById("storyVisionTitle").textContent="阿奇正在看這張圖";
 }
 return ok;
}

async function prepareStoryImage(file){
 if(!file)return;
 var status=document.getElementById("storyVisionStatus");
 var preview=document.getElementById("storyVisionPreview");
 status.textContent="正在縮小圖片…";
 preview.classList.add("show");
 try{
  pendingStoryImage=await CrewLiveUI.prepareImage(file,{maxSide:1600,quality:.84});
  document.getElementById("storyVisionImage").src=pendingStoryImage.preview;
  document.getElementById("storyVisionTitle").textContent="圖片已準備";
  status.textContent=pendingStoryImage.width+"×"+pendingStoryImage.height+" · "+Math.max(1,Math.round(pendingStoryImage.bytes/1024))+" KB";
  if(sendStoryImage(pendingStoryImage))pendingStoryImage=null;
  else CrewAI.toast("圖片準備好了，開始 Live 後會自動送出");
 }catch(error){
  pendingStoryImage=null;
  status.textContent=error.message;
  CrewAI.toast(error.message);
 }
}

document.getElementById("takeStoryPhoto").onclick=function(){document.getElementById("storyCameraInput").click()};
document.getElementById("pickStoryPhoto").onclick=function(){document.getElementById("storyGalleryInput").click()};
document.getElementById("storyCameraInput").onchange=function(){prepareStoryImage(this.files&&this.files[0]);this.value=""};
document.getElementById("storyGalleryInput").onchange=function(){prepareStoryImage(this.files&&this.files[0]);this.value=""};
document.getElementById("copyStoryResult").onclick=async function(){
 if(!storyResultText)return;
 try{await navigator.clipboard.writeText(storyResultText);CrewAI.toast("已複製故事進度")}catch(_){CrewAI.toast("複製失敗")}
};

var previousStorySession=CrewLiveUI.last("story");
if(previousStorySession&&previousStorySession.resultCard){
 renderStoryResult(previousStorySession.resultCard,"上次進度");
}
function storyContext(last){
 if(!last||!last.turns||!last.turns.length)return "";
 return last.turns.slice(-6).map(function(t){
  return (t.input?"使用者插話："+t.input+"\n":"")+(t.output?"阿奇："+t.output:"");
 }).join("\n");
}
function interactionInstruction(){
 var v=document.getElementById("interaction").value;
 if(v==="high")return "每 1-2 個小段落就停下來給使用者兩個簡短選項。";
 if(v==="low")return "以連續敘事為主，除非使用者插話，否則少主動提問。";
 return "每幾個段落偶爾給使用者選擇，但不要太頻繁。";
}
function paceInstruction(){
 var v=document.getElementById("pace").value;
 if(v==="short")return "每次只講 2-3 句就停一下。";
 if(v==="long")return "每次可以講 6-9 句，但仍要讓使用者可隨時插話。";
 return "每次講 3-5 句，自然停頓。";
}
function storySystem(){
 return "你是 Crew Story 的說書人阿奇。風格："+document.getElementById("style").value+"。"+
  paceInstruction()+interactionInstruction()+
  "直接用繁體中文生動說故事。使用者任何時候插話，立即回應他的問題或改劇情要求，回答後自然回到主線。"+
  "角色個性和世界設定要前後一致，不要重新解釋你是 AI。"+
  (storyBookContext?"目前正在陪讀使用者書架裡的既有故事，不可擅自重寫已經發生的內容。":"");
}
function openingPrompt(){
 if(pendingStoryImage)return "";
 if(continueContext){
  return "這是上次故事最後幾輪。請直接從最後情節接著說，不要重講開頭：\n"+storyContext(continueContext);
 }
 if(storyBookContext){
  return "我們正在讀書架故事《"+storyBookContext.title+"》，目前第 "+(storyBookContext.currentPage+1)+" 頁附近。以下是附近頁面內容：\n"+(storyBookContext.pages||[]).join("\n---\n")+"\n請先針對目前情節說 1-2 句，再問我要繼續聽、討論角色，還是改走向。";
 }
 return "故事主題："+document.getElementById("topic").value+"。現在直接像陪伴式說書人一樣開場，先講第一小段，留下後續發展空間。";
}
var storyUI;
storyUI=CrewLiveUI.bind({
 pageKey:"story",
 labels:{user:"你",ai:"阿奇"},
 idleModelLabel:"Live storyteller",
 speakingLabel:"阿奇說故事中",
 notStartedText:"先開始故事",
 endedText:"故事結束。你可以再開一個新的。",
 voice:function(){return document.getElementById("voice").value},
 system:storySystem,
 openingPrompt:openingPrompt,
 historyTitle:function(){return document.getElementById("topic").value.slice(0,36)},
 onContinueLast:function(last){continueContext=last;CrewAI.toast("接著上次故事");storyUI.start()},
 onSessionSaved:generateStoryResult,
 onStarted:function(){
  continueContext=null;
  if(pendingStoryImage&&sendStoryImage(pendingStoryImage))pendingStoryImage=null;
 }
});
document.getElementById("textStory").onclick=async function(){
 if(!CrewAI.requireKey())return;
 var res=document.getElementById("textResult");CrewAI.busy(this,true,"生成中…");res.classList.remove("empty");
 try{
  res.textContent=await CrewAI.call(
   "請用繁中寫 300 字內短故事。主題："+document.getElementById("topic").value+"。風格："+document.getElementById("style").value+"。",
   {preferLive:false,maxOutputTokens:700}
  )
 }catch(e){res.textContent=e.message}finally{CrewAI.busy(this,false)}
};
