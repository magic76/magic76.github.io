
(function(global){
  var KEY_LOCAL="crew_gemini_api_key",KEY_SESSION="crew_gemini_api_key_session";
  var LIVE=["gemini-3.8-live","gemini-3.1-flash-live-preview"];
  var TEXT=["gemini-3.5-flash-lite","gemini-3.1-flash-lite","gemini-3.5-flash","gemini-3.6-flash","gemini-3.7-flash","gemini-3.8-flash","gemini-2.5-flash-lite","gemini-2.5-flash","gemini-2.0-flash","gemini-1.5-flash"];
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
    opt=opt||{};return new Promise(function(resolve,reject){
      var done=false,text="",ws,t=setTimeout(function(){fail(new Error(model+" timeout"))},15000);
      function cleanup(){clearTimeout(t);if(ws&&ws.readyState===WebSocket.OPEN){try{ws.close(1000,"done")}catch(_){}}}
      function ok(v){if(done)return;done=true;cleanup();lastModel=model;resolve(v)}
      function fail(e){if(done)return;done=true;cleanup();reject(e instanceof Error?e:new Error(String(e)))}
      try{
        ws=new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key="+encodeURIComponent(key()));
        ws.onopen=function(){ws.send(JSON.stringify({setup:{model:"models/"+model,generationConfig:{responseModalities:["TEXT"],temperature:typeof opt.temperature==="number"?opt.temperature:.8,maxOutputTokens:opt.maxOutputTokens||1000},systemInstruction:{parts:[{text:opt.system||"你是 Crew 的 AI 助手。"}]}}}))};
        ws.onmessage=function(ev){var m;try{m=JSON.parse(ev.data)}catch(_){return}
          if(m.setupComplete){ws.send(JSON.stringify({clientContent:{turns:[{role:"user",parts:[{text:prompt}]}],turnComplete:true}}));return}
          if(m.serverContent){var p=m.serverContent.modelTurn&&m.serverContent.modelTurn.parts;if(Array.isArray(p))p.forEach(function(x){if(x&&x.text)text+=x.text});if(m.serverContent.turnComplete){text=text.trim();text?ok(text):fail(new Error(model+" empty"))}}
        };
        ws.onerror=function(){fail(new Error(model+" WebSocket error"))};ws.onclose=function(e){if(!done)fail(new Error(model+" closed "+(e.code||"")))}
      }catch(e){fail(e)}
    })
  }
  async function discover(){
    if(Array.isArray(discovered))return discovered;
    try{var r=await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key="+encodeURIComponent(key()));if(!r.ok)throw new Error("models "+r.status);var d=await r.json();
      discovered=(d.models||[]).filter(function(m){return Array.isArray(m.supportedGenerationMethods)&&m.supportedGenerationMethods.indexOf("generateContent")>=0}).map(function(m){return String(m.name||"").replace(/^models\//,"")}).filter(function(n){return /^gemini-/i.test(n)&&!/image|tts|live|transcribe|embed/i.test(n)});
      return discovered
    }catch(_){discovered=[];return[]}
  }
  async function textCall(model,prompt,opt){
    opt=opt||{};var body={systemInstruction:{parts:[{text:opt.system||"你是 Crew 的 AI 助手。"}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:typeof opt.temperature==="number"?opt.temperature:.8,maxOutputTokens:opt.maxOutputTokens||1000}};
    if(opt.json)body.generationConfig.responseMimeType="application/json";
    var r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key()},body:JSON.stringify(body)});
    var d;try{d=await r.json()}catch(_){d=null}if(!r.ok)throw new Error(d&&d.error&&d.error.message?d.error.message:model+" HTTP "+r.status);
    var parts=d&&d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts;var out=(parts||[]).map(function(p){return p.text||""}).join("").trim();if(!out)throw new Error(model+" empty");lastModel=model;return out
  }
  async function call(prompt,opt){
    opt=opt||{};if(!key())throw new Error("尚未設定 Gemini API key");var errs=[];
    if(opt.preferLive!==false){for(var i=0;i<LIVE.length;i++){try{return await liveCall(LIVE[i],prompt,opt)}catch(e){errs.push(LIVE[i]+": "+e.message)}}}
    var found=await discover(),seen={},models=TEXT.concat(found).filter(function(m){if(!m||seen[m])return false;seen[m]=1;return true});
    for(var j=0;j<models.length;j++){try{return await timeout(textCall(models[j],prompt,opt),15000,models[j])}catch(e){errs.push(models[j]+": "+e.message)}}
    throw new Error("所有模型都失敗："+errs.slice(-3).join(" | "))
  }
  async function test(){var out=await call("只回覆 OK",{system:"這是連線測試，只回覆 OK。",temperature:0,maxOutputTokens:20});return{ok:/ok/i.test(out),model:lastModel||"Gemini"}}
  function busy(btn,on,label){if(!btn)return;if(on){btn.dataset.old=btn.textContent;btn.textContent=label||"處理中…";btn.disabled=true;btn.classList.add("busy")}else{btn.textContent=btn.dataset.old||btn.textContent;btn.disabled=false;btn.classList.remove("busy");delete btn.dataset.old}}
  function nav(active){document.querySelectorAll(".navitem").forEach(function(x){x.classList.toggle("active",x.dataset.nav===active)});refreshStatus()}
  function historyGet(name){try{return JSON.parse(localStorage.getItem("crew_history_"+name)||"[]")}catch(_){return[]}}
  function historyAdd(name,item){var arr=historyGet(name);arr.unshift(Object.assign({id:Date.now(),ts:new Date().toISOString()},item));arr=arr.slice(0,20);localStorage.setItem("crew_history_"+name,JSON.stringify(arr));return arr}
  function esc(s){return String(s||"").replace(/[&<>"']/g,function(ch){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]})}
  global.CrewAI={key:key,saveKey:saveKey,clearKey:clearKey,refreshStatus:refreshStatus,requireKey:requireKey,call:call,test:test,lastModel:function(){return lastModel},toast:toast,busy:busy,nav:nav,historyGet:historyGet,historyAdd:historyAdd,esc:esc}
})(window);
