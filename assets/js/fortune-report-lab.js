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
var readerIndex=0;
var readerTitles=["封面","你的整體樣貌","命盤特質","性格與優勢","工作與金錢","人際與感情","未來三年","內在世界","成長方向","封底"];
function readerSpread(){return !!(window.matchMedia&&window.matchMedia("(min-width:900px)").matches)}
function readerPages(){return document.querySelectorAll?Array.from(document.querySelectorAll("#bookPages .sheet")):[]}
function readerGo(index){
 var pages=readerPages(),count=pages.length;if(!count)return;
 var size=readerSpread()?2:1;
 var next=Math.max(0,Math.min(count-1,Math.floor(index/size)*size));
 reportEl.dataset.direction=next>readerIndex?"next":"prev";
 readerIndex=next;
 pages.forEach(function(page,i){
  var visible=i>=next&&i<next+size;
  page.className=page.className.replace(/\s+is-active|\s+is-leaving/g,"")+(visible?" is-active":"");
  if(page.setAttribute)page.setAttribute("aria-hidden",visible?"false":"true");
 });
 text("pageCounter",(next+1)+(size>1&&next+1<count?"–"+Math.min(count,next+size):"")+" / "+count);
 text("pageTitle",readerTitles[next]||"命書");
 if(!node("previewPageJump").hidden)node("previewPageJump").value=String(next);
 node("prevPage").disabled=next===0;
 node("nextPage").disabled=next+size>=count;
}

var readerFlip=null,flipUnavailable=false;
function flipSpread(index){
 var count=readerPages().length;
 var landscape=readerFlip.getOrientation()==="landscape";
 var first=landscape&&index>0&&index<count-1?1+2*Math.floor((index-1)/2):index;
 return {first:first,last:landscape&&first>0&&first<count-1?Math.min(first+1,count-1):first,count:count};
}
function syncFlip(){
 if(!readerFlip||reportEl.hidden||!reportEl.classList.contains("flip-enhanced"))return;
 var spread=flipSpread(readerFlip.getCurrentPageIndex());
 readerIndex=spread.first;
 text("pageCounter",(spread.first+1)+(spread.last>spread.first?"–"+(spread.last+1):"")+" / "+spread.count);
 text("pageTitle",readerTitles[spread.first]||"命書");
 if(!node("previewPageJump").hidden)node("previewPageJump").value=String(spread.first);
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
 if(flipUnavailable||!window.St||typeof window.St.PageFlip!=="function"||
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
    // In portrait, flipPrev() uses a point on the visible left edge, not
    // the virtual book corner. The upstream click guard also blocks buttons
    // and native right swipes, so leave it disabled (native taps are allowed).
    mobileScrollSupport:true,useMouseEvents:true,swipeDistance:45,disableFlipByClick:false,showPageCorners:true});
   ["init","flip","changeOrientation","update"].forEach(function(event){readerFlip.on(event,syncFlip)});
   readerFlip.on("changeState",function(e){if(e.data==="read")syncFlip()});
   readerFlip.loadFromHTML(leaves);
  }
  reportEl.classList.add("flip-enhanced");
  syncFlip();
  return true;
 }catch(error){
  console.error("[fortune-reader] PageFlip unavailable",error);
  flipUnavailable=true;
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


// Editorial acceptance fixture only. No user chart, API, AI, or D1 write.
var legacyBookPages=null,legacyBookTitles=readerTitles.slice();
function extendedPreviewData(){
 var year=new Date(Date.now()+28800000).getUTCFullYear();
 var rows=[["命格","命盤總論","丙火日主 · 中和（示例）","你給人的印象常是反應快，願意讓事情開始動起來，但真正維持你投入的並不是速度，而是事情是否值得做。當目標能讓你理解自己正在創造什麼，你會比較願意花時間補足細節。","以示範命盤的木火組合而言，理解與表達互相支持；這是傳統象徵下的性格閱讀，並不是對真實經歷的判定。"],["命格","五行的分布","示範權重，非吉凶評分","木與火的示例權重較高，可從學習、成長與表達理解其互動；土的承接特質則提示把構想整理成能維持的成果。","五行較少不等於能力較差，也不代表需要購買任何補運物品。權重只提供閱讀命盤的一個角度。"],["性格","外在性格","火的表達象徵","在團體中，你可能習慣先把問題講清楚，並指出可以開始的方向。與其等所有資訊齊備，你比較容易透過實際嘗試找出缺口。","這種明快的表現容易讓人感覺你很有把握，但你內心未必已經作好所有決定。適合留給自己修正方向的餘裕。"],["性格","內在動機","木火互動","你比較在乎投入能不能產生有意義的改變，不一定需要掌聲；若一直做看不到目的的事，熱情可能逐漸消退。","當別人理解你的出發點，而不只評價結果，你更容易產生穩定的合作意願。獨立並不等於不需要被理解。"],["性格","天賦與潛能","印星 4 · 食傷 3（示例）","一個值得發展的能力，是把分散的資訊整理成有順序的知識，再轉成其他人能使用的方式。這種能力可能在教學、研究、設計或問題處理中表現出來。","比起單純蒐集更多資料，你的優勢更可能出現在理解之後的重新組織。作品、流程與清楚說明都是承接這種能力的形式。"],["性格","優勢的另一面","學習與輸出之間","當你看到解法時，可能希望其他人也能立刻理解。如果大家還在討論背景，你卻已經進入執行階段，就容易出現步調差異。","這不代表你的想法太快或他人的能力不足，而是資訊傳遞與理解需要不同時間。清楚交代推理過程，是優勢能被團隊接住的重要條件。"],["性格","情緒與壓力","表達與承接的平衡","遇到壓力時，你可能傾向先尋找能做的事，透過完成小目標重新取得掌控感。這讓你不容易因短暫受挫而停止前進。","但當所有情緒都被轉成待辦，疲憊也可能沒有被真正處理。適合你的休息不一定是完全停止，而是暫時不必為任何成果負責。"],["事業","工作環境與節奏","印星、食傷、官殺（示例）","適合你的工作不必限定特定產業，而是要具備清楚的目標、合理的自主權，以及可以看見成果的回饋。你較可能喜歡有空間改善原有流程的任務。","如果規則不斷改變而責任又不清楚，你可能把心力耗在反覆補洞。穩定的合作契約比一味追求自由更能支撐長期發展。"],["事業","專業發展方向","知識與成果的連結","學習新領域時，能把理解轉成實際成果，是比單純累積資格更有辨識度的路徑。你可以在需要理解問題、設計方法與持續迭代的環境中累積專長。","這並不表示命盤指定了某個職業，而是描述工作方式的可能偏好。實際選擇仍取決於能力、機會及生活條件。"],["事業","領導與創業特質","食傷與責任線索","主動開路的特質有助於建立方向，但領導還包含讓其他人知道怎麼參與。若同時承擔構想、執行與驗收，短期可能有效，長期卻容易變成所有問題的唯一出口。","能清楚交付目標與決策權的環境，比一個人掌握所有細節更容易讓成果延續。創業與管理也仍需依現實條件評估。"],["財富","正財與穩定累積","正財 1（示例）","正財在傳統八字中象徵有規律的資源安排。對這張示範命盤而言，它不是收入大小的指標，而是提醒機會探索需要一個穩定的承接方式。","例如維持清楚的固定支出、長期承諾與資源分配，可以讓新的嘗試不必每次都從零開始。命盤不能用來推算實際薪水。"],["財富","偏財與機會觀","偏財 2（示例）","偏財的象徵較偏向流動的機會及資源。你可能容易注意到某個工具、合作方式或新的需求所帶來的可能性。","當每個新方向都值得探索時，稀缺的反而是注意力。機會的價值需要放在真實成本及風險中評估，不能由命理判斷獲利機率。"],["財富","金錢與資源的取捨","正偏財交互閱讀","你的資源安排可能需要兼顧兩種需求：一部分維持生活與承諾，另一部分保留嘗試的自由。只強調其中一種，容易讓生活變得過度僵化或分散。","真正值得長期累積的，不只金錢，也包含經驗、工具、信任和能重複使用的知識。這是資源觀的側寫，不是理財建議。"],["關係","愛情中的表達方式","日支寅（示例）","你可能透過行動表示在意，例如記住對方說過的事，或主動分擔需要處理的問題。比起熱烈的承諾，持續可靠更能反映你的投入。","遇到對方只是想被聽見的時刻，直接給解法可能讓關心被誤解。行動與理解並不是相反的事，兩者配合會讓關係更有空間。"],["關係","適合相處的伴侶特質","關係需求的象徵閱讀","比較適合你的相處方式，可能是雙方能說清楚自己的需求，也能保留各自的興趣和節奏。彼此有不同意見時，不必透過猜測來決定對方的想法。","命盤不能判定某個人的外貌、職業或何時出現。這一章談的是可能的互動需求，而不是指定命中注定的對象。"],["關係","親密關係與衝突","行動與理解的平衡","當溝通卡住時，你可能習慣快速定位問題、找出能實行的辦法。但關係裡的困難未必是需要立刻解決的技術問題。","如果對方的感受還沒被理解，過早決定下一步可能增加距離。先確認彼此正在討論同一件事，再安排具體行動，更符合長期信任的建立方式。"],["關係","家庭、朋友與人際","支持與界線的象徵","對家人或朋友，你可能傾向在有需要時提供實際協助，而不一定經常用語言表達關心。這種支持方式適合清楚的分工與承諾。","值得留意的是，不必把所有人的困難都變成自己的責任。能維持彼此獨立的關係，才比較有機會在長期相處中保存原本的善意。"],["人生","人生階段總覽","示範階段，不是實際大運表","前期可著重理解自己喜歡的事與學習方式；中期更適合思考能力如何累積、責任如何分配；後期則能從資源與時間的取捨理解生活重心。","正式版本須由出生資料計算完整大運，才能列出真實的年齡與年份區間。本頁只展示閱讀架構，未聲稱這些階段對應特定事件。"],["人生","當前十年大運","庚午（虛構示例）","在示範解讀中，規則、資源與表達之間的關係可以作為長期觀察主題。一個十年階段不是十年都發生同一件事，而是用來理解不同生活議題如何交錯。","正式版本會以實際大運起訖年及命盤互動為依據，不以這個示範干支替代任何真實使用者的命盤。"],["總結","長期優勢與人生方向","回到這張示範命盤","你比較有辨識度的特質，不是單純快速，而是願意理解新的事物，並將理解變成成果。當探索、表達與承接能配合，努力比較容易留下長期價值。","不必每次都靠增加目標證明自己仍在前進。把能持續的事做深，並讓關係、工作和生活保有各自的空間，是這張示範命盤的核心閱讀方向。"]];
 var years=[["整理與聚焦","示範年度的主軸是把原有投入重新整理。工作上較值得關注的是哪些成果可以延續，哪些方向需要先確認需求；關係上則可留意時間與注意力如何分配。","資源面可以觀察既有承諾是否排擠重要目標。這個主題是版型示例，不代表該年必定出現變動。"],["合作與界線","第二個年度示例將重心放在合作方式。工作上可能需要更明確地區分責任與決策；在人際中，理解不同步調可以讓原先的熱情轉成可靠的合作。","資源安排重視投入與回饋是否對等。這不是預測特定合作對象或契約。"],["累積與驗證","第三個年度示例適合呈現長期能力與實際成果之間的關係。工作面可區分有明確回饋的探索及只消耗注意力的嘗試。","感情與人際可觀察承諾如何落實；金錢面仍需依真實條件衡量。這些主題沒有事件或獲利保證。"],["調整與選擇","第四個年度示例重點在於原有方向與新機會的取捨。不是所有變動都值得追逐，也不是所有既有安排都需要維持。","工作、關係與資源可分別考量它們的長期價值。正式版本將依該年干支與完整命盤互動分析，而非套用這段示範。"],["承接與長期方向","第五個年度示例用於整理前幾年所累積的能力與選擇。比起增加更多責任，更值得重視的是哪些成果能被持續使用、哪些關係能保持互相支持。","人生節奏應考量實際生活狀態；命盤的年度象徵不是需要照表執行的時間表。"]];
 var annual=years.map(function(row,i){
  var y=year+i,cycle=((y-4)%60+60)%60;
  return ["流年",y+" 年 · "+row[0],"年度版型示例 · "+"甲乙丙丁戊己庚辛壬癸"[cycle%10]+"子丑寅卯辰巳午未申酉戌亥"[cycle%12],row[1],row[2]];
 });
 return [["封面","專屬一生命書","PERSONAL LIFE BOOK","從命格到人生，讀懂自己的不同面向","示範版本 · 非正式個人命書"],
 ["目錄","命書目錄","CONTENTS","命格 03–04 · 性格 05–09 · 事業 10–12 · 財富 13–15","關係 16–19 · 人生 20–21 · 流年 22–26 · 總結 27"]].concat(rows.slice(0,-1),annual,[rows[rows.length-1]],[
 ["封底","一本可以重新翻閱的書","KOOLO FORTUNE","命盤提供線索，生活給出答案。","示範內容 · 未呼叫 AI"]]);
}
function previewEl(tag,cls,value){
 var el=document.createElement(tag);if(cls)el.className=cls;
 if(value!==undefined)el.textContent=value;return el;
}
function buildExtendedPage(row,i,total){
 var dark=i===0||i===total-1;
 var page=previewEl("article","sheet"+(dark?" dark":"")+" extended-preview-sheet");
 var n=String(i+1).padStart(2,"0");
 page.setAttribute("aria-label","第 "+(i+1)+" 頁 "+row[1]);
 var top=previewEl("div",dark?"cover-top":"page-top");
 top.append(previewEl("span","",dark?"KOOLO FORTUNE":n+" / "+row[0]),previewEl("span","","DEMO EDITION"));page.appendChild(top);
 if(dark){
  var orbit=previewEl("div","orbit");orbit.appendChild(previewEl("b","",i===0?"命":"心"));page.appendChild(orbit);
  var title=previewEl("div","cover-title");title.append(previewEl("small","",row[2]),previewEl("h2","",row[1]),previewEl("p","",row[3]),previewEl("p","",row[4]));page.appendChild(title);
 }else{
  page.append(previewEl("h2","",row[1]),previewEl("p","section-lead",row[2]));
  if(i===3){
   var chart=previewEl("div","element-chart");
   [32,26,18,10,14].forEach(function(v,k){
    var line=previewEl("div","element-row"),track=previewEl("div","element-bar"),fill=previewEl("span","");
    fill.style.width=v+"%";fill.style.setProperty("--bar-color",COLORS[k]);track.appendChild(fill);
    line.append(previewEl("b","",ELS[k]),track,previewEl("small","",String(v)));chart.appendChild(line);
   });page.appendChild(chart);
  }
  var panel=previewEl("div",i===1?"fact-panel":"cream-panel");
  panel.append(previewEl("p","bodycopy",row[3]),previewEl("p","bodycopy",row[4]));page.appendChild(panel);
 }
 var footer=previewEl("footer","");footer.append(previewEl("span","","KOOLO / 示範命書"),previewEl("span","",n));page.appendChild(footer);return page;
}
function restoreLegacyBook(){
 if(!legacyBookPages)return;
 node("bookPages").replaceChildren.apply(node("bookPages"),legacyBookPages);
 legacyBookPages=null;readerTitles=legacyBookTitles.slice();
 node("previewPageJump").hidden=true;
 text("print","列印／儲存為 PDF（10 頁）");
}
function showExtendedPreview(){
 restoreLegacyBook();
 var rows=extendedPreviewData();
 legacyBookPages=readerPages();
 var pages=rows.map(function(row,i){return buildExtendedPage(row,i,rows.length)});
 node("bookPages").replaceChildren.apply(node("bookPages"),pages);
 readerTitles=rows.map(function(row){return row[1]});
 var jump=node("previewPageJump");jump.replaceChildren();
 rows.forEach(function(row,i){var option=previewEl("option","",String(i+1).padStart(2,"0")+" · "+row[1]);option.value=String(i);jump.appendChild(option)});
 jump.hidden=false;jump.value="0";
 text("print","列印／儲存為 PDF（"+rows.length+" 頁）");
 text("meta","28 頁示範預覽 · 虛構命盤及示例文字 · 未呼叫 AI、不儲存資料");
 chooser.hidden=true;reportEl.hidden=false;reportEl.className="reader-open demo-report extended-report";
 readerIndex=0;readerGo(0);
 if(!openFlip())node("flipBook").hidden=true;
 window.scrollTo(0,0);
}
function jumpExtendedPage(){
 if(!legacyBookPages)return;
 var page=Number(node("previewPageJump").value);
 if(!Number.isInteger(page)||page<0||page>=readerPages().length)return;
 if(readerFlip&&reportEl.classList.contains("flip-enhanced")){
  if(readerFlip.getState()!=="read"){node("previewPageJump").value=String(readerIndex);return}
  readerFlip.turnToPage(page);syncFlip();
 }else readerGo(page);
}

function showBook(x){
 if(!x||x.status!=="ready"||!x.facts||!x.chapters){say("報告尚未完成");return}
 restoreLegacyBook();
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
node("previewExtended")?.addEventListener("click",function(){say("");showExtendedPreview()});
node("previewPageJump")?.addEventListener("change",jumpExtendedPage);
node("prevPage")?.addEventListener("click",function(){readerStep(-1)});
node("nextPage")?.addEventListener("click",function(){readerStep(1)});
// Only the static fallback owns swipe listeners. The enhanced book uses
// StPageFlip's native touch/mouse drag and swipe handlers in both directions.
function bindReaderSwipe(host){
 if(!host)return;
 var swipeStart=null;
 host.addEventListener("touchstart",function(e){
  swipeStart=e.touches&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;
 },{passive:true});
 host.addEventListener("touchend",function(e){
  if(!swipeStart||!e.changedTouches||!e.changedTouches[0])return;
  var dx=e.changedTouches[0].clientX-swipeStart.x,dy=e.changedTouches[0].clientY-swipeStart.y;
  swipeStart=null;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.35)readerStep(dx<0?1:-1);
 },{passive:true});
 host.addEventListener("touchcancel",function(){swipeStart=null},{passive:true});
}
bindReaderSwipe(node("bookPages"));
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

