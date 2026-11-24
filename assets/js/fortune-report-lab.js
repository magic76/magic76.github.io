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
var CHAPTER_LABELS=["命盤輪廓","個性與優勢","工作與財運","人際與感情","運勢與時機","內在動機","成長方向"];
function node(id){return document.getElementById(id)}
function say(text){msg.textContent=text}
function failedDescription(report){
 var code=report&&report.progress&&report.progress.lastFailure||"GENERATION_FAILED";
 var meaning=code==="GEMINI_TRUNCATED"?"Gemini 這次沒有完整寫完本章":
  code==="GEMINI_INVALID_JSON"||code==="GEMINI_INVALID_FORMAT"?
  "Gemini 回傳格式不完整":code==="QUALITY_CHECK_FAILED"||code==="GEMINI_EMPTY"?
  "本章內容未通過品質檢查":code.startsWith("GEMINI_UPSTREAM_")||code==="AI_TIMEOUT"?
  "Gemini 服務暫時無法完成這一章":"本章製作暫時失敗";
 var count=Number(report&&report.progress&&report.progress.completed)||0;
 return meaning+"（"+code+"）。"+(count>0?"已保存 "+count+"／7 章；":"")+
  "已完成的章節仍保存在製作紀錄，按原紀錄可接續，不需要重做整份命書。";
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
   btn.type="button";
   var progress=x.progress&&Number.isInteger(x.progress.completed)?x.progress:null;
   var caption=x.status==="ready"?"開啟命書":progress?
    (x.status==="failed"?"繼續製作":"製作中")+" · 已完成 "+progress.completed+"／"+progress.total+" 章":
    x.status==="generating"?"製作中":"生成未完成";
   btn.textContent=new Date(x.createdAt*1000).toLocaleString("zh-TW")+" · "+caption;
   btn.disabled=false;btn.addEventListener("click",function(){openReport(x.id)});
   container.appendChild(btn)
  })
 }catch(e){node("history").textContent="無法讀取測試紀錄："+e.message}
}
function text(id,value){node(id).textContent=String(value==null?"":value)}
// A deliberately fictional, hand-authored book. Preview uses no API, Gemini,
// D1 or local chart. Never treat the fixture as a real person's paid report.
function sampleBook(){
 var year=new Date(Date.now()+28800000).getUTCFullYear();
 var chapters={
  preface:"你給人的第一印象通常是有主見、反應快，而且願意把事情推進。但真正熟悉你的人會發現，你並不只是在追求速度，也很在意彼此是不是能好好合作。當大家都還在觀望時，你往往會先找到一個可以開始的方向；等情況變得複雜，你又會花時間思考哪些細節值得堅持。這讓你在需要主動承擔的場合很有存在感，也可能讓你不知不覺把太多責任放在自己身上。你的特色不是一直往前衝，而是同時想把事情做好，也想讓身邊的人跟得上。",
  personality:"你做決定時，通常先憑直覺看見重點，再回頭確認細節是否可行。這種方式讓你面對變化時不容易停在原地，別人也容易感受到你的行動力。你擅長把抽象的想法變成具體方向，遇到阻礙也願意找另一條路。比較需要留意的是，你對自己的要求常常比表面看起來更高。當進度不如預期，你可能先加快腳步，而不是讓別人知道你正在承受壓力。適度把想法說清楚，能讓你的能力被理解，而不必每件事都靠自己完成。",
  career:"你比較容易在有明確目標、又保留一定自主空間的工作環境發揮。完全照表操作的事情，做久了可能讓你覺得難以施展；但如果所有規則都不清楚，你也會因為要反覆補洞而感到疲憊。你適合負責把混亂整理出方向，或把不同人的想法變成可執行的方案。在金錢和資源上，你傾向願意為長期有用的事投入，卻也可能因為看見機會而同時分散注意力。當你能分清哪些值得持續、哪些只是短暫興趣，整體步調會更穩定。",
  relationships:"你對重要的人通常不是只靠漂亮的話表達在意，而是會記得小事、主動處理問題，或在對方需要的時候伸手幫忙。你期待關係裡有信任，也希望彼此保有自己的空間。遇到意見不合時，你有時會先想解決辦法，卻忽略對方當下可能更需要被理解。這不代表你不重視感受，而是你習慣把關心化成行動。當你願意先聽完對方的想法，再提出自己的方式，關係往往更容易維持舒服的距離，也不必一直由你扛起所有安排。",
  timing:"接下來三年的重點並不完全一樣。"+year+" 年較適合整理手上已經開始的事情，把分散的心力集中在真正重要的方向；"+(year+1)+" 年可能更重視合作、關係與外界變化，如何與不同步調的人一起前進會成為值得留意的課題；"+(year+2)+" 年則有機會重新衡量長期目標，想清楚哪些承諾值得保留。這些描述是命盤呈現的象徵傾向，而非必定發生的事件。對你來說，最有幫助的不是急著抓住所有機會，而是在不同階段把心力放在合適的位置。",
  letter:"你看起來可以很獨立，遇到事情也常先想到自己能做些什麼，但內心其實很在意努力是不是有意義，以及自己的付出是否被真正看見。你不一定需要很多稱讚，卻希望重要的人理解你的用心。受挫時，你可能會把注意力轉向下一件可以完成的事，藉由行動重新找回掌控感。這樣的習慣讓你有韌性，也容易讓疲憊被藏得太深。當你不用一直證明自己能處理所有問題，原本用來緊繃防守的力氣，反而能回到真正值得你投入的人與事。",
  plan:"你的長期優勢，在於願意嘗試、能快速整理方向，也有把想法落地的能力。比起不斷增加新的目標，你更適合把少數真正重要的事情做深，讓累積逐漸產生力量。你可能不喜歡被單一模式限制，但有一些穩定的生活節奏，反而能讓你更自在地探索。遇到新的選擇時，你不必只看哪一條路最快，也可以看它是否符合你想長期維持的關係、工作方式與生活感受。當行動力與耐心開始互相配合，你更容易走出有自己風格的方向。"
 };
 return {demo:true,status:"ready",version:"bazi-private-lab-v2",createdAt:Math.floor(Date.now()/1000),
  model:"示範內容",usage:{promptTokens:0,outputTokens:0},
  facts:{fourPillars:"甲子 乙丑 丙寅 丁卯",dayMaster:"丙",element:"火",strength:"中和",
   weighted:{"木":32,"火":26,"土":18,"金":10,"水":14},counts:{resource:4,output:3,officer:2,directWealth:1,indirectWealth:2},
   luck:"庚午",relations:["外在表達與內心節奏有所拉扯"],annual:[0,1,2].map(function(n){
    return {year:year+n,ganZhi:["丙午","丁未","戊申"][n],themes:[["整理目標"],["合作關係"],["長期方向"]][n]}
   })},
  chapters:chapters};
}
var readerIndex=0,readerFlipTimer=null;
var readerTitles=["封面","你的整體樣貌","命盤特質","性格與優勢","工作與金錢","人際與感情","未來三年","內在世界","成長方向","封底"];
function readerSpread(){return !!(window.matchMedia&&window.matchMedia("(min-width:900px)").matches)}
function readerPages(){return document.querySelectorAll?Array.from(document.querySelectorAll("#bookPages .sheet")):[]}
function readerGo(index){
 var pages=readerPages(),count=pages.length;if(!count)return;
 var size=readerSpread()?2:1;
 var next=Math.max(0,Math.min(count-1,Math.floor(index/size)*size));
 var wasActive=pages.map(function(page){return /(?:^|\s)is-active(?:\s|$)/.test(page.className)});
 var turning=next!==readerIndex&&wasActive.some(Boolean);
 var forward=next>readerIndex;
 reportEl.dataset.direction=forward?"next":"prev";
 readerIndex=next;
 if(readerFlipTimer!==null){clearTimeout(readerFlipTimer);readerFlipTimer=null}
 var leaving=false;
 pages.forEach(function(page,i){
  var visible=i>=next&&i<next+size;
  // Always turn the right-hand leaf toward the left, even when navigating
  // to an earlier spread. Mobile turns its single visible page.
  var flipOut=turning&&wasActive[i]&&!visible&&
   (size===1||i%2===1);
  page.className=page.className.replace(/\s+is-active|\s+is-leaving/g,"")+
   (visible?" is-active":flipOut?" is-leaving":"");
  if(page.setAttribute)page.setAttribute("aria-hidden",visible?"false":"true");
  if(flipOut)leaving=true;
 });
 // The actual page turns over the new page, then returns to display:none.
 // Cancel old cleanup if the user swipes again before the animation ends.
 if(leaving)readerFlipTimer=setTimeout(function(){
  pages.forEach(function(page){page.className=page.className.replace(/\s+is-leaving/g,"")});
  readerFlipTimer=null;
 },600);
 text("pageCounter",(next+1)+(size>1&&next+1<count?"–"+Math.min(count,next+size):"")+" / "+count);
 text("pageTitle",readerTitles[next]||"命書");
 node("prevPage").disabled=next===0;
 node("nextPage").disabled=next+size>=count;
}

var readerFlip=null;
function flipSpread(index){
 var count=readerPages().length;
 var landscape=readerFlip.getOrientation()==="landscape";
 var first=landscape&&index>0&&index<count-1?1+2*Math.floor((index-1)/2):index;
 return {first:first,last:landscape&&first>0&&first<count-1?Math.min(first+1,count-1):first,count:count};
}
function syncFlip(){
 if(!readerFlip||reportEl.hidden)return;
 var spread=flipSpread(readerFlip.getCurrentPageIndex());
 readerIndex=spread.first;
 text("pageCounter",(spread.first+1)+(spread.last>spread.first?"–"+(spread.last+1):"")+" / "+spread.count);
 text("pageTitle",readerTitles[spread.first]||"命書");
 node("prevPage").disabled=spread.first===0;
 node("nextPage").disabled=spread.last===spread.count-1;
}
function flipLeaves(){
 return readerPages().map(function(page,i){
  var leaf=document.createElement("div"),copy=page.cloneNode(true);
  leaf.className="flip-leaf";
  if(i===0||i===readerPages().length-1)leaf.dataset.density="hard";
  copy.className=copy.className.replace(/\s+is-active|\s+is-leaving/g,"");
  copy.removeAttribute("aria-hidden");
  copy.removeAttribute("id");
  copy.querySelectorAll("[id]").forEach(function(el){el.removeAttribute("id")});
  leaf.appendChild(copy);
  return leaf;
 });
}
function openFlip(){
 var host=node("flipBook");
 if(!window.St||typeof window.St.PageFlip!=="function"||
    (window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches))return false;
 try{
  host.hidden=false;
  var leaves=flipLeaves();
  if(readerFlip){
   readerFlip.updateFromHtml(leaves);
   readerFlip.turnToPage(0);
   readerFlip.update();
  }else{
   readerFlip=new window.St.PageFlip(host,{width:450,height:740,size:"stretch",
    minWidth:320,maxWidth:520,minHeight:1,maxHeight:900,autoSize:true,usePortrait:true,
    showCover:true,drawShadow:true,maxShadowOpacity:.48,flippingTime:850,
    mobileScrollSupport:true,swipeDistance:45,disableFlipByClick:true,showPageCorners:true});
   ["init","flip","changeOrientation","update"].forEach(function(event){readerFlip.on(event,syncFlip)});
   readerFlip.on("changeState",function(e){if(e.data==="read")syncFlip()});
   readerFlip.loadFromHTML(leaves);
  }
  reportEl.classList.add("flip-enhanced");
  syncFlip();
  return true;
 }catch(error){
  console.error("[fortune-reader] PageFlip unavailable",error);
  host.hidden=true;
  reportEl.classList.remove("flip-enhanced");
  return false;
 }
}
function readerStep(delta){
 if(readerFlip&&reportEl.classList.contains("flip-enhanced")){
  var state=readerFlip.getState();
  if(state==="flipping"||state==="user_fold")return;
  var spread=flipSpread(readerFlip.getCurrentPageIndex());
  if(delta>0&&spread.last<spread.count-1)readerFlip.flipNext("bottom");
  else if(delta<0&&spread.first>0)readerFlip.flipPrev("bottom");
  return;
 }
 readerGo(readerIndex+delta*(readerSpread()?2:1));
}

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
 text("signals","你的核心特質偏向"+f.element+"所象徵的主動與表達。"+
  (f.relations.length?"命盤也呈現出不同想法與生活節奏之間的拉扯。":""));
 var workSignals=[
  {v:f.counts.resource,label:"學習、整理資訊與吸收經驗"},
  {v:f.counts.output,label:"表達、創作與推動想法"},
  {v:f.counts.officer,label:"承擔責任與掌握規則"},
  {v:f.counts.directWealth+f.counts.indirectWealth,label:"安排資源與評估風險"}
 ].sort(function(a,b){return b.v-a.v});
 text("careerFacts","命盤比較突出的工作傾向包括「"+workSignals.slice(0,2).map(function(x){return x.label}).join("」與「")+"」。這是做事習慣的側寫，不代表實際收入。");
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
  year.textContent=String(y.year);desc.textContent=y.themes.join("／")||"這一年的生活重心";line.append(year,desc);timeline.appendChild(line)
 });
 text("meta",x.demo?"示範預覽 · 虛構命盤與範例文字 · 未呼叫 AI、不會儲存資料":
  "你的專屬命書已完成"+(legacy?" · 舊版命書":""));
 chooser.hidden=true;reportEl.hidden=false;
 reportEl.className="reader-open"+(x.demo?" demo-report":"");
 readerIndex=0;
 readerGo(0);
 if(!openFlip())node("flipBook").hidden=true;
 window.scrollTo(0,0)
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
  say("已完成 "+completed+"／"+step.total+" 章。"+
   (step.busy?"上一章正在寫作中…":
    completed<step.total?"正在撰寫「"+CHAPTER_LABELS[completed]+"」，每章完成就會保存。":
    "正在整理完整命書…"));
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
   var detail=e instanceof Error?e.message:"請求失敗";
   say("製作未完成："+detail+
    (detail.includes("按原紀錄可接續")?"":"。若連線中斷，下一次按鈕會先確認原請求，不會直接重複製作。"));
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
node("preview")?.addEventListener("click",function(){say("");showBook(sampleBook())});
node("prevPage")?.addEventListener("click",function(){readerStep(-1)});
node("nextPage")?.addEventListener("click",function(){readerStep(1)});
var swipeStart=null;
node("bookPages")?.addEventListener("touchstart",function(e){
 if(e.touches&&e.touches.length===1)swipeStart={x:e.touches[0].clientX,y:e.touches[0].clientY};
},{passive:true});
node("bookPages")?.addEventListener("touchend",function(e){
 if(!swipeStart||!e.changedTouches||!e.changedTouches[0])return;
 var dx=e.changedTouches[0].clientX-swipeStart.x,dy=e.changedTouches[0].clientY-swipeStart.y;
 swipeStart=null;
 if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.35)
  readerGo(readerIndex+(dx<0?1:-1)*(readerSpread()?2:1));
},{passive:true});
node("bookPages")?.addEventListener("touchcancel",function(){swipeStart=null},{passive:true});
if(window.addEventListener){
 window.addEventListener("keydown",function(e){
  if(reportEl.hidden||e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName||""))return;
  if(e.key==="ArrowRight"||e.key==="ArrowLeft"){
   e.preventDefault();readerStep(e.key==="ArrowRight"?1:-1);
  }
 });
 window.addEventListener("resize",function(){if(!reportEl.hidden&&!(readerFlip&&reportEl.classList.contains("flip-enhanced")))readerGo(readerIndex)});
}
void history();
var match=/^#id=([0-9a-f-]{36})$/i.exec(location.hash);
if(match)openReport(match[1]);
})();

