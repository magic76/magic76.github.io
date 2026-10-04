CrewAI.nav("teacher");
var prefIds=["lang","chatMode","guidance","voice","languageStyle"];
prefIds.forEach(function(id){
 var el=document.getElementById(id),key="crew_teacher_"+id;
 var saved=localStorage.getItem(key);if(saved)el.value=saved;
 el.onchange=function(){
  localStorage.setItem(key,el.value);
  if(id==="lang"&&el.value!=="英文"){
   var style=document.getElementById("languageStyle");
   if(style){style.value="auto";localStorage.setItem("crew_teacher_languageStyle","auto")}
  }
 };
});

var params=new URLSearchParams(location.search);
var requestedScene=params.get("scene")||"";
var mode=params.get("mode")||"";
var missionId=params.get("mission")||"";
var missions={
 hotel_checkin:{title:"飯店入住",scene:"飯店",goals:["說出訂房姓名","確認早餐時間","詢問退房時間"]},
 restaurant_order:{title:"餐廳點餐",scene:"餐廳",goals:["詢問推薦菜色","說明飲食限制","請服務生結帳"]},
 work_meeting:{title:"工作會議",scene:"工作",goals:["表達一個風險","提出替代方案","確認 action item"]},
 transport:{title:"問路與交通",scene:"旅遊",goals:["問目的地方向","確認月台","確認這班車是否正確"]}
};
var activeMission=missions[missionId]||null;
if(mode==="course"&&activeMission){
 requestedScene=activeMission.scene;
 document.getElementById("chatMode").value="scenario";
 var card=document.getElementById("courseMissionCard");
 card.hidden=false;
 document.getElementById("courseMissionTitle").textContent=activeMission.title;
 document.getElementById("courseMissionText").textContent="任務："+activeMission.goals.join(" · ");
 document.getElementById("teacherLiveTitle").textContent=activeMission.title;
 document.getElementById("teacherLiveSub").textContent="完成任務即可，不需要把整段對話背起來。";
}
if(location.hash==="#teacherSettings"){
 var settingsTarget=document.getElementById("teacherSettings");
 settingsTarget.open=true;
 setTimeout(function(){settingsTarget.scrollIntoView({behavior:"smooth",block:"center"})},100);
}

var continueContext=null,pendingTeacherImage=null;
var reportCard=document.getElementById("teacherReportCard");

function learnerLevel(){
 var score=Number(localStorage.getItem("crew_vocab_score")||50);
 if(score<30)return"A1";if(score<45)return"A2";if(score<62)return"B1";if(score<82)return"B2";return"C1";
}
function guidanceInstruction(){
 var v=document.getElementById("guidance").value;
 if(v==="light")return"優先保持對話流暢，只修正會造成誤解的錯誤。";
 if(v==="strict")return"文法、用字與不自然表達都要短暫指出，給自然說法後讓學生重說一次。";
 return"明顯錯誤時用簡短 recast 修正，不要把對話變成長篇講課。";
}
function modeInstruction(){
 var v=document.getElementById("chatMode").value;
 if(activeMission)return"你正在帶一個結構化情境任務。扮演情境中的真人角色，不要先把答案講出來。逐步讓學生完成："+activeMission.goals.join("、")+"。";
 if(v==="scenario")return"使用情境角色扮演方式聊天，像真人互動，不要一直用老師口吻講解。";
 if(v==="practice")return"這次偏向口說教練模式，保持對話，但比自然聊天多一點具體修正與重說。";
 return"使用自然聊天模式，像真人老師陪學生聊，不要每回合都糾正。";
}
function languageStyleInstruction(){
 var v=document.getElementById("languageStyle").value,lang=document.getElementById("lang").value;
 if(v==="auto"||lang!=="英文")return"";
 var label=v==="gb"?"英國":(v==="au"?"澳洲":"美國");
 return"英文使用自然的"+label+"當代日常口音與常見措辭；不要誇張、模仿或刻板化。";
}
function teacherSystem(){
 return "你是 Crew Teacher 的真人感 Live 語言老師 Emma。"+
  "目標語言："+document.getElementById("lang").value+"。"+
  "學生目前推估程度："+learnerLevel()+"。"+
  (requestedScene?"目前情境："+requestedScene+"。":"")+
  modeInstruction()+guidanceInstruction()+languageStyleInstruction()+
  "以目標語言為主，學生明顯卡住時才用繁體中文短解釋。一次 1-3 句，每回合留一個可以直接回答的短問題。";
}
function lastContext(last){
 if(!last||!last.turns||!last.turns.length)return"";
 return last.turns.slice(-4).map(function(t){return(t.input?"學生："+t.input+"\n":"")+(t.output?"老師："+t.output:"")}).join("\n");
}
function openingPrompt(){
 if(pendingTeacherImage)return"";
 if(continueContext)return"以下是上次練習最後幾輪，請自然接著聊，不要重新自我介紹：\n"+lastContext(continueContext);
 if(activeMission)return"直接進入「"+activeMission.title+"」角色扮演。你先以情境中的真人角色開口，不要解釋課程規則。";
 return"現在開始一對一 Live 練習。請依目前聊天模式先自然開口，問我第一個簡短問題。";
}

function teacherVisionPrompt(){
 return "我剛傳了一張圖片。請先真的看圖，再以「"+document.getElementById("lang").value+"」為主要語言帶我學。"+
  "如果圖片有文字，先幫我讀懂最重要內容；如果是教材或題目，不要一次講完答案，先問我一個直接相關的問題。";
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
 var status=document.getElementById("teacherVisionStatus"),preview=document.getElementById("teacherVisionPreview");
 status.textContent="正在縮小圖片…";preview.classList.add("show");
 try{
  pendingTeacherImage=await CrewLiveUI.prepareImage(file,{maxSide:1600,quality:.84});
  document.getElementById("teacherVisionImage").src=pendingTeacherImage.preview;
  document.getElementById("teacherVisionTitle").textContent="圖片已準備";
  status.textContent=pendingTeacherImage.width+"×"+pendingTeacherImage.height+" · "+Math.max(1,Math.round(pendingTeacherImage.bytes/1024))+" KB";
  if(sendTeacherImage(pendingTeacherImage))pendingTeacherImage=null;
  else CrewAI.toast("照片準備好了，開始 Live 後會自動送出");
 }catch(error){pendingTeacherImage=null;status.textContent=error.message;CrewAI.toast(error.message)}
}
document.getElementById("takeTeacherPhoto").onclick=function(){document.getElementById("teacherCameraInput").click()};
document.getElementById("pickTeacherPhoto").onclick=function(){document.getElementById("teacherGalleryInput").click()};
document.getElementById("teacherCameraInput").onchange=function(){prepareTeacherImage(this.files&&this.files[0]);this.value=""};
document.getElementById("teacherGalleryInput").onchange=function(){prepareTeacherImage(this.files&&this.files[0]);this.value=""};

async function maybeGenerateReport(snapshot){
 if(!CrewTeacherReport.eligible(snapshot))return;
 reportCard.hidden=false;
 var body=reportCard.querySelector("[data-report-body]");
 if(body)body.textContent="正在整理這次練習的課後報告…";
 var report=await CrewTeacherReport.generate(snapshot,{language:document.getElementById("lang").value});
 if(report)CrewTeacherReport.render(reportCard,report);
 else reportCard.hidden=true;
}

var teacherUI=CrewLiveUI.bind({
 pageKey:"teacher",
 labels:{user:"你",ai:"Emma"},
 idleModelLabel:"Live voice",
 speakingLabel:"老師說話中",
 notStartedText:"先開始 Live 對話",
 endedText:"已結束。按開始可再開一個新 session。",
 voice:function(){return document.getElementById("voice").value},
 system:teacherSystem,
 openingPrompt:openingPrompt,
 historyTitle:function(){return(activeMission?activeMission.title:(requestedScene||document.getElementById("chatMode").selectedOptions[0].text))+" · "+document.getElementById("lang").value},
 onContinueLast:function(last){continueContext=last;CrewAI.toast("將延續上次練習");teacherUI.start()},
 onSessionSaved:maybeGenerateReport,
 onStarted:function(){continueContext=null;if(pendingTeacherImage&&sendTeacherImage(pendingTeacherImage))pendingTeacherImage=null}
});