
(function(global){
  var KEY_LOCAL="crew_gemini_api_key",KEY_SESSION="crew_gemini_api_key_session";
  var LIVE=["gemini-3.8-live","gemini-3.1-flash-live-preview"];
  // Match the Android GeminiApiClient.CANDIDATE_MODELS order for all text tasks.
  var TEXT=["gemini-3.6-flash","gemini-3.5-flash-lite","gemini-3.5-flash","gemini-3.0-flash","gemini-3-flash","gemini-2.5-flash","gemini-2.0-flash","gemini-1.5-flash"];
  var discovered=null,lastModel="",toastTimer;

  function key(){return (localStorage.getItem(KEY_LOCAL)||sessionStorage.getItem(KEY_SESSION)||"").trim()}
  function saveKey(v,remember){localStorage.removeItem(KEY_LOCAL);sessionStorage.removeItem(KEY_SESSION);discovered=null;if(remember)localStorage.setItem(KEY_LOCAL,v.trim());else sessionStorage.setItem(KEY_SESSION,v.trim());refreshStatus()}
  function clearKey(){localStorage.removeItem(KEY_LOCAL);sessionStorage.removeItem(KEY_SESSION);discovered=null;lastModel="";refreshStatus()}
  function refreshStatus(){
    document.querySelectorAll("[data-gemini-status]").forEach(function(el){
      var ok=!!key();el.classList.toggle("connected",ok);
      var text=el.querySelector("[data-gemini-status-text]");if(text)text.textContent=ok?"Gemini 已設定":"設定 Gemini";
    })
  }
  function toast(msg){var el=document.getElementById("toast");if(!el)return;el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.remove("show")},2200)}
  function requireKey(){if(key())return true;toast("先設定 Gemini API key");setTimeout(function(){location.href="settings.html"},300);return false}
  function timeout(p,ms,label){return Promise.race([p,new Promise(function(_,rej){setTimeout(function(){rej(new Error((label||"Gemini")+" timeout"))},ms)})])}

  function liveCall(model,prompt,opt){
    opt=opt||{};
    return new Promise(function(resolve,reject){
      var done=false;
      var transcript="";
      var textFallback="";
      var ws=null;
      var timer=null;

      function armTimeout(ms,label){
        clearTimeout(timer);
        timer=setTimeout(function(){
          fail(new Error(model+" "+label));
        },ms);
      }

      function cleanup(){
        clearTimeout(timer);
        if(ws&&ws.readyState===WebSocket.OPEN){
          try{ws.close(1000,"done")}catch(_){}
        }
      }

      function ok(value){
        if(done)return;
        done=true;
        cleanup();
        lastModel=model;
        resolve(value);
      }

      function fail(err){
        if(done)return;
        done=true;
        cleanup();
        reject(err instanceof Error?err:new Error(String(err)));
      }

      try{
        armTimeout(8000,"connect timeout");
        ws=new WebSocket(
          "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key="+encodeURIComponent(key())
        );

        ws.onopen=function(){
          ws.send(JSON.stringify({
            setup:{
              model:"models/"+model,
              generationConfig:{
                responseModalities:["AUDIO"],
                speechConfig:{
                  voiceConfig:{
                    prebuiltVoiceConfig:{voiceName:"Kore"}
                  }
                },
                temperature:typeof opt.temperature==="number"?opt.temperature:.8,
                maxOutputTokens:opt.maxOutputTokens||800
              },
              outputAudioTranscription:{},
              systemInstruction:{
                parts:[{text:opt.system||"你是 Crew 的 AI 助手。回答精準、自然、簡短。"}]
              }
            }
          }));
        };

        ws.onmessage=function(ev){
          var m;
          try{m=JSON.parse(ev.data)}catch(_){return}

          if(m.setupComplete){
            armTimeout(22000,"response timeout");
            ws.send(JSON.stringify({
              clientContent:{
                turns:[{
                  role:"user",
                  parts:[{text:prompt}]
                }],
                turnComplete:true
              }
            }));
            return;
          }

          if(m.serverContent){
            var s=m.serverContent;
            var ot=s.outputTranscription||s.output_transcription;
            if(ot&&ot.text) transcript+=ot.text;

            var turn=s.modelTurn||s.model_turn;
            var parts=turn&&turn.parts;
            if(Array.isArray(parts)){
              parts.forEach(function(part){
                if(part&&part.text) textFallback+=part.text;
              });
            }

            if(s.turnComplete||s.turn_complete){
              var out=(transcript||textFallback).trim();
              if(out) ok(out);
              else fail(new Error(model+" empty transcription"));
            }
          }
        };

        ws.onerror=function(){
          fail(new Error(model+" WebSocket error"));
        };

        ws.onclose=function(e){
          if(done)return;
          var out=(transcript||textFallback).trim();
          if(out) ok(out);
          else fail(new Error(model+" closed "+(e&&e.code?e.code:"")));
        };
      }catch(e){
        fail(e);
      }
    })
  }

  async function discover(){
    if(Array.isArray(discovered))return discovered;
    try{var r=await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key="+encodeURIComponent(key()));if(!r.ok)throw new Error("models "+r.status);var d=await r.json();
      discovered=(d.models||[]).filter(function(m){return Array.isArray(m.supportedGenerationMethods)&&m.supportedGenerationMethods.indexOf("generateContent")>=0}).map(function(m){return String(m.name||"").replace(/^models\//,"")}).filter(function(n){return /^gemini-/i.test(n)&&!/image|tts|live|transcribe|embed/i.test(n)});
      return discovered
    }catch(_){discovered=[];return[]}
  }
  function modelError(kind,message,code){
    var e=new Error(message||"Gemini model request failed");e.kind=kind;e.status=code||0;return e;
  }
  function classifyTextFailure(status,reason,message){
    if(status===401||/api.?key.*(invalid|expired|not valid)|invalid.*api.?key/i.test(message))return"key";
    if(status===403&&/api key|api_key|permission_denied|key not authorized/i.test(reason+" "+message))return"key";
    if(status===429||reason==="RESOURCE_EXHAUSTED")return"quota";
    if(status===400||status===404||status===501||reason==="NOT_FOUND")return"model";
    return"service";
  }
  async function textCall(model,prompt,opt){
    opt=opt||{};
    var body={systemInstruction:{parts:[{text:opt.system||"你是 Crew 的 AI 助手。"}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:typeof opt.temperature==="number"?opt.temperature:.8,maxOutputTokens:opt.maxOutputTokens||1000}};
    if(opt.json)body.generationConfig.responseMimeType="application/json";
    if(typeof opt.thinking==="string"&&opt.thinking.trim())body.generationConfig.thinkingConfig={thinkingLevel:opt.thinking.trim()};
    var r,d,controller=typeof AbortController==="function"?new AbortController():null;
    var limit=Number.isFinite(opt.timeoutMs)&&opt.timeoutMs>0?opt.timeoutMs:15000,timer,timedOut=false;
    var request=(async function(){
      try{
        r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key()},body:JSON.stringify(body),signal:controller?controller.signal:undefined});
        try{d=await r.json()}catch(_){d=null}
      }catch(_){throw modelError("network",model+(timedOut?" request timeout":" network request failed"))}
    })();
    try{
      await Promise.race([request,new Promise(function(_,reject){
        timer=setTimeout(function(){
          timedOut=true;
          if(controller)controller.abort();
          reject(modelError("network",model+" request timeout"));
        },limit);
      })]);
    }finally{clearTimeout(timer)}
    if(!r.ok){
      var reason=String(d&&d.error&&d.error.status||"");
      var msg=String(d&&d.error&&d.error.message||"");
      var kind=classifyTextFailure(r.status,reason,msg);
      if(opt.thinking&&r.status===400){
        if(kind==="key")throw modelError("key",model+" HTTP "+r.status,r.status);
        throw modelError("response",model+" unsupported thinking configuration",400);
      }
      throw modelError(kind,model+" HTTP "+r.status,r.status);
    }
    var candidate=d&&d.candidates&&d.candidates[0];
    if(opt.requireComplete&&candidate&&candidate.finishReason==="MAX_TOKENS")throw modelError("response",model+" incomplete MAX_TOKENS");
    var parts=candidate&&candidate.content&&candidate.content.parts;
    var out=(parts||[]).map(function(p){return p.text||""}).join("").trim();
    if(!out)throw modelError("response",model+" empty response");
    if(opt.json){
      try{var parsed=JSON.parse(out);if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Invalid object")}
      catch(_){throw modelError("response",model+" invalid JSON")}
    }
    lastModel=model;return out;
  }
  async function call(prompt,opt){
    opt=opt||{};if(!key())throw modelError("key","尚未設定 Gemini API key");
    var errs=[],lastFailure=null,quotaFailure=null,networkFailure=null;
    if(opt.preferLive!==false){for(var i=0;i<LIVE.length;i++){try{return await liveCall(LIVE[i],prompt,opt)}catch(e){errs.push(LIVE[i]+": "+e.message)}}}
    var found=opt.strictModels?[]:await discover(),seen={},preferred=Array.isArray(opt.models)&&opt.models.length?opt.models:TEXT,models=(Array.isArray(opt.models)&&opt.models.length?preferred:TEXT.concat(found)).filter(function(m){if(!m||seen[m])return false;seen[m]=1;return true});
    for(var j=0;j<models.length;j++){
      try{return await textCall(models[j],prompt,opt)}
      catch(e){
        var failure=e&&e.kind?e:modelError("network",models[j]+" request timeout");
        if(failure.kind==="key")throw failure; // A bad key is not repaired by another model.
        if(failure.kind==="quota")quotaFailure=failure;
        if(failure.kind==="network")networkFailure=failure;
        lastFailure=failure;
        errs.push(models[j]+": "+failure.message);
      }
    }
    var terminal=quotaFailure||networkFailure||lastFailure||modelError("service","Gemini models unavailable");
    // Preserve only a safe reason and a bounded list of attempted model IDs.
    throw modelError(terminal.kind,"所有 Gemini 文字模型都未成功："+models.slice(0,8).join(" → "),terminal.status);
  }
  async function test(){var out=await call("只回覆 OK",{system:"這是連線測試，只回覆 OK。",temperature:0,maxOutputTokens:20});return{ok:/ok/i.test(out),model:lastModel||"Gemini"}}
  function busy(btn,on,label){if(!btn)return;if(on){btn.dataset.old=btn.textContent;btn.textContent=label||"處理中…";btn.disabled=true;btn.classList.add("busy")}else{btn.textContent=btn.dataset.old||btn.textContent;btn.disabled=false;btn.classList.remove("busy");delete btn.dataset.old}}
  function nav(active){document.querySelectorAll(".navitem").forEach(function(x){x.classList.toggle("active",x.dataset.nav===active)});refreshStatus()}
  function historyGet(name){try{return JSON.parse(localStorage.getItem("crew_history_"+name)||"[]")}catch(_){return[]}}
  function historyAdd(name,item){var arr=historyGet(name);arr.unshift(Object.assign({id:Date.now(),ts:new Date().toISOString()},item));arr=arr.slice(0,20);localStorage.setItem("crew_history_"+name,JSON.stringify(arr));return arr}
  function esc(s){return String(s||"").replace(/[&<>"']/g,function(ch){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]})}
  global.CrewAI={key:key,saveKey:saveKey,clearKey:clearKey,refreshStatus:refreshStatus,requireKey:requireKey,call:call,test:test,lastModel:function(){return lastModel},toast:toast,busy:busy,nav:nav,historyGet:historyGet,historyAdd:historyAdd,esc:esc};
  refreshStatus();
})(window);
