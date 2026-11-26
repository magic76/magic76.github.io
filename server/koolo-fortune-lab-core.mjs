/** Deterministic sanitization and bounded AI writing for the private BaZi lab. */
const GAN="甲乙丙丁戊己庚辛壬癸",ZHI="子丑寅卯辰巳午未申酉戌亥";
const ELEMENT={甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水"};
const ELS=["木","火","土","金","水"];
export const PARTS=["preface","personality","career","relationships","timing","letter","plan"];
const safeText=(x,max)=>typeof x==="string"&&x.trim().length<=max?x.trim():"";
const count=x=>Number.isInteger(x)&&x>=0&&x<=24?x:null;
export function normalizeLabFacts(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const p=safeText(raw.fourPillars,40).split(/\s+/);
 if(p.length!==4||p.some(v=>v.length!==2||!GAN.includes(v[0])||!ZHI.includes(v[1])))return null;
 const master=p[2][0],element=ELEMENT[master];
 if(raw.dayMaster!==master||raw.dayMasterElement!==element)return null;
 const strength=safeText(raw.strength,4);
 if(!["偏旺","身強","中和","身弱","偏弱"].includes(strength))return null;
 const weighted={};
 for(const e of ELS){
  const n=raw.weighted?.[e];
  if(typeof n!=="number"||!Number.isFinite(n)||n<0||n>100)return null;
  weighted[e]=Math.round(n*100)/100;
 }
 if(Object.values(weighted).every(x=>x===0))return null;
 const c=raw.counts||{};
 const counts={resource:count(c.resource),output:count(c.output),officer:count(c.officer),
  directWealth:count(c.directWealth),indirectWealth:count(c.indirectWealth)};
 if(Object.values(counts).some(x=>x===null))return null;
 const ganZhi=safeText(raw.luck?.ganZhi,2);
 if(ganZhi&&(ganZhi.length!==2||!GAN.includes(ganZhi[0])||!ZHI.includes(ganZhi[1])))return null;
 const ys=raw.annual;
 const year=new Date(Date.now()+8*3600*1000).getUTCFullYear();
 if(!Array.isArray(ys)||ys.length!==3)return null;
 const annual=ys.map((v,i)=>{
  if(!v||v.year!==year+i||typeof v.ganZhi!=="string"||v.ganZhi.length!==2||
   !GAN.includes(v.ganZhi[0])||!ZHI.includes(v.ganZhi[1])||
   !Array.isArray(v.themes)||v.themes.length>4)return null;
  const themes=v.themes.map(x=>safeText(x,20));
  if(themes.some(x=>!x))return null;
  return {year:v.year,ganZhi:v.ganZhi,themes};
 });
 if(annual.some(x=>!x))return null;
 // Legacy browser payloads may still include questions; deliberately ignore
 // them. The profile is determined by verified chart facts only.
 const relations=Array.isArray(raw.relations)?raw.relations.slice(0,5).map(x=>safeText(x,35)).filter(Boolean):[];
 return {fourPillars:p.join(" "),dayMaster:master,element,strength,weighted,counts,
  luck:ganZhi?ganZhi:"",annual,relations};
}

export const BOOK28_VERSION="bazi-private-lab-book28-v1";
const BOOK28_PAGES=[["命盤總論","整體氣質與日主身強弱"],["五行的分布","五行相對權重與內在拉扯"],["外在性格","外在表現及陌生情境"],["內在動機","價值與投入動機"],["天賦與潛能","學習、表達、責任能力"],["優勢的另一面","長處過度使用的盲點"],["情緒與壓力","壓力反應與生活節奏"],["工作環境與節奏","自主、規則、合作與回饋"],["專業發展方向","能力累積方式，不指定職業"],["領導與創業特質","責任分配與決策習慣"],["正財與穩定累積","正財計數及長期資源管理"],["偏財與機會觀","偏財計數與風險取捨"],["金錢與資源的取捨","正偏財交互關係，不提供投資建議"],["愛情中的表達方式","日支及表達在意的方式"],["適合相處的伴侶特質","互動需求，不指定對象"],["親密關係與衝突","衝突處理及界線"],["家庭、朋友與人際","支持方式及責任，不假定家庭狀態"],["人生階段總覽","依完整大運起訖年解讀各階段，不杜撰經歷"],["當前十年大運","只依涵蓋基準年的大運；沒有則說明缺少資料"],["年度解析 1","只解讀指定年份的干支、十神、主題及大運"],["年度解析 2","只解讀指定年份的干支、十神、主題及大運"],["年度解析 3","只解讀指定年份的干支、十神、主題及大運"],["年度解析 4","只解讀指定年份的干支、十神、主題及大運"],["年度解析 5","只解讀指定年份的干支、十神、主題及大運"],["長期優勢與人生方向","整合長期方向，避免重複其他頁"]];
export const BOOK28_PARTS=BOOK28_PAGES.map((_,i)=>"p"+String(i+3).padStart(2,"0"));
export function normalizeBook28Facts(raw){
 const base=normalizeLabFacts({...raw,annual:Array.isArray(raw?.annual)?raw.annual.slice(0,3):null});
 if(!base||raw.annual.length!==5||!Array.isArray(raw.luckPillars)||raw.luckPillars.length<1||raw.luckPillars.length>12)return null;
 const gz=v=>typeof v==="string"&&v.length===2&&GAN.includes(v[0])&&ZHI.includes(v[1]);
 const annual=raw.annual.map((v,i)=>{
  const year=base.annual[0].year+i,cycle=((year-4)%60+60)%60;
  if(!v||v.year!==year||v.ganZhi!==GAN[cycle%10]+ZHI[cycle%12]||!Array.isArray(v.themes)||v.themes.length>4)return null;
  const themes=v.themes.map(x=>safeText(x,20));if(themes.some(x=>!x))return null;
  if(v.luckPillar&&!gz(v.luckPillar))return null;
  return {year,ganZhi:v.ganZhi,themes,stemTenGod:safeText(v.stemTenGod,8),luckPillar:v.luckPillar||""};
 });
 const luckPillars=raw.luckPillars.map(v=>{
  if(!v||!gz(v.ganZhi)||!Number.isInteger(v.startYear)||!Number.isInteger(v.endYear)||v.startYear<1800||v.endYear>2300||v.endYear-v.startYear!==9)return null;
  return {ganZhi:v.ganZhi,startYear:v.startYear,endYear:v.endYear};
 });
 if(annual.some(x=>!x)||luckPillars.some(x=>!x))return null;
 if(luckPillars.some((v,i)=>i>0&&v.startYear<=luckPillars[i-1].endYear))return null;
 if(annual.some(v=>v.luckPillar!==(luckPillars.find(p=>v.year>=p.startYear&&v.year<=p.endYear)?.ganZhi||"")))return null;
 const current=luckPillars.find(p=>annual[0].year>=p.startYear&&annual[0].year<=p.endYear);
 return {...base,annual,luckPillars,luck:current?.ganZhi||""};
}
function validBook28Page(part,v,f){
 if(typeof v!=="string"||v.trim().length<150||v.trim().length>280||/<[^>]+>|`{3}|[?？]|(?:你是否|你有沒有|不妨想想|請試著|想一想)|(?:保證|一定會)(?:升職|結婚|發財|生病|離婚)/.test(v))return false;
 const page=Number(part.slice(1));
 if(page>=22&&page<=26&&!v.includes(String(f.annual[page-22]?.year)))return false;
 return !/^(.{2,12})\1{5,}$/.test(v.trim());
}
export function validateBook28Chapters(chapters,f){
 if(!f||!Array.isArray(f.annual)||f.annual.length!==5||!Array.isArray(f.luckPillars)||!chapters||typeof chapters!=="object")return false;
 return BOOK28_PARTS.every(p=>validBook28Page(p,chapters[p],f))&&new Set(BOOK28_PARTS.map(p=>chapters[p].trim())).size===BOOK28_PARTS.length;
}
export function book28PagePrompt(f,part){
 const i=BOOK28_PARTS.indexOf(part);if(i<0)throw Error("INVALID_PART");
 const [title,direction]=BOOK28_PAGES[i],page=i+3,annual=page>=22&&page<=26?f.annual[page-22]:null;
 return [
 "為 Koolo 撰寫繁體中文個人一生命書，直接以「你」描述個人傾向。只寫本頁正文，不要標題、JSON、Markdown、問句或作業。日常白話，具體且有辨識度。",
 "本次僅撰寫："+part+"。"+title+"；"+direction+"。本頁 160–240 個繁體中文字，最多 280 字。",
 "只依提供的命盤摘要推論象徵傾向；不捏造職業、婚姻、健康、收入、經歷或未來事件，不提供投資或醫療建議，不保證結果。不要重複其他頁主題。",
 annual?"指定年度："+JSON.stringify(annual)+"。正文必須明列 "+annual.year+" 年，只談此年。":"",
 "命盤摘要："+JSON.stringify(annual?{...f,annual:[annual]}:f)
 ].join("\n");
}
export function validateLabChapters(raw,facts){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const result={};
 for(const name of PARTS){
  const str=raw[name];
  if(typeof str!=="string")return null;
  const v=str.trim().replace(/\r\n/g,"\n");
  if(v.length<(name==="letter"?130:85)||v.length>700||/<[^>]+>|```|(?:保證|一定會)(?:升職|結婚|發財|生病|離婚)/.test(v))return null;
  result[name]=v;
 }
 if(new Set(Object.values(result)).size!==PARTS.length)return null;
 // Detect meaningless repeat-filler without forcing traditional terminology.
 if(Object.values(result).some(v=>/^(.{2,12})\1{5,}$/.test(v)))return null;
 // Plain-language chapters are not required to spell out a technical day master.
 // Both saved historical reports and new reports remain readable.
 if(!facts.annual.some(x=>result.timing.includes(String(x.year))))return null;
 return result;
}
export function labPrompt(f){
 return [
  "請撰寫一份 Koolo 的繁體中文個人八字命書。這是依據命盤線索所寫的詳細人物側寫，不是問答服務。以命主為主角，直接寫出可供閱讀的完整剖析，像一本專門談他的書，而不是通用星座文章。",
  "僅可引用下方命盤數據作為命理依據：四柱、日主、身強弱、五行權重、十神計數、大運、原局互動與三年流年。不要編造命主的職業、家庭、經歷、健康、收入或個性事實；區分象徵推論與實際人生，不把傾向寫成已發生的事情。",
  "全文採第二人稱、自然且細膩，不要自稱作者、老師或講述如何製作。不要放技術身分介紹、冗長聲明、讀者提問、訪談或個人問題的回答，也不要預設命主正在求財、轉職或戀愛。不要斷言會發財、結婚、升遷、患病或遇到災厄。",
  '只輸出 JSON object，七個字串欄位："preface","personality","career","relationships","timing","letter","plan"。每段約 180–310 字；letter 與 plan 約 200–320 字。這七段分別描寫不同面向，不要複製、重述同一套形容詞。',
  "preface：這個人整體的命盤輪廓。用日主、身強弱與最突出的五行互動描寫核心氣質、內在矛盾及辨識度；開門見山，不寫場面話或製作介紹。",
  "personality：詳細描述外在表現和內在思考差異、擅長的能力、看待規則或變化的方式、選擇時的慣性，以及容易忽略的盲點；把至少兩項具體命盤線索連到可觀察的生活情境。",
  "career：描述適合發揮的工作方式、合作與自主需求、專長發展、資源管理與金錢態度；可引用十神數據，但不可保證收入、投資獲利或特定職位。",
  "relationships：描寫親密關係、朋友與合作相處時的傾向，包括如何表達關心、衝突時的反應、信任與界線；不推斷特定人的婚姻狀態或家庭經歷。",
  "timing：說明命盤提供的當前大運與接下來三個確切年份各自的關注主題、可能適合發揮和調整的面向；逐一明列三年年份，不預言必然事件。",
  "letter：這個人的內在驅動與壓力反應。描寫重視的價值、遇到挫折或轉折時的防衛習慣、內心需求與自我拉扯，提供有根據而克制的觀察；這不是回覆問題的信件。",
  "plan：這個人的長期成長方向。總結值得保留的優勢、需要練習的彈性、可能更舒服的生活節奏及建立選擇的方法；不要寫四週任務清單或對明天的預言。",
  "每章至少結合一至兩個有別於其他章節的命盤線索與具體情境；細緻、有辨識度但不故弄玄虛。正文只討論這個人的特質與方向，不說明平台、撰寫者或製作技術。不得傳回 HTML。",
  "命盤摘要（沒有姓名、出生日期或個人提問）："+JSON.stringify(f)
 ].join("\n");
}
export async function generateLabChapters(f,{key,model,fetcher=fetch,timeoutMs=65000}){
 // Legacy Gemini 2.5 can return 404 for keys that are otherwise valid.
 // Retry ONLY missing models, with current supported text models, within the
 // SAME bounded request. No retry on quota, auth, quality, or network failures.
 const candidates=[model];
 if(/^gemini-2[.-]/.test(model))candidates.push("gemini-3.5-flash","gemini-3.5-flash-lite");
 else if(model==="gemini-3.5-flash")candidates.push("gemini-3.5-flash-lite");
 const controller=new AbortController();
 const limit=Math.max(10,Math.min(65000,Number(timeoutMs)||65000));
 const timer=setTimeout(()=>controller.abort(),limit);
 try{
  for(const candidate of [...new Set(candidates)]){
   const response=await fetcher("https://generativelanguage.googleapis.com/v1beta/models/"+candidate+":generateContent",{
    method:"POST",headers:{"content-type":"application/json","x-goog-api-key":key},
    signal:controller.signal,
    body:JSON.stringify({contents:[{role:"user",parts:[{text:labPrompt(f)}]}],
     generationConfig:{responseMimeType:"application/json",temperature:0.45,maxOutputTokens:8192}})
   });
   if(response.status===404&&candidate!==candidates[candidates.length-1])continue;
   if(!response.ok)throw Error("UPSTREAM_"+response.status);
   if((response.headers?.get?.("content-type")||"").toLowerCase().includes("text/html"))
    throw Error("UPSTREAM_INVALID_RESPONSE");
   const data=await response.json();
   const text=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("").trim();
   if(!text||text.length>14000)throw Error("UPSTREAM_EMPTY");
   let obj;try{obj=JSON.parse(text)}catch{throw Error("INVALID_JSON")}
   const chapters=validateLabChapters(obj,f);
   if(!chapters)throw Error("QUALITY_CHECK_FAILED");
   return {model:candidate,chapters,usage:{
    promptTokens:Math.max(0,Number(data.usageMetadata?.promptTokenCount)||0),
    outputTokens:Math.max(0,Number(data.usageMetadata?.candidatesTokenCount)||0)
   }};
  }
  throw Error("UPSTREAM_404");
 }catch(e){
  if(controller.signal.aborted)throw Error("UPSTREAM_TIMEOUT");
  throw e;
 }finally{clearTimeout(timer)}
}


/** Write one independently checkpointed chapter per HTTP request. */
export function labPartPrompt(f,part){
 if(BOOK28_PARTS.includes(part))return book28PagePrompt(f,part);
 if(!PARTS.includes(part))throw Error("INVALID_PART");
 const directions={"preface":"開場先給讀者清楚的個性輪廓：你平時讓人感受到的特質、內心真正重視的事，以及兩者之間的反差。用一個具體生活場景說明，不以命理專有名詞開頭。","personality":"直接描述：你做決定的方式、你的三個鮮明長處、容易吃虧的習慣，以及壓力來時的典型反應。聚焦可觀察的性格，不問讀者任何問題。","career":"直接描述：你適合怎樣的工作節奏、與主管或同事合作的方式、發揮能力的條件、對金錢和資源的偏好與盲點。不推定實際職業或收入。","relationships":"直接描述：你如何建立信任、表達在意、面對衝突、維持界線，以及親密關係與朋友相處時的差異。不推定婚姻狀況或對方行為。","timing":"按命盤提供的三個年份逐一描述當年較適合把重心放在哪些方向、容易出現哪些選擇拉扯、如何調整節奏。年份必須明列；不保證必然事件。","letter":"直接揭示：你表面看起來的樣子與內在真正想得到的東西、最在乎的價值、受挫時怎樣保護自己、長期壓力的形成方式。這不是一封信，也不是安慰或勵志文。","plan":"直接描述：你長期值得維持的優勢、容易拖累自己的行為慣性、更適合你的選擇方式及生活步調。提供有針對性的洞察，不安排作業、反思題或四週練習。"};
 return [
  "請為 Koolo 撰寫繁體中文個人命書。讀者已提供命盤，付費是為了清楚了解自己各方面，而不是來接受命理教學。直接以「你」描述這個人的特質、優勢、弱點和行為模式。寫出具體、有辨識度的個人側寫，而不是通用星座文。",
  "本次僅撰寫："+part+"。只輸出本章完整的繁體中文正文，不要 JSON、Markdown、程式碼區塊、標題或前言。",
  directions[part],
  "採用日常白話，幾乎不用術語。命理依據藏在分析的因果裡，不要羅列四柱、十神、五行權重或命盤數字；如有必要提及一個專有名詞，必須同句用白話解釋。不可寫讀者提問、反問句、問號、邀請讀者反思、練習題、說教、雞湯、填空式建議；不要使用「你是否」「你有沒有」「不妨想想」「請試著」這類文句。",
  "本章 210 至 340 個繁體中文字；用兩到三個有根據的觀察切入具體生活情境。僅依下面數據推論「可能的傾向」，不要虛構當事人的職業、健康、婚姻、財產或已經發生的人生經歷，也不要保證未來。",
  "命盤參考數據（供寫作推論，不要原樣抄進正文）："+JSON.stringify(f)
 ].join("\n");
}

export async function generateLabPart(f,part,{key,model,fetcher=fetch,timeoutMs=28000}){
 if(!PARTS.includes(part)&&!BOOK28_PARTS.includes(part))throw Error("INVALID_PART");
 const candidates=[model];
 if(/^gemini-2[.-]/.test(model))candidates.push("gemini-3.5-flash","gemini-3.5-flash-lite");
 else if(model==="gemini-3.5-flash")candidates.push("gemini-3.5-flash-lite");
 const choices=[...new Set(candidates)];
 const controller=new AbortController();
 // Split the overall budget between the primary model and a faster fallback.
 // A slow primary must not make the owner wait for a 20s failure just to retry.
 const limit=Math.max(10,Math.min(30000,Number(timeoutMs)||28000));
 const timer=setTimeout(()=>controller.abort(),limit);
 const started=Date.now();
 try{
  for(let i=0;i<choices.length;i++){
   if(controller.signal.aborted)throw Error("UPSTREAM_TIMEOUT");
   const candidate=choices[i],hasFallback=i<choices.length-1;
   const remaining=Math.max(10,limit-(Date.now()-started));
   const candidateLimit=hasFallback?Math.min(12000,Math.max(10,Math.floor(remaining*0.46))):remaining;
   const attemptController=new AbortController();
   const cancel=()=>attemptController.abort();
   controller.signal.addEventListener("abort",cancel,{once:true});
   const attemptTimer=setTimeout(()=>attemptController.abort(),candidateLimit);
   let response;
   try{
    // Retry one short-lived 429/5xx. Any long wait instead transfers to the
    // fallback candidate within the same HTTP request and D1 chapter lease.
    for(let attempt=0;attempt<2;attempt++){
     response=await fetcher("https://generativelanguage.googleapis.com/v1beta/models/"+candidate+":generateContent",{
      method:"POST",headers:{"content-type":"application/json","x-goog-api-key":key},
      signal:attemptController.signal,
      body:JSON.stringify({contents:[{role:"user",parts:[{text:labPartPrompt(f,part)}]}],
       generationConfig:{temperature:0.4,maxOutputTokens:6144,
        ...(/^gemini-3\.5-flash(?:-lite)?$/.test(candidate)?
         {thinkingConfig:{thinkingLevel:"MINIMAL"}}:
         /^gemini-3/.test(candidate)?{thinkingConfig:{thinkingLevel:"LOW"}}:{})}})
     });
     if([408,429,500,502,503,504].includes(response.status)&&attempt===0){
      await new Promise(resolve=>setTimeout(resolve,250));
      continue;
     }
     break;
    }
   }catch(e){
    if(controller.signal.aborted)throw Error("UPSTREAM_TIMEOUT");
    if(attemptController.signal.aborted){
     // Abort the slow primary and try the faster model before the request's
     // overall deadline. No completed chapter is regenerated.
     if(hasFallback){
      console.info("[fortune-lab] slow model fallback",JSON.stringify({part,model:candidate,elapsedMs:Date.now()-started}));
      continue;
     }
     throw Error("UPSTREAM_TIMEOUT");
    }
    throw e;
   }finally{
    clearTimeout(attemptTimer);
    controller.signal.removeEventListener("abort",cancel);
   }
   if(response.status===404&&hasFallback)continue;
   if(!response.ok)throw Error("UPSTREAM_"+response.status);
   if((response.headers?.get?.("content-type")||"").toLowerCase().includes("text/html"))
    throw Error("UPSTREAM_INVALID_RESPONSE");
   let data;
   try{data=await response.json()}catch{throw Error("UPSTREAM_INVALID_RESPONSE")}
   const candidateData=data.candidates?.[0];
   const finishReason=String(candidateData?.finishReason||"").slice(0,32);
   if(finishReason==="MAX_TOKENS")throw Error("UPSTREAM_TRUNCATED");
   if(finishReason==="SAFETY"||finishReason==="PROHIBITED_CONTENT"||
    finishReason==="BLOCKLIST")throw Error("UPSTREAM_BLOCKED");
   if(finishReason&&finishReason!=="STOP")throw Error("UPSTREAM_UNFINISHED");
   let chapter=(candidateData?.content?.parts||[]).filter(p=>!p.thought)
    .map(p=>typeof p.text==="string"?p.text:"").join("").trim();
   if(!chapter)throw Error("UPSTREAM_EMPTY");
   // Keep accepting successful historic JSON output when a provider ignores
   // the current plain-text prompt, but never store incomplete JSON as prose.
   if(chapter.startsWith("{")){
    let obj;try{obj=JSON.parse(chapter)}catch{throw Error("UPSTREAM_INVALID_FORMAT")}
    chapter=obj?.[part];
   }
   if(typeof chapter!=="string")throw Error("QUALITY_CHECK_FAILED");
   const text=chapter.trim().replace(/\r\n/g,"\n");
   if(text.length<150||text.length>700||/<[^>]+>|`{3}|[?？]|(?:你是否|你有沒有|不妨想想|請試著|想一想)|(?:保證|一定會)(?:升職|結婚|發財|生病|離婚)/.test(text)||/^(.{2,12})\1{5,}$/.test(text))
    throw Error("QUALITY_CHECK_FAILED");
   // The model may express the chart's influence in everyday terms without
   // naming the day master or any traditional technical term.
   if(BOOK28_PARTS.includes(part)&&!validBook28Page(part,text,f))throw Error("QUALITY_CHECK_FAILED");
   if(part==="timing"&&!f.annual.some(x=>text.includes(String(x.year))))
    throw Error("QUALITY_CHECK_FAILED");
   return {model:candidate,text,finishReason,usage:{
    promptTokens:Math.max(0,Number(data.usageMetadata?.promptTokenCount)||0),
    outputTokens:Math.max(0,Number(data.usageMetadata?.candidatesTokenCount)||0)
   }};
  }
  throw Error("UPSTREAM_404");
 }catch(e){
  if(controller.signal.aborted)throw Error("UPSTREAM_TIMEOUT");
  throw e;
 }finally{clearTimeout(timer)}
}
