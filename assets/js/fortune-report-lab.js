/* Koolo private fortune report lab: public JS asset; no secrets or private data in source. */

(function(){
"use strict";
var path="/api/fortune/report-lab",pagePath=location.pathname,chart=document.getElementById("chart"),button=document.getElementById("generate");
var msg=document.getElementById("message"),chooser=document.getElementById("chooser"),reportEl=document.getElementById("report");
var records=[],submitting=false,pendingRequest=null;
var PENDING_KEY="koolo_fortune_lab_pending_v1";
function rememberPending(item){
 pendingRequest=item;
 try{
  if(typeof sessionStorage!=="undefined"){
   if(item)sessionStorage.setItem(PENDING_KEY,JSON.stringify(item));
   else sessionStorage.removeItem(PENDING_KEY);
  }
 }catch{/* Storage must not prevent report creation. */}
}
function getPending(chartId){
 var value=pendingRequest;
 try{
  if(typeof sessionStorage!=="undefined"){
   var saved=JSON.parse(sessionStorage.getItem(PENDING_KEY)||"null");
   if(saved)value=saved;
  }
 }catch{/* No session storage access is still safe within one page load. */}
 return value&&value.chartId===chartId&&/^[a-f0-9-]{36}$/i.test(value.requestId)?value:null;
}
var ELS=["木","火","土","金","水"],COLORS=["#648676","#cb846a","#bda36b","#88949f","#60859e"];
function node(id){return document.getElementById(id)}
function say(text){msg.textContent=text}
function failedDescription(report){
 var code=report&&report.progress&&report.progress.lastFailure||"GENERATION_FAILED";
 var meaning=code==="QUALITY_CHECK_FAILED"||code==="GEMINI_INVALID_JSON"||code==="GEMINI_EMPTY"?
  "本章內容未通過品質檢查":code.startsWith("GEMINI_UPSTREAM_")||code==="AI_TIMEOUT"?
  "Gemini 服務暫時無法完成這一章":"本章製作暫時失敗";
 return meaning+"（"+code+"）。已完成的章節仍保存在製作紀錄，按原紀錄可接續，不需要重做整份命書。";
}
function unexpectedApiResponse(response){
 var status=response.status,kind=(response.headers.get("content-type")||"").toLowerCase();
 if(response.type==="opaqueredirect"||(status>=300&&status<400))
  return "命書 API 被重新導向（登入驗證可能已過期）。請重新登入 Koolo／Cloudflare Access，再回到管理後台重試。";
 if(kind.includes("html")){
  if(status===200)return "命書 API 回傳網頁而非資料（HTTP 200）。請檢查 Cloudflare Pages 的 /api/fortune/report-lab Function 是否部署且沒有被重新導向。";
  if(status>=500)return "Cloudflare 回傳 HTML 錯誤頁（HTTP "+status+"）。可能是 AI 生成逾時或 Pages Function 執行錯誤，請查看 Cloudflare 即時日誌。";
  return "命書 API 被 HTML 頁面攔截（HTTP "+status+"），請檢查 Cloudflare Access、路由與登入狀態。";
 }
 return "命書 API 沒有回傳 JSON（HTTP "+status+"，類型 "+(kind||"未提供")+"）。請檢查 Cloudflare Pages Function。";
}
async function api(query,init){
 var options=Object.assign({credentials:"same-origin",cache:"no-store",redirect:"manual"},init||{});
 options.headers=Object.assign({"Accept":"application/json"},init&&init.headers||{});
 var isGeneration=options.method==="POST",controller=isGeneration?new AbortController():null,timer=null;
 if(controller){
  options.signal=controller.signal;
  timer=setTimeout(function(){controller.abort()},85000);
 }
 try{
  var response=await fetch(path+(query||""),options);
  if(response.type==="opaqueredirect"||(response.status>=300&&response.status<400))
   throw Error(unexpectedApiResponse(response));
  if(!(response.headers.get("content-type")||"").toLowerCase().includes("json"))
   throw Error(unexpectedApiResponse(response));
  var obj;
  try{obj=await response.json()}catch{throw Error("命書 API JSON 格式錯誤（HTTP "+response.status+"），請查看 Cloudflare Pages 日誌。")}
  if(!response.ok){
   var apiError=obj&&typeof obj.error==="string"&&/^[A-Z][A-Z0-9_]{1,55}$/.test(obj.error)?obj.error:null;
   if(!apiError){
    // Cloudflare/proxy JSON errors may be 502 with {errors:[...]} rather than
    // the first-party {error:"..."} contract. Do not show untrusted raw text.
    var marker=response.headers.get("x-koolo-fortune-lab-api");
    var ray=response.headers.get("cf-ray")||"";
    var rayLabel=/^[A-Za-z0-9-]{8,80}$/.test(ray)?"；Ray ID "+ray:"";
    var source=marker==="v1"?"命書 API 異常回應":"Cloudflare／代理層回應（非命書 API 格式）";
    throw Error(source+"（HTTP "+response.status+"）"+rayLabel+"。請至 Cloudflare Pages Functions 日誌查同時段錯誤，勿再重設 Key 或 SQL。");
   }
   var failure=Error(apiError+"（HTTP "+response.status+"）");
   failure.code=apiError;
   if(obj&&typeof obj.id==="string"&&/^[a-f0-9-]{36}$/i.test(obj.id))failure.reportId=obj.id;
   if(obj&&typeof obj.status==="string")failure.reportStatus=obj.status;
   throw failure;
  }
  if(!obj||typeof obj!=="object")throw Error("命書 API 回傳資料格式無效");
  return obj;
 }catch(error){
  if(controller&&controller.signal.aborted)throw Error("AI 命書請求超過 85 秒仍未完成。請檢查 Cloudflare 生成記錄，避免直接重複送出。");
  throw error;
 }finally{if(timer!==null)clearTimeout(timer)}
}
function number(x){var n=Number(x);return Number.isInteger(n)?Math.max(0,Math.min(24,n)):0}
function getRecords(){
 try{var x=JSON.parse(localStorage.getItem("crew_fortune_readings_v2")||"[]");
  return Array.isArray(x)?x.filter(function(r){return r&&r.mode==="bazi"&&r.result&&typeof r.id==="string"}).slice(0,30):[]
 }catch{return []}
}
function pickFacts(r){
 var x=r.result||{},now=new Date();
 var year=new Date(now.getTime()+28800000).getUTCFullYear();
 var annual=(x.annualTimeline||[]).filter(function(v){return v.year>=year&&v.year<=year+2}).sort(function(a,b){return a.year-b.year});
 if(annual.length!==3)throw Error("此命盤缺少接下來三年的計算資料，請重新算一次八字。");
 var weighted={};ELS.forEach(function(e){weighted[e]=Number(x.weightedFiveElements&&x.weightedFiveElements[e]||0)});
 return {fourPillars:String(x.fourPillars||""),dayMaster:String(x.dayMaster||""),
 dayMasterElement:String(x.dayMasterElement||""),strength:String(x.dayMasterStrength||""),weighted:weighted,
 counts:{resource:number(x.careerProfile&&x.careerProfile.resourceCount),output:number(x.careerProfile&&x.careerProfile.outputCount),
 officer:number(x.careerProfile&&x.careerProfile.officerCount),directWealth:number(x.wealthProfile&&x.wealthProfile.directWealthCount),
 indirectWealth:number(x.wealthProfile&&x.wealthProfile.indirectWealthCount)},
 luck:{ganZhi:String(x.currentLuckPillar&&x.currentLuckPillar.ganZhi||"")},
 annual:annual.map(function(v){return{year:v.year,ganZhi:v.ganZhi,themes:Array.isArray(v.themes)?v.themes.slice(0,4):[]}}),
 relations:Array.isArray(x.natalInteractions)?x.natalInteractions.slice(0,5):[]};
}
function selectCharts(){
 // All chart history is local. This lookup must finish synchronously, not spin
 // while the separate, possibly slower D1 report-list request is pending.
 try{
  records=getRecords();chart.replaceChildren();
  if(records.length===0){
   var empty=document.createElement("option");empty.value="";empty.textContent="這個瀏覽器沒有已保存的八字命盤";
   chart.appendChild(empty);button.disabled=true;
   node("chartStatus").textContent="沒有找到八字命盤。請先在同一個 Koolo 網域算一次，再回來重新讀取。PWA 與其他網域的瀏覽器資料不會自動共用。";
   return;
  }
  records.forEach(function(r,i){
   var option=document.createElement("option");option.value=String(i);
   option.textContent=String(r.result.fourPillars||"八字命盤")+" · "+String(r.createdAt||"").slice(0,10);
   chart.appendChild(option);
  });
  chart.value="0";button.disabled=false;
  node("chartStatus").textContent="已找到 "+records.length+" 份本機八字命盤。";
 }catch(error){
  records=[];button.disabled=true;
  node("chartStatus").textContent="讀取本機命盤失敗，請重新載入頁面或回到命理頁重新計算。";
  console.error("[fortune report lab] chart init failed",error);
 }
}
async function history(){
 try{
  var result=await api("?list=1"),container=node("history");container.replaceChildren();
  if(result.items.length===0){container.textContent="目前尚無測試命書";return}
  result.items.forEach(function(x){
   var btn=document.createElement("button");
   btn.type="button";btn.textContent=new Date(x.createdAt*1000).toLocaleString("zh-TW")+
    " · "+(x.status==="ready"?"開啟命書":x.status==="generating"?"製作中":"生成未完成");
   btn.disabled=false;btn.addEventListener("click",function(){openReport(x.id)});
   container.appendChild(btn)
  })
 }catch(e){node("history").textContent="無法讀取測試紀錄："+e.message}
}
function text(id,value){node(id).textContent=String(value==null?"":value)}
function showBook(x){
 if(!x||x.status!=="ready"||!x.facts||!x.chapters){say("報告尚未完成");return}
 var f=x.facts,c=x.chapters,legacy=x.version!=="bazi-private-lab-v2";
 // Earlier saved books keep their original Q&A structure and must not be
 // silently rewritten or mislabeled as the new character portrait.
 text("section8Tag",legacy?"A PERSONAL LETTER":"INNER MOTIVATIONS");
 text("section8Subtag",legacy?"YOUR QUESTIONS":"INNER WORLD");
 text("section8Heading",legacy?"寫給你的話":"你的內在動機與壓力反應");
 text("section8Intro",legacy?"寫給正在思考人生的你":"那些在選擇、挫折與轉折時浮現的內心節奏");
 text("section9Tag",legacy?"YOUR NEXT 30 DAYS":"GROWTH & DIRECTION");
 text("section9Subtag",legacy?"A PRACTICAL PLAN":"YOUR PATH");
 text("section9Heading",legacy?"接下來的 30 天，你可以這樣走":"適合你的成長方向與生活節奏");
 text("section9Intro",legacy?"把命理中的反思化成真實行動，從能做到的小事開始。":"發揮既有的優勢，也為習慣與選擇保留新的可能。");
 ["preface","personality","career","relationships","timing","letter","plan"].forEach(function(k){text(k,c[k])});
 text("coverYear",new Date(x.createdAt*1000).getFullYear());text("pillars2",f.fourPillars);text("master2",f.dayMaster+" · "+f.element+" · "+f.strength);
 text("signals","日主："+f.dayMaster+"（"+f.element+"）；當前大運："+(f.luck||"未提供")+"。"+
  (f.relations.length?"原局互動："+f.relations.join("、")+"。":""));
 text("careerFacts","印星 "+f.counts.resource+" · 食傷 "+f.counts.output+" · 官殺 "+f.counts.officer+
  " · 正財 "+f.counts.directWealth+" · 偏財 "+f.counts.indirectWealth+"。這些是已計算的十神記號，非實際收入預測。");
 var bars=node("elements");bars.replaceChildren();
 var max=Math.max.apply(Math,ELS.map(function(el){return f.weighted[el]}));
 ELS.forEach(function(el,i){
  var row=document.createElement("div");row.className="element-row";
  var label=document.createElement("b");label.textContent=el;
  var track=document.createElement("div");track.className="element-bar";
  var fill=document.createElement("span");fill.style.width=Math.round(f.weighted[el]/max*100)+"%";fill.style.setProperty("--bar-color",COLORS[i]);track.appendChild(fill);
  var val=document.createElement("small");val.textContent=Number(f.weighted[el]).toFixed(1);
  row.append(label,track,val);bars.appendChild(row);
 });
 var timeline=node("timeline");timeline.replaceChildren();
 f.annual.forEach(function(y){
  var line=document.createElement("article"),year=document.createElement("b"),desc=document.createElement("span");
  year.textContent=String(y.year);desc.textContent=y.ganZhi+" · "+(y.themes.join("／")||"年度觀察");line.append(year,desc);timeline.appendChild(line)
 });
 text("meta","私密驗收 · "+x.model+" · "+(x.usage&&x.usage.outputTokens||0)+" output tokens"+(legacy?" · 舊版命書":""));
 chooser.hidden=true;reportEl.hidden=false;window.scrollTo(0,0)
}
async function continueReport(id){
 // A single request creates at most one chapter; each chapter is committed to
 // D1 before the next starts. Reopening this report resumes from its checkpoint.
 var deadline=Date.now()+240000,completed=-1;
 while(Date.now()<deadline){
  var result;
  try{
   result=await api("",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"advance",reportId:id})});
  }catch(error){
   // An edge-generated 502 can obscure a completed D1 checkpoint. Re-read
   // the same owner-scoped report ID before exposing a generic proxy error.
   try{
    var latest=await api("?report="+encodeURIComponent(id));
    if(!latest.report||!latest.report.progress)throw error;
    result=latest;
   }catch{throw error}
  }
  if(result.report&&result.report.status==="failed")
   throw Error(failedDescription(result.report));
  if(result.report&&result.report.status==="ready"){
   rememberPending(null);
   window.history.replaceState(null,"",pagePath+"#id="+encodeURIComponent(id));
   showBook(result.report);return;
  }
  var step=result.report&&result.report.progress;
  if(!step)throw Error("進度暫時無法確認，請從製作紀錄重新開啟，不會重複產生已完成章節。");
  completed=step.completed;
  say("正在撰寫專屬命書：已完成 "+completed+"／"+step.total+" 個章節。"+
   (step.busy?"正在等待上一次寫作完成…":"逐章保存中，連線中斷也能接續。"));
  await new Promise(function(resolve){setTimeout(resolve,step.busy?2500:400)});
 }
 say("已完成 "+Math.max(0,completed)+"／7 個章節，可從製作紀錄接續，不需重新開始。");
}
async function waitForReport(id){
 // A duplicate POST must never start a second upstream generation while
 // the previous one is still running. Poll this user's saved report instead.
 var deadline=Date.now()+40000;
 while(Date.now()<deadline){
  await new Promise(function(resolve){setTimeout(resolve,3000)});
  var result=await api("?report="+encodeURIComponent(id));
  if(result.report&&result.report.status==="ready"){
   rememberPending(null);
   window.history.replaceState(null,"",pagePath+"#id="+encodeURIComponent(id));
   showBook(result.report);
   return;
  }
  if(result.report&&result.report.status==="failed"){
   rememberPending(null);
   throw Error(failedDescription(result.report));
  }
 }
 say("命書還在製作中，稍後按「產生專屬命書」可繼續查看進度，不會重複生成。");
}
async function openReport(id){
 try{
  say("");
  var x=await api("?report="+encodeURIComponent(id));
  if(x.report&&x.report.status==="ready"){
   rememberPending(null);
   window.history.replaceState(null,"",pagePath+"#id="+encodeURIComponent(id));
   showBook(x.report);
  }else if(x.report&&x.report.progress){
   say("找到未完成的命書，從已保存的章節接續製作。");
   await continueReport(id);
  }else if(x.report&&x.report.status==="generating"){
   say("命書仍在製作中，正在查看進度…");
   await waitForReport(id);
  }else say("這份舊版命書未完成，請選擇原命盤重新產生。");
 }catch(e){say("開啟失敗："+e.message)}
}
button.addEventListener("click",async function(){
 if(submitting)return;
 submitting=true;
 var pending=null;
 try{
  var r=records[Number(chart.value)];if(!r)throw Error("請先選擇命盤");
  var facts=pickFacts(r),chartId=String(r.id);
  pending=getPending(chartId)||{chartId:chartId,requestId:crypto.randomUUID()};
  rememberPending(pending);
  button.disabled=true;button.textContent="正在製作命書…";
  say("正在製作專屬命書，請保持此頁開啟。");
  var x=await api("",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({requestId:pending.requestId,facts:facts,pipeline:"chapters"})});
  if(x.report&&x.report.status==="ready"){
   rememberPending(null);
   window.history.replaceState(null,"",pagePath+"#id="+encodeURIComponent(x.report.id));
   showBook(x.report);
  }else if(x.report&&x.report.status==="generating"&&x.report.progress){
   say("已開始分章製作，完成一章就會保存一次。");
   await continueReport(x.report.id);
  }else if(x.report&&x.report.status==="generating"){
   say("這份命書已開始製作，正在查詢進度，不會重複生成。");
   await waitForReport(x.report.id);
  }else throw Error("命書回應狀態異常，請稍後再查看已有的命書。");
 }catch(e){
  if(e&&e.code==="DUPLICATE_REQUEST"&&e.reportId){
   // Backward compatibility with older deployments returning 409 for every
   // repeated request, regardless of completion state.
   try{await openReport(e.reportId)}catch{say("已找到上一筆命書，請稍後查看製作紀錄。")}
  }else{
   if(e&&["BAD_JSON","BAD_CONTENT_TYPE","INVALID_CHART","DAILY_LIMIT","LOGIN_REQUIRED","AI_NOT_CONFIGURED"].includes(e.code))rememberPending(null);
   say("製作未完成："+(e instanceof Error?e.message:"請求失敗")+"。若連線中斷，下一次按鈕會先確認原請求，不會直接重複製作。");
  }
 }finally{
  submitting=false;button.disabled=records.length===0;
  button.textContent="產生專屬命書（測試）";
  history();
 }
});
// Initialize chart picker before any optional bindings / network requests.
selectCharts();
node("refreshCharts")?.addEventListener("click",selectCharts);
node("back")?.addEventListener("click",function(){reportEl.hidden=true;chooser.hidden=false;window.history.replaceState(null,"",pagePath);window.scrollTo(0,0)});
node("print")?.addEventListener("click",function(){window.print()});
void history();
var match=/^#id=([0-9a-f-]{36})$/i.exec(location.hash);
if(match)openReport(match[1]);
})();

