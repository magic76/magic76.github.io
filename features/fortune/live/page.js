CrewAI.nav("fortune");
var fields=["profileName","birth","birthTime","city","focus","tone","voice"];
fields.forEach(function(id){
 var el=document.getElementById(id),key="crew_fortune_"+id;
 var legacy={birth:"crew_birth_date",birthTime:"crew_birth_time",city:"crew_birth_city"}[id];
 var saved=localStorage.getItem(key)||(legacy?localStorage.getItem(legacy):"");
 if(saved)el.value=saved;
 var eventName=el.tagName==="SELECT"?"change":"input";
 el.addEventListener(eventName,function(){
  localStorage.setItem(key,el.value);
  if(legacy)localStorage.setItem(legacy,el.value);
 });
});
var continueContext=null;
var deterministicContext=null;
try{deterministicContext=JSON.parse(localStorage.getItem("crew_fortune_live_context")||"null")}catch(_){}
if(deterministicContext&&deterministicContext.profile){
 var dp=deterministicContext.profile;
 if(dp.birthDate)document.getElementById("birth").value=dp.birthDate;
 if(dp.birthTime)document.getElementById("birthTime").value=dp.birthTime;
 if(dp.city)document.getElementById("city").value=dp.city;
}
function deterministicFacts(){
 if(!deterministicContext||!deterministicContext.result)return "";
 return "已固定計算的模式："+deterministicContext.mode+"；以下 JSON 是唯一可用的命盤/牌卡事實，不可自行重算或補資料："+JSON.stringify(deterministicContext.result).slice(0,16000);
}
function profile(){
 return "稱呼："+(document.getElementById("profileName").value||"未提供")+"；"+
  "出生日期："+document.getElementById("birth").value+"；"+
  "出生時間："+(document.getElementById("birthTime").value||"未提供")+"；"+
  "出生城市："+(document.getElementById("city").value||"未提供")+"；"+
  "主題："+document.getElementById("focus").value;
}
function lastContext(last){
 if(!last||!last.turns||!last.turns.length)return "";
 return last.turns.slice(-6).map(function(t){
  return (t.input?"使用者："+t.input+"\n":"")+(t.output?"老師："+t.output:"");
 }).join("\n");
}
function toneInstruction(){
 var v=document.getElementById("tone").value;
 if(v==="gentle")return "語氣溫和但不要空泛安慰，仍要給具體觀察。";
 if(v==="evidence")return "不要急著下結論，多用問題確認使用者真實背景，再提出可驗證的小步驟。";
 return "先講結論，再補一兩個理由，保持直接。";
}
function fortuneSystem(){
 return "你是 Crew Fortune 的 Live 命理老師。以使用者提供的固定計算結果與當下問題做娛樂性、自我反思型對話。"+
  toneInstruction()+
  "若提供 deterministic 計算結果，它就是唯一事實來源；不可自行重算八字、牌卡、星體位置或補不存在的資料。"+
  "不要宣稱命定事實，不做醫療、法律、投資或重大決策指令。一次只講 2-4 句，先講一個重點，再讓使用者追問。";
}
function openingPrompt(){
 if(continueContext){
  return profile()+"。"+deterministicFacts()+"。以下是上次最後幾輪，請自然接著聊，不要重新做整份分析：\n"+lastContext(continueContext);
 }
 if(deterministicContext&&deterministicContext.result){
  return profile()+"。"+deterministicFacts()+"。使用者剛從正式結果頁過來。請不要重新算，先用 2-3 句指出這份結果最值得注意的一點，再問他想深入哪個部分。";
 }
 return profile()+"。現在請先用繁體中文講一個和「"+document.getElementById("focus").value+"」最相關的觀察，控制在 3 句內，最後問我想先深入哪一點。";
}
var fortuneUI;
fortuneUI=CrewLiveUI.bind({
 pageKey:"fortune",
 labels:{user:"你",ai:"老師"},
 idleModelLabel:"Live teacher",
 speakingLabel:"老師說話中",
 notStartedText:"先開始問老師",
 endedText:"已結束。",
 validate:function(){return (deterministicContext&&deterministicContext.result)||document.getElementById("birth").value?"":"先填出生日期"},
 voice:function(){return document.getElementById("voice").value},
 system:fortuneSystem,
 openingPrompt:openingPrompt,
 historyTitle:function(){return document.getElementById("focus").value+" · Live"},
 onContinueLast:function(last){continueContext=last;CrewAI.toast("接著上次對話");fortuneUI.start()},
 onStarted:function(){continueContext=null}
});
document.getElementById("textAsk").onclick=async function(){
 if(!document.getElementById("birth").value){CrewAI.toast("先填出生日期");return}
 if(!CrewAI.requireKey())return;
 var q=document.getElementById("textQ").value.trim(),res=document.getElementById("textResult");
 if(!q){CrewAI.toast("先輸入問題");return}
 CrewAI.busy(this,true,"整理中…");res.classList.remove("empty");
 try{
  res.textContent=await CrewAI.call(profile()+"\n問題："+q+"\n請在 180 字內做務實的反思型整理。",{preferLive:false,maxOutputTokens:450})
 }catch(e){res.textContent=e.message}finally{CrewAI.busy(this,false)}
};
