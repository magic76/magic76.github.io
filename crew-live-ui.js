
(function(global){
  "use strict";

  function byId(id){return document.getElementById(id);}
  function durationText(ms){
    var sec=Math.max(0,Math.floor((Number(ms)||0)/1000));
    var min=Math.floor(sec/60);
    return min+":"+String(sec%60).padStart(2,"0");
  }
  function lastKey(pageKey){return "crew_live_last_"+pageKey;}
  function readLast(pageKey){
    try{return JSON.parse(localStorage.getItem(lastKey(pageKey))||"null");}
    catch(_){return null;}
  }
  function writeLast(pageKey,value){
    try{localStorage.setItem(lastKey(pageKey),JSON.stringify(value));}catch(_){}
  }
  function escapeText(value){
    return global.CrewAI&&CrewAI.esc?CrewAI.esc(value):String(value||"");
  }
  function transcriptText(turns,labels){
    labels=labels||{};
    var userLabel=labels.user||"你";
    var aiLabel=labels.ai||"AI";
    return (turns||[]).map(function(turn){
      var parts=[];
      if(turn.input)parts.push(userLabel+"："+turn.input);
      if(turn.output)parts.push(aiLabel+"："+turn.output);
      return parts.join("\n");
    }).filter(Boolean).join("\n\n");
  }
  function renderTurns(container,turns,labels){
    if(!container)return;
    labels=labels||{};
    var userLabel=labels.user||"你";
    var aiLabel=labels.ai||"AI";
    if(!turns||!turns.length){
      container.innerHTML='<div class="live-history-empty">完整對話會保留在這裡。</div>';
      return;
    }
    container.innerHTML=turns.map(function(turn){
      var html="";
      if(turn.input){
        html+='<div class="live-history-turn user"><small>'+escapeText(userLabel)+'</small><div>'+escapeText(turn.input)+'</div></div>';
      }
      if(turn.output){
        html+='<div class="live-history-turn ai"><small>'+escapeText(aiLabel)+'</small><div>'+escapeText(turn.output)+'</div></div>';
      }
      return html;
    }).join("");
    container.scrollTop=container.scrollHeight;
  }
  async function copyText(value){
    if(navigator.clipboard&&navigator.clipboard.writeText){
      await navigator.clipboard.writeText(value);
      return;
    }
    var area=document.createElement("textarea");
    area.value=value;
    area.style.position="fixed";
    area.style.opacity="0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  function bytesToBase64(bytes){
    var binary="",chunk=0x8000;
    for(var i=0;i<bytes.length;i+=chunk){
      binary+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(i+chunk,bytes.length)));
    }
    return btoa(binary);
  }

  async function prepareImage(file,options){
    options=options||{};
    if(!file||!/^image\//i.test(file.type||""))throw new Error("請選擇圖片檔");
    var maxSide=Math.max(480,Number(options.maxSide)||1600);
    var quality=Math.max(.45,Math.min(.92,Number(options.quality)||.82));
    var source=null,objectUrl="";
    try{
      if(global.createImageBitmap){
        try{
          source=await global.createImageBitmap(file,{imageOrientation:"from-image"});
        }catch(_){
          try{source=await global.createImageBitmap(file);}catch(__){}
        }
      }
      if(!source){
        objectUrl=URL.createObjectURL(file);
        source=await new Promise(function(resolve,reject){
          var img=new Image();
          img.onload=function(){resolve(img)};
          img.onerror=function(){reject(new Error("圖片讀取失敗"))};
          img.src=objectUrl;
        });
      }

      var width=source.width||source.naturalWidth||1;
      var height=source.height||source.naturalHeight||1;
      var scale=Math.min(1,maxSide/Math.max(width,height));
      var outW=Math.max(1,Math.round(width*scale));
      var outH=Math.max(1,Math.round(height*scale));
      var canvas=document.createElement("canvas");
      canvas.width=outW;canvas.height=outH;
      var ctx=canvas.getContext("2d",{alpha:false});
      ctx.fillStyle="#fff";ctx.fillRect(0,0,outW,outH);
      ctx.drawImage(source,0,0,outW,outH);

      var blob=await new Promise(function(resolve,reject){
        canvas.toBlob(function(value){
          if(value)resolve(value);else reject(new Error("圖片壓縮失敗"));
        },"image/jpeg",quality);
      });
      var bytes=new Uint8Array(await blob.arrayBuffer());
      var base64=bytesToBase64(bytes);
      return {
        data:base64,
        mimeType:"image/jpeg",
        preview:"data:image/jpeg;base64,"+base64,
        width:outW,
        height:outH,
        bytes:bytes.byteLength,
        name:file.name||"photo.jpg"
      };
    }finally{
      if(source&&typeof source.close==="function"){
        try{source.close()}catch(_){}
      }
      if(objectUrl){
        try{URL.revokeObjectURL(objectUrl)}catch(_){}
      }
    }
  }

  function patchSession(pageKey,ts,patch){
    patch=patch||{};
    var last=readLast(pageKey);
    var updatedLast=null;
    if(last&&(!ts||last.ts===ts)){
      updatedLast=Object.assign({},last,patch);
      writeLast(pageKey,updatedLast);
    }

    try{
      var key="crew_history_"+pageKey;
      var arr=JSON.parse(localStorage.getItem(key)||"[]");
      var changed=false;
      arr=arr.map(function(item){
        if(!changed&&item&&(!ts||item.ts===ts)){
          changed=true;
          return Object.assign({},item,patch);
        }
        return item;
      });
      if(changed)localStorage.setItem(key,JSON.stringify(arr));
    }catch(_){}

    return updatedLast;
  }

  function bind(config){
    config=config||{};
    var pageKey=config.pageKey||"live";
    var stage=byId("liveStage");
    var statusEl=byId("liveStatus");
    var badge=byId("liveBadge");
    var modelEl=byId("liveModel");
    var startBtn=byId("startLive");
    var stopBtn=byId("stopLive");
    var muteBtn=byId("muteLive");
    var interruptBtn=byId("interruptLive");
    var timerEl=byId("liveTimer");
    var volume=byId("liveVolume");
    var volumeValue=byId("liveVolumeValue");
    var userLine=byId("userLine");
    var aiLine=byId("aiLine");
    var historyEl=byId("liveTranscriptList");
    var copyBtn=byId("copyTranscript");
    var lastSessionBtn=byId("continueLast");

    var session=null;
    var timer=null;
    var saved=false;
    var latestTurns=[];
    var currentState="idle";
    var initialVolume=Math.max(0,Math.min(100,Number(localStorage.getItem("crew_live_volume")||100)));

    if(volume){
      volume.value=String(initialVolume);
      if(volumeValue)volumeValue.textContent=initialVolume+"%";
      volume.oninput=function(){
        var val=Math.max(0,Math.min(100,Number(volume.value)||0));
        localStorage.setItem("crew_live_volume",String(val));
        if(volumeValue)volumeValue.textContent=val+"%";
        if(session)session.setVolume(val);
      };
    }

    function setCurrentLine(el,text){
      if(!el)return;
      var span=el.querySelector("span");
      if(span)span.textContent=text||"";
      el.classList.toggle("show",!!text);
    }

    function setState(state){
      currentState=state;
      if(stage)stage.dataset.state=state;
      if(!badge)return;
      if(state==="ready")badge.textContent="LIVE";
      else if(state==="speaking")badge.textContent=config.speakingLabel||"AI 說話中";
      else if(state==="connecting"||state==="requesting-mic")badge.textContent="CONNECTING";
      else if(state==="error")badge.textContent="ERROR";
      else badge.textContent="READY";
    }

    function updateControls(){
      var active=!!session&&(session.running||session.ready);
      if(startBtn){
        startBtn.hidden=active;
        startBtn.disabled=currentState==="connecting"||currentState==="requesting-mic";
      }
      if(stopBtn){
        stopBtn.hidden=!active;
        stopBtn.disabled=false;
      }
      if(muteBtn){
        muteBtn.hidden=!active;
        muteBtn.disabled=!session||!session.ready;
        muteBtn.textContent=session&&session.micMuted?"開啟麥克風":"麥克風靜音";
        muteBtn.classList.toggle("active",!!(session&&session.micMuted));
      }
      if(interruptBtn){
        interruptBtn.hidden=!active;
        interruptBtn.disabled=!session||!session.ready;
      }
    }

    function stopTimer(){
      if(timer)clearInterval(timer);
      timer=null;
    }
    function startTimer(){
      stopTimer();
      function render(){
        if(timerEl)timerEl.textContent=session?durationText(session.getDurationMs()):"0:00";
      }
      render();
      timer=setInterval(render,1000);
    }

    function titleForSession(){
      if(typeof config.historyTitle==="function")return config.historyTitle();
      return config.historyTitle||"Live";
    }

    function saveSession(reason){
      if(saved||!latestTurns.length)return null;
      saved=true;
      var snapshot={
        title:titleForSession(),
        preview:transcriptText(latestTurns,config.labels).slice(0,180),
        turns:latestTurns.slice(),
        durationMs:session?session.getDurationMs():0,
        model:session?session.model:"",
        reason:reason||"ended",
        ts:new Date().toISOString()
      };
      writeLast(pageKey,snapshot);
      if(global.CrewAI&&CrewAI.historyAdd)CrewAI.historyAdd(pageKey,snapshot);
      if(lastSessionBtn)lastSessionBtn.hidden=false;
      if(typeof config.onSessionSaved==="function"){
        try{config.onSessionSaved(snapshot)}catch(_){}
      }
      return snapshot;
    }

    function restore(){
      stopTimer();
      setState("idle");
      session=null;
      if(modelEl)modelEl.textContent=config.idleModelLabel||"Live";
      if(timerEl)timerEl.textContent="0:00";
      updateControls();
    }

    function handleTerminal(info){
      saveSession(info&&info.status||"terminal");
      if(typeof config.onTerminal==="function")config.onTerminal(info,latestTurns.slice());
      restore();
    }

    async function start(){
      if(session)return;
      var validation=typeof config.validate==="function"?config.validate():"";
      if(validation){
        if(global.CrewAI&&CrewAI.toast)CrewAI.toast(validation);
        return;
      }
      if(global.CrewAI&&CrewAI.requireKey&&!CrewAI.requireKey())return;

      saved=false;
      latestTurns=[];
      renderTurns(historyEl,latestTurns,config.labels);
      setCurrentLine(userLine,"");
      setCurrentLine(aiLine,"");
      setState("requesting-mic");
      updateControls();

      var system=typeof config.system==="function"?config.system():config.system;
      var opening=typeof config.openingPrompt==="function"?config.openingPrompt():config.openingPrompt;
      var voice=typeof config.voice==="function"?config.voice():config.voice;

      session=new global.CrewLive.Session({
        system:system||"",
        openingPrompt:opening||"",
        voice:voice||"Kore",
        volume:initialVolume,
        maxLiveAttempts:2,
        maxResumeAttempts:2,
        onStatus:function(value){
          if(statusEl)statusEl.textContent=value;
          if(typeof config.onStatus==="function")config.onStatus(value);
        },
        onState:function(value){
          setState(value);
          updateControls();
        },
        onSpeaking:function(value){
          if(value)setState("speaking");
          else if(session&&session.ready)setState("ready");
          updateControls();
        },
        onMicMuted:function(){updateControls();},
        onInputTranscript:function(text){setCurrentLine(userLine,text);},
        onOutputTranscript:function(text){setCurrentLine(aiLine,text);},
        onTranscriptTurn:function(turn,turns){
          latestTurns=turns.slice();
          renderTurns(historyEl,latestTurns,config.labels);
          if(typeof config.onTranscriptTurn==="function")config.onTranscriptTurn(turn,turns);
        },
        onTurnComplete:function(turn){
          if(typeof config.onTurnComplete==="function")config.onTurnComplete(turn);
        },
        onResumed:function(info){
          if(modelEl)modelEl.textContent=(session&&session.model?session.model:"Live")+" · resumed "+info.resumeCount;
          if(global.CrewAI&&CrewAI.toast)CrewAI.toast("長通話已自動續接");
        },
        onError:function(error){
          if(statusEl)statusEl.textContent="Live 連線問題："+error.message;
          if(typeof config.onError==="function")config.onError(error);
        },
        onTerminal:handleTerminal
      });

      try{
        await session.start();
        initialVolume=Number(localStorage.getItem("crew_live_volume")||100);
        session.setVolume(initialVolume);
        if(modelEl)modelEl.textContent=session.model;
        startTimer();
        updateControls();
        if(typeof config.onStarted==="function")config.onStarted(session);
      }catch(error){
        if(statusEl)statusEl.textContent=error.message;
        setState("error");
        session=null;
        updateControls();
      }
    }

    async function stop(){
      if(!session)return;
      var active=session;
      saveSession("user-stop");
      stopTimer();
      if(stopBtn)stopBtn.disabled=true;
      await active.stop({reason:"user-stop",silentStatus:true});
      if(session===active)restore();
      if(statusEl)statusEl.textContent=config.endedText||"已結束。";
    }

    if(startBtn)startBtn.onclick=start;
    if(stopBtn)stopBtn.onclick=stop;
    if(muteBtn)muteBtn.onclick=function(){
      if(!session||!session.ready)return;
      session.toggleMic();
      updateControls();
    };
    if(interruptBtn)interruptBtn.onclick=function(){
      if(!session||!session.ready)return;
      if(!session.interrupt()&&global.CrewAI&&CrewAI.toast)CrewAI.toast("目前無法打斷");
    };
    if(copyBtn)copyBtn.onclick=async function(){
      var text=transcriptText(latestTurns,config.labels);
      if(!text){
        if(global.CrewAI&&CrewAI.toast)CrewAI.toast("目前還沒有對話紀錄");
        return;
      }
      try{
        await copyText(text);
        if(global.CrewAI&&CrewAI.toast)CrewAI.toast("已複製完整對話");
      }catch(_){
        if(global.CrewAI&&CrewAI.toast)CrewAI.toast("複製失敗");
      }
    };

    document.querySelectorAll("[data-live-prompt]").forEach(function(button){
      button.onclick=function(){
        if(!session||!session.ready){
          if(global.CrewAI&&CrewAI.toast)CrewAI.toast(config.notStartedText||"先開始 Live");
          return;
        }
        session.sendText(button.dataset.livePrompt||"");
      };
    });

    if(lastSessionBtn){
      var last=readLast(pageKey);
      lastSessionBtn.hidden=!last;
      lastSessionBtn.onclick=function(){
        if(typeof config.onContinueLast==="function"){
          config.onContinueLast(readLast(pageKey));
        }
      };
    }

    global.addEventListener("pagehide",function(){
      if(session)session.stop({reason:"user-stop",silentStatus:true,emitTerminal:false});
    });

    renderTurns(historyEl,latestTurns,config.labels);
    setState("idle");
    updateControls();

    return {
      start:start,
      stop:stop,
      sendText:function(text){return session&&session.ready?session.sendText(text):false;},
      getSession:function(){return session;},
      getTurns:function(){return latestTurns.slice();},
      getLast:function(){return readLast(pageKey);},
      renderLast:function(){
        var last=readLast(pageKey);
        renderTurns(historyEl,last&&last.turns||[],config.labels);
      }
    };
  }

  global.CrewLiveUI={
    bind:bind,
    last:readLast,
    patchSession:patchSession,
    prepareImage:prepareImage,
    durationText:durationText,
    transcriptText:transcriptText
  };
})(window);
