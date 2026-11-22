/* Koolo private fortune report lab: public JS asset; no secrets or private data in source. */

(function(){
"use strict";
var path="/api/fortune/report-lab",pagePath=location.pathname,chart=document.getElementById("chart"),button=document.getElementById("generate");
var msg=document.getElementById("message"),chooser=document.getElementById("chooser"),reportEl=document.getElementById("report");
var records=[];
var ELS=["木","火","土","金","水"],COLORS=["#648676","#cb846a","#bda36b","#88949f","#60859e"];
function node(id){return document.getElementById(id)}
function say(text){msg.textContent=text}
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
  if(!response.ok)throw Error((obj&&obj.error||"API_ERROR")+"（HTTP "+response.status+"）");
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
 var q=[node("question1").value.trim(),node("question2").value.trim()].filter(Boolean);
 if(q.length<1||q.some(function(t){return t.length<5||t.length>160}))throw Error("請填入至少一題，並將每題控制在 5–160 字。");
 return {fourPillars:String(x.fourPillars||""),dayMaster:String(x.dayMaster||""),
 dayMasterElement:String(x.dayMasterElement||""),strength:String(x.dayMasterStrength||""),weighted:weighted,
 counts:{resource:number(x.careerProfile&&x.careerProfile.resourceCount),output:number(x.careerProfile&&x.careerProfile.outputCount),
 officer:number(x.careerProfile&&x.careerProfile.officerCount),directWealth:number(x.wealthProfile&&x.wealthProfile.directWealthCount),
 indirectWealth:number(x.wealthProfile&&x.wealthProfile.indirectWealthCount)},
 luck:{ganZhi:String(x.currentLuckPillar&&x.currentLuckPillar.ganZhi||"")},
 annual:annual.map(function(v){return{year:v.year,ganZhi:v.ganZhi,themes:Array.isArray(v.themes)?v.themes.slice(0,4):[]}}),
 relations:Array.isArray(x.natalInteractions)?x.natalInteractions.slice(0,5):[],questions:q};
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
   btn.disabled=x.status!=="ready";btn.addEventListener("click",function(){openReport(x.id)});
   container.appendChild(btn)
  })
 }catch(e){node("history").textContent="無法讀取測試紀錄："+e.message}
}
function text(id,value){node(id).textContent=String(value==null?"":value)}
function showBook(x){
 if(!x||x.status!=="ready"||!x.facts||!x.chapters){say("報告尚未完成");return}
 var f=x.facts,c=x.chapters;
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
 text("meta","私密驗收 · "+x.model+" · "+(x.usage&&x.usage.outputTokens||0)+" output tokens");
 chooser.hidden=true;reportEl.hidden=false;window.scrollTo(0,0)
}
async function openReport(id){
 try{say("");var x=await api("?report="+encodeURIComponent(id));if(x.report&&x.report.status==="ready"){
  window.history.replaceState(null,"",pagePath+"#id="+encodeURIComponent(id));showBook(x.report)
 }else say("報告尚未完成，請稍後再試")}
 catch(e){say("開啟失敗："+e.message)}
}
button.addEventListener("click",async function(){
 try{
  var r=records[Number(chart.value)];if(!r)throw Error("請先選擇命盤");
  var facts=pickFacts(r);button.disabled=true;button.textContent="正在製作命書…";
  say("AI 正在撰寫並檢查 10 頁命書，請保持此頁開啟。");
  var x=await api("",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({requestId:crypto.randomUUID(),facts:facts})});
  window.history.replaceState(null,"",pagePath+"#id="+encodeURIComponent(x.report.id));
  showBook(x.report)
 }catch(e){say("製作未完成："+e.message+"。請檢查本機命盤與 Cloudflare 設定。")}
 finally{button.disabled=records.length===0;button.textContent="產生專屬命書（測試）";history()}
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

