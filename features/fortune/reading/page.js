(function(){
  "use strict";
  CrewAI.nav("fortune");
  var modeEl=document.getElementById("fortuneMode"),resultArea=document.getElementById("resultArea"),calculateButton=document.getElementById("calculateFortune");
  var modeCopy={
    bazi:["八字","四柱、十神、大運與五行結構。"],
    tarot:["塔羅生命靈數","出生牌、生命道路、巔峰、挑戰與流年。"],
    vedic:["印度星盤","Lahiri sidereal、Whole Sign、Nakshatra 與 Vimshottari Dasha。"]
  };

  function loadProfile(){
    var p=CrewFortuneProfile.load();
    ["birthDate","birthTime","gender","city","latitude","longitude","utcOffset","aiStyle"].forEach(function(id){
      if(p[id]!=null&&document.getElementById(id))document.getElementById(id).value=p[id];
    });
  }
  function profile(){
    var p={};
    ["birthDate","birthTime","gender","city","latitude","longitude","utcOffset","aiStyle"].forEach(function(id){p[id]=document.getElementById(id).value});
    CrewFortuneProfile.save(p);
    return p;
  }
  function updateMode(){
    var mode=modeEl.value,copy=modeCopy[mode];
    document.getElementById("modeTitle").textContent=copy[0];
    document.getElementById("modeLead").textContent=copy[1]+" 先固定計算，再交給 AI 解讀。";
    document.getElementById("timeWrap").hidden=mode==="tarot";
    document.getElementById("genderWrap").hidden=mode!=="bazi";
    document.getElementById("vedicFields").hidden=mode!=="vedic";
    history.replaceState(null,"","fortune-reading.html?mode="+mode);
  }
  function validate(mode,p){
    if(!p.birthDate)return"請選擇生日";
    if((mode==="bazi"||mode==="vedic")&&!p.birthTime)return"請填出生時間";
    if(mode==="vedic"&&(!p.latitude||!p.longitude||!p.utcOffset))return"印度星盤需要出生地經緯度與 UTC offset";
    return"";
  }
  function calculate(mode,p){
    if(mode==="bazi")return CrewFortuneBaZi.calculate(p.birthDate,p.birthTime,Number(p.gender),new Date());
    if(mode==="tarot")return CrewFortuneTarot.calculate(p.birthDate,new Date());
    return CrewFortuneVedic.calculate(p,new Date());
  }
  function render(mode,result){
    if(mode==="bazi")return CrewFortuneBaZiRender.render(result);
    if(mode==="tarot")return CrewFortuneTarotRender.render(result);
    return CrewFortuneVedicRender.render(result);
  }
  function stylePrompt(style){
    if(style==="strict")return"語氣嚴謹，清楚區分固定計算結果、流派差異與主觀解讀，不說命定。";
    if(style==="funny")return"可以有一點幽默，但不能拿死亡、疾病、災難或重大損失開玩笑，也不能把結果說成命定。";
    return"用白話、直接、有重點的繁體中文。";
  }
  async function aiInterpret(mode,p,result,reading){
    if(!CrewAI.key())return;
    var box=document.getElementById("aiReading");
    if(!box)return;
    box.textContent="AI 正在把固定計算結果翻成白話…";
    var compact=JSON.stringify(result).slice(0,18000);
    try{
      var text=await CrewAI.call(
        "你是 Crew Fortune 的命理內容解讀者。模式："+modeCopy[mode][0]+"。"+
        stylePrompt(p.aiStyle)+
        "只能根據後面的 deterministic 計算資料解讀，不可以自行重算、不可以補不存在的星體/十神/牌。"+
        "輸出格式：核心重點 / 工作與現實節奏 / 關係與內在 / 接下來可觀察的 3 件事 / 一句提醒。"+
        "娛樂與自我反思用途；不得提供醫療、法律、投資或重大人生決策指令。\n資料："+compact,
        {preferLive:false,temperature:.45,maxOutputTokens:1200}
      );
      box.textContent=text;
      reading.ai=text;
      CrewFortuneProfile.addHistory(reading);
      localStorage.setItem("crew_fortune_live_context",JSON.stringify(reading));
    }catch(error){box.textContent="AI 解讀暫時失敗，但上面的固定計算結果仍有效。\n"+error.message}
  }
  function actions(reading){
    var action='<section class="fortune-result-card"><div class="actions"><button class="btn" id="askTeacher">問老師這份結果</button><button class="btn secondary" id="shareReading">分享摘要</button></div></section>';
    resultArea.insertAdjacentHTML("beforeend",action);
    document.getElementById("askTeacher").onclick=function(){
      localStorage.setItem("crew_fortune_live_context",JSON.stringify(reading));
      location.href="fortune.html?from=reading";
    };
    document.getElementById("shareReading").onclick=async function(){
      var text=modeCopy[reading.mode][0]+"\n"+(reading.ai||reading.summary||"")+"\n\nCrew Fortune";
      try{
        if(navigator.share)await navigator.share({title:"Crew Fortune",text:text});
        else{await navigator.clipboard.writeText(text);CrewAI.toast("已複製分享文字")}
      }catch(_){}
    };
  }
  async function run(){
    var mode=modeEl.value,p=profile(),error=validate(mode,p);if(error){CrewAI.toast(error);return}
    CrewAI.busy(calculateButton,true,"計算中…");
    try{
      var result=calculate(mode,p);
      var reading={id:"reading_"+Date.now(),mode:mode,createdAt:new Date().toISOString(),profile:p,result:result,summary:modeCopy[mode][0]+" · "+(result.fourPillars||result.birthCardDisplay||("Lagna "+result.lagnaSign))};
      CrewFortuneProfile.addHistory(reading);
      localStorage.setItem("crew_fortune_live_context",JSON.stringify(reading));
      resultArea.innerHTML=render(mode,result)+'<section class="fortune-result-card"><h3>AI 白話解讀</h3><div class="fortune-ai" id="aiReading">準備解讀…</div></section>';
      actions(reading);
      aiInterpret(mode,p,result,reading);
    }catch(error){resultArea.innerHTML='<section class="fortune-result-card"><h3>無法計算</h3><p class="meta">'+CrewAI.esc(error.message)+'</p></section>'}
    finally{CrewAI.busy(calculateButton,false)}
  }

  loadProfile();
  var requested=new URLSearchParams(location.search).get("mode");
  if(requested&&modeCopy[requested])modeEl.value=requested;
  updateMode();
  modeEl.onchange=updateMode;
  calculateButton.onclick=run;
})();