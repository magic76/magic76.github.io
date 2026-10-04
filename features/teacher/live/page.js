CrewAI.nav("teacher");
var prefIds=["lang","scene","level","pace","correction","accent","voice"];
prefIds.forEach(function(id){
 var el=document.getElementById(id),key="crew_teacher_"+id;
 var saved=localStorage.getItem(key);if(saved)el.value=saved;
 el.onchange=function(){localStorage.setItem(key,el.value)};
});
var continueContext=null;
var pendingTeacherImage=null;
var teacherResultText="";
var teacherResultCard=document.getElementById("teacherResultCard");
var teacherResultBody=document.getElementById("teacherResultBody");
var teacherResultStatus=document.getElementById("teacherResultStatus");

function renderTeacherResult(text,status){
 teacherResultText=String(text||"").trim();
 teacherResultCard.hidden=!teacherResultText;
 teacherResultBody.textContent=teacherResultText;
 teacherResultStatus.textContent=status||"";
}

async function generateTeacherResult(snapshot){
 if(!snapshot||!snapshot.turns||!snapshot.turns.length)return;
 renderTeacherResult("正在整理本次練習…","AI 整理中");
 var transcript=CrewLiveUI.transcriptText(snapshot.turns,{user:"學生",ai:"老師"});
 try{
  var result=await CrewAI.call(
   "請根據以下語言學習 Live 對話，做一張繁體中文成果卡。\n"+
   "目標語言："+document.getElementById("lang").value+"\n"+
   "程度："+document.getElementById("level").value+"\n"+
   "請嚴格用以下格式，內容精簡、具體，不要泛泛鼓勵：\n"+
   "今天練了：一句話\n"+
   "做得好：1-2 點\n"+
   "要修正：最多 3 點，每點附正確說法\n"+
   "帶走的表達：3-5 個\n"+
   "下次繼續：一句具體建議\n\n"+
   "對話：\n"+transcript.slice(-12000),
   {preferLive:false,temperature:.25,maxOutputTokens:750}
  );
  CrewLiveUI.patchSession("teacher",snapshot.ts,{resultCard:result,preview:result.slice(0,180)});
  renderTeacherResult(result,"已儲存");
 }catch(error){
  renderTeacherResult("這次對話已保存，但成果整理失敗。你仍可從「繼續上次練習」接著聊。","整理失敗");
 }
}

function teacherVisionPrompt(){
 return "我剛傳了一張圖片。請先真的看圖，再以「"+document.getElementById("lang").value+"」為主要語言帶我學。"+
  "如果圖片有文字，先幫我讀懂最重要的內容；如果是教材或題目，請不要一次講完答案，先問我一個和圖片直接相關、符合 "+document.getElementById("level").value+" 程度的問題。";
}

function sendTeacherImage(image){
 var session=teacherUI&&teacherUI.getSession?teacherUI.getSession():null;
 if(!session||!session.ready)return false;
 var ok=session.sendImage(image,{prompt:teacherVisionPrompt(),statusText:"圖片已送給老師，正在看圖…"});
 if(ok){
  document.getElementById("teacherVisionStatus").textContent="已送進目前 Live session，可以直接開口問這張圖。";
  document.getElementById("teacherVisionTitle").textContent="老師正在看這張圖";
 }
 return ok;
}

async function prepareTeacherImage(file){
 if(!file)return;
 var status=document.getElementById("teacherVisionStatus");
 var preview=document.getElementById("teacherVisionPreview");
 status.textContent="正在縮小圖片…";
 preview.classList.add("show");
 try{
  pendingTeacherImage=await CrewLiveUI.prepareImage(file,{maxSide:1600,quality:.84});
  document.getElementById("teacherVisionImage").src=pendingTeacherImage.preview;
  document.getElementById("teacherVisionTitle").textContent="圖片已準備";
  status.textContent=pendingTeacherImage.width+"×"+pendingTeacherImage.height+" · "+Math.max(1,Math.round(pendingTeacherImage.bytes/1024))+" KB";
  if(sendTeacherImage(pendingTeacherImage))pendingTeacherImage=null;
  else CrewAI.toast("照片準備好了，開始 Live 後會自動送出");
 }catch(error){
  pendingTeacherImage=null;
  status.textContent=error.message;
  CrewAI.toast(error.message);
 }
}

document.getElementById("takeTeacherPhoto").onclick=function(){document.getElementById("teacherCameraInput").click()};
document.getElementById("pickTeacherPhoto").onclick=function(){document.getElementById("teacherGalleryInput").click()};
document.getElementById("teacherCameraInput").onchange=function(){prepareTeacherImage(this.files&&this.files[0]);this.value=""};
document.getElementById("teacherGalleryInput").onchange=function(){prepareTeacherImage(this.files&&this.files[0]);this.value=""};
document.getElementById("copyTeacherResult").onclick=async function(){
 if(!teacherResultText)return;
 try{await navigator.clipboard.writeText(teacherResultText);CrewAI.toast("已複製成果卡")}catch(_){CrewAI.toast("複製失敗")}
};

var previousTeacherSession=CrewLiveUI.last("teacher");
if(previousTeacherSession&&previousTeacherSession.resultCard){
 renderTeacherResult(previousTeacherSession.resultCard,"上次成果");
}
function lastContext(last){
 if(!last||!last.turns||!last.turns.length)return "";
 return last.turns.slice(-4).map(function(t){
  return (t.input?"學生："+t.input+"\n":"")+(t.output?"老師："+t.output:"");
 }).join("\n");
}
function paceInstruction(){
 var v=document.getElementById("pace").value;
 if(v==="slow")return "語速明顯慢一點，短句、清楚停頓，但不要機器人式拉長音。";
 if(v==="fast")return "使用自然偏快的母語者日常語速，不要刻意放慢。";
 return "使用清楚自然的正常語速。";
}
function correctionInstruction(){
 var v=document.getElementById("correction").value;
 if(v==="light")return "只糾正會造成誤解的錯誤，優先保持對話流暢。";
 if(v==="strict")return "文法、用字、搭配詞與不自然表達都要短暫糾正，讓學生重說後再繼續。";
 return "明顯錯誤時用 recast 給正確說法，必要時讓學生重說一次。";
}
function teacherSystem(){
 return "你是 Crew Teacher 的真人感 Live 語言老師。"+
  "目標語言："+document.getElementById("lang").value+"。"+
  "學生程度："+document.getElementById("level").value+"。"+
  "情境："+document.getElementById("scene").value+"。"+
  "口音偏好："+document.getElementById("accent").value+"。"+
  paceInstruction()+correctionInstruction()+
  "以目標語言為主，學生卡住時才用繁體中文短解釋。一次 1-3 句，不要長篇講課；每回合留一個可直接回答的短問題。";
}
function openingPrompt(){
 if(pendingTeacherImage)return "";
 if(continueContext){
  return "以下是上次練習最後幾輪，請自然接著聊，不要重新自我介紹：\n"+lastContext(continueContext);
 }
 return "現在開始一對一 Live 練習。請根據「"+document.getElementById("scene").value+"」情境，以符合 "+document.getElementById("level").value+" 程度的方式先開口，問我第一個簡短問題。";
}
var teacherUI;
teacherUI=CrewLiveUI.bind({
 pageKey:"teacher",
 labels:{user:"你",ai:"老師"},
 idleModelLabel:"Live voice",
 speakingLabel:"老師說話中",
 notStartedText:"先開始 Live 對話",
 endedText:"已結束。按開始可再開一個新 session。",
 voice:function(){return document.getElementById("voice").value},
 system:teacherSystem,
 openingPrompt:openingPrompt,
 historyTitle:function(){return document.getElementById("scene").value+" · "+document.getElementById("lang").value},
 onContinueLast:function(last){continueContext=last;CrewAI.toast("將延續上次練習");teacherUI.start()},
 onSessionSaved:generateTeacherResult,
 onStarted:function(){
  continueContext=null;
  if(pendingTeacherImage&&sendTeacherImage(pendingTeacherImage))pendingTeacherImage=null;
 }
});
var teacherHeroStart=document.getElementById("teacherHeroStart");
if(teacherHeroStart)teacherHeroStart.onclick=function(){
 document.getElementById("liveStage").scrollIntoView({behavior:"smooth",block:"center"});
 setTimeout(function(){if(teacherUI)teacherUI.start()},180);
};
var teacherQuickSettings=document.getElementById("teacherQuickSettings");
if(teacherQuickSettings)teacherQuickSettings.onclick=function(){
 var settings=document.getElementById("teacherSettings");
 if(settings){settings.open=true;settings.scrollIntoView({behavior:"smooth",block:"center"})}
};

document.getElementById("coachGo").onclick=async function(){
 if(!CrewAI.requireKey())return;
 var input=document.getElementById("coachInput").value.trim(),res=document.getElementById("coachResult");
 if(!input){CrewAI.toast("先輸入一句話");return}
 CrewAI.busy(this,true,"修正中…");res.classList.remove("empty");
 try{
  res.textContent=await CrewAI.call(
   "目標語言："+document.getElementById("lang").value+"\n程度："+document.getElementById("level").value+"\n使用者想表達："+input+"\n只給：最自然說法 + 一句繁中說明。",
   {preferLive:false,maxOutputTokens:250}
  )
 }catch(e){res.textContent=e.message}finally{CrewAI.busy(this,false)}
};
