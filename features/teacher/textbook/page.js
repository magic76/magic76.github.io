(function(){
  "use strict";
  CrewAI.nav("teacher");

  var MAX_PAGES=4;
  var draft=[];
  var session=null;
  var currentPage=0;
  var liveUI=null;

  var setupPanel=document.getElementById("setupPanel");
  var studyPanel=document.getElementById("studyPanel");
  var draftPages=document.getElementById("draftPages");
  var count=document.getElementById("materialCount");
  var prepareButton=document.getElementById("prepareLesson");

  function esc(value){return CrewAI.esc(value)}
  function formatKb(bytes){return Math.max(1,Math.round((bytes||0)/1024))+" KB"}

  function savePrefs(){
    localStorage.setItem("crew_textbook_target",document.getElementById("targetLanguage").value);
    localStorage.setItem("crew_textbook_level",document.getElementById("level").value);
  }

  function loadPrefs(){
    var lang=localStorage.getItem("crew_textbook_target");
    var level=localStorage.getItem("crew_textbook_level");
    if(lang)document.getElementById("targetLanguage").value=lang;
    if(level)document.getElementById("level").value=level;
  }

  function renderDraft(){
    count.textContent=draft.length+" / "+MAX_PAGES;
    prepareButton.disabled=!draft.length;
    if(!draft.length){
      draftPages.innerHTML='<div class="textbook-empty">加入 1–4 張教材或照片。順序就是老師上課的順序。</div>';
      return;
    }
    draftPages.innerHTML=draft.map(function(img,index){
      return '<div class="textbook-page-row" data-index="'+index+'">'+
        '<img src="'+img.preview+'" alt="素材 '+(index+1)+'">'+
        '<div><strong>素材 '+(index+1)+'</strong><small>'+img.width+'×'+img.height+' · '+formatKb(img.bytes)+'</small></div>'+
        '<div class="textbook-order">'+
        '<button data-action="up" '+(index===0?'disabled':'')+'>↑</button>'+
        '<button data-action="down" '+(index===draft.length-1?'disabled':'')+'>↓</button>'+
        '<button data-action="remove">×</button>'+
        '</div></div>';
    }).join("");
    draftPages.querySelectorAll("[data-action]").forEach(function(button){
      button.onclick=function(){
        var row=button.closest("[data-index]"),index=Number(row.dataset.index),action=button.dataset.action;
        if(action==="remove")draft.splice(index,1);
        if(action==="up"&&index>0){var item=draft.splice(index,1)[0];draft.splice(index-1,0,item)}
        if(action==="down"&&index<draft.length-1){var item2=draft.splice(index,1)[0];draft.splice(index+1,0,item2)}
        renderDraft();
      };
    });
  }

  async function addFiles(files){
    files=Array.prototype.slice.call(files||[]);
    if(!files.length)return;
    var remaining=MAX_PAGES-draft.length;
    if(remaining<=0){CrewAI.toast("一次最多 4 張素材");return}
    files=files.slice(0,remaining);
    for(var i=0;i<files.length;i++){
      try{
        CrewAI.toast("正在處理第 "+(i+1)+" 張…");
        var image=await CrewLiveUI.prepareImage(files[i],{maxSide:1600,quality:.84});
        draft.push(image);
        renderDraft();
      }catch(error){CrewAI.toast(error.message)}
    }
  }

  function currentPlanPage(){
    return session&&session.plan&&session.plan.pages?session.plan.pages[currentPage]||{}:{};
  }

  function renderStudy(){
    if(!session||!session.images||!session.images.length)return;
    setupPanel.hidden=true;studyPanel.hidden=false;
    currentPage=Math.max(0,Math.min(currentPage,session.images.length-1));
    session.currentPage=currentPage;
    CrewTextbookStore.save(session).catch(function(){});

    var image=session.images[currentPage],page=currentPlanPage();
    document.getElementById("lessonTitle").textContent=session.plan&&session.plan.title||"教材陪讀";
    document.getElementById("lessonObjective").textContent=session.plan&&session.plan.objective||"逐頁理解教材內容。";
    document.getElementById("studyImage").src=image.preview;
    document.getElementById("pageIndicator").textContent=(currentPage+1)+" / "+session.images.length;
    document.getElementById("pageSummary").textContent=page.summary||"先觀察圖片內容。";
    document.getElementById("pageQuestion").textContent=page.question||"這一頁最重要的內容是什麼？";
    document.getElementById("pagePractice").textContent=page.practice||"請用自己的話說說看。";
    document.getElementById("pageKeywords").innerHTML=(page.keywords||[]).map(function(k){return '<span class="keyword">'+esc(k)+'</span>'}).join("")||'<span class="keyword">依圖片內容</span>';
    document.getElementById("prevPage").disabled=currentPage===0;
    document.getElementById("nextPage").disabled=currentPage===session.images.length-1;
  }

  function sendCurrentPage(){
    var active=liveUI&&liveUI.getSession?liveUI.getSession():null;
    if(!active||!active.ready||!session)return false;
    var image=session.images[currentPage];
    return active.sendImage(image,{
      prompt:CrewTextbookLesson.pagePrompt(session,currentPage),
      statusText:"老師正在看第 "+(currentPage+1)+" 頁…"
    });
  }

  function bindLive(){
    liveUI=CrewLiveUI.bind({
      pageKey:"teacher_textbook",
      labels:{user:"你",ai:"老師"},
      idleModelLabel:"Live tutor",
      speakingLabel:"老師說話中",
      notStartedText:"先開始陪讀",
      endedText:"本次陪讀已結束。",
      voice:function(){return localStorage.getItem("crew_teacher_voice")||"Kore"},
      system:function(){
        return "你是 Crew Teacher 的教材陪讀老師。學生正在閱讀自己上傳的教材圖片。"+
          "目標語言："+session.targetLanguage+"，程度："+session.level+"。"+
          "你必須依照目前頁面圖片與備課重點教學。一次只教一小段，先問再講，學生回答後再往下。"+
          "不要一次念完整頁面，不要假裝看到圖片以外的內容。學生卡住時可以用繁體中文短暫輔助。";
      },
      openingPrompt:function(){return ""},
      historyTitle:function(){return (session&&session.plan&&session.plan.title||"教材陪讀")+" · 第 "+(currentPage+1)+" 頁"},
      onStarted:function(){sendCurrentPage()}
    });
  }

  async function prepareLesson(){
    if(!draft.length)return;
    if(!CrewAI.requireKey())return;
    savePrefs();
    CrewAI.busy(prepareButton,true,"AI 備課中…");
    try{
      var images=draft.map(function(x){return {data:x.data,mimeType:x.mimeType}});
      var plan=await CrewTextbookLesson.prepare(images,{
        targetLanguage:document.getElementById("targetLanguage").value,
        level:document.getElementById("level").value
      });
      session={
        id:CrewDB.id("textbook"),
        targetLanguage:document.getElementById("targetLanguage").value,
        level:document.getElementById("level").value,
        images:draft.slice(),
        plan:plan,
        currentPage:0
      };
      currentPage=0;
      await CrewTextbookStore.save(session);
      renderStudy();
      CrewAI.toast(plan.fallbackReason?"備課完成（使用基礎教案）":"備課完成");
    }catch(error){CrewAI.toast(error.message)}
    finally{CrewAI.busy(prepareButton,false)}
  }

  async function resumeLast(){
    var last=await CrewTextbookStore.last();
    if(!last)return;
    session=last;
    currentPage=Number(last.currentPage)||0;
    renderStudy();
  }

  async function renderResume(){
    var last=await CrewTextbookStore.last();
    var wrap=document.getElementById("resumeWrap");
    if(!last){wrap.hidden=true;return}
    wrap.hidden=false;
    wrap.innerHTML='<div class="textbook-resume"><div><strong>繼續上次教材陪讀</strong><small>'+esc(last.plan&&last.plan.title||"我的教材")+' · 第 '+((Number(last.currentPage)||0)+1)+' / '+last.images.length+' 頁</small></div><button class="btn small" id="resumeLesson">繼續讀 →</button></div>';
    document.getElementById("resumeLesson").onclick=resumeLast;
  }

  document.getElementById("takePhoto").onclick=function(){document.getElementById("cameraInput").click()};
  document.getElementById("pickPhotos").onclick=function(){document.getElementById("galleryInput").click()};
  document.getElementById("cameraInput").onchange=function(){addFiles(this.files);this.value=""};
  document.getElementById("galleryInput").onchange=function(){addFiles(this.files);this.value=""};
  prepareButton.onclick=prepareLesson;
  document.getElementById("targetLanguage").onchange=savePrefs;
  document.getElementById("level").onchange=savePrefs;
  document.getElementById("prevPage").onclick=function(){if(currentPage>0){currentPage--;renderStudy();sendCurrentPage()}};
  document.getElementById("nextPage").onclick=function(){if(session&&currentPage<session.images.length-1){currentPage++;renderStudy();sendCurrentPage()}};
  document.getElementById("backToSetup").onclick=function(){
    var active=liveUI&&liveUI.getSession?liveUI.getSession():null;
    if(active)active.stop({reason:"user-stop",silentStatus:true});
    studyPanel.hidden=true;setupPanel.hidden=false;session=null;draft=[];renderDraft();
  };

  loadPrefs();
  renderDraft();
  bindLive();
  renderResume();
})();