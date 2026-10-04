(function(global){
  "use strict";
  var FALLBACK=["gemini-3.5-flash-lite","gemini-3.1-flash-lite","gemini-3.5-flash","gemini-3.6-flash","gemini-3.8-flash","gemini-2.5-flash-lite","gemini-2.5-flash"];
  function cleanJson(text){
    text=String(text||"").trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\`\`\`$/,"").trim();
    var start=text.indexOf("{"),end=text.lastIndexOf("}");
    if(start>=0&&end>start)text=text.slice(start,end+1);
    return JSON.parse(text);
  }
  async function discover(){
    try{
      var r=await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key="+encodeURIComponent(CrewAI.key()));
      if(!r.ok)return[];
      var d=await r.json();
      return (d.models||[]).filter(function(m){
        return Array.isArray(m.supportedGenerationMethods)&&m.supportedGenerationMethods.indexOf("generateContent")>=0;
      }).map(function(m){
        return String(m.name||"").replace(/^models\//,"");
      }).filter(function(n){
        return /^gemini-/i.test(n)&&!/image|tts|live|transcribe|embed/i.test(n);
      });
    }catch(_){return[]}
  }
  async function callModel(model,prompt,images,opt){
    opt=opt||{};
    var parts=[{text:prompt}];
    (images||[]).forEach(function(img){
      parts.push({inlineData:{mimeType:img.mimeType||"image/jpeg",data:img.data}});
    });
    var body={
      contents:[{role:"user",parts:parts}],
      generationConfig:{
        temperature:typeof opt.temperature==="number"?opt.temperature:.35,
        maxOutputTokens:opt.maxOutputTokens||1600,
        responseMimeType:opt.json?"application/json":"text/plain"
      }
    };
    var controller=new AbortController();
    var timer=setTimeout(function(){controller.abort()},opt.timeoutMs||20000);
    try{
      var r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-goog-api-key":CrewAI.key()},
        body:JSON.stringify(body),
        signal:controller.signal
      });
      var data=await r.json().catch(function(){return{}});
      if(!r.ok)throw new Error(model+" "+((data.error&&data.error.message)||r.status));
      var partsOut=((data.candidates||[])[0]&&data.candidates[0].content&&data.candidates[0].content.parts)||[];
      var textOut=partsOut.map(function(p){return p.text||""}).join("").trim();
      if(!textOut)throw new Error(model+" empty response");
      return opt.json?cleanJson(textOut):textOut;
    }finally{clearTimeout(timer)}
  }
  async function generate(prompt,images,opt){
    if(!CrewAI.key())throw new Error("尚未設定 Gemini API key");
    var found=await discover(),seen={},models=FALLBACK.concat(found).filter(function(m){
      if(!m||seen[m])return false;
      seen[m]=1;
      return true;
    });
    var errors=[];
    for(var i=0;i<models.length;i++){
      try{return await callModel(models[i],prompt,images,opt)}
      catch(e){errors.push(e.message)}
    }
    throw new Error("圖片分析模型都無法使用："+errors.slice(-3).join(" | "));
  }
  global.CrewGeminiVision={generate:generate};
})(window);