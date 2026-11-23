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
 if(!result.personality.includes(facts.dayMaster)&&!result.personality.includes(facts.element))return null;
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
 if(!PARTS.includes(part))throw Error("INVALID_PART");
 const lines=labPrompt(f).split("\n");
 const direction=lines.find(line=>line.startsWith(part+"："));
 return [
  lines[0],lines[1],lines[2],
  "只回傳 JSON 物件，只有 \""+part+"\" 一個字串欄位，不要其他欄位、Markdown 或 HTML。",
  direction,
  "本章寫 210 至 340 個繁體中文字，必須有個人辨識度和至少兩個命盤依據，適度描述具體情境，不虛構已經發生的人生經歷，不保證未來事件。避免制式開場、空泛形容及重複其他章節。",
  "命盤摘要："+JSON.stringify(f)
 ].join("\n");
}
export async function generateLabPart(f,part,{key,model,fetcher=fetch,timeoutMs=20000}){
 if(!PARTS.includes(part))throw Error("INVALID_PART");
 const candidates=[model];
 if(/^gemini-2[.-]/.test(model))candidates.push("gemini-3.5-flash","gemini-3.5-flash-lite");
 else if(model==="gemini-3.5-flash")candidates.push("gemini-3.5-flash-lite");
 const choices=[...new Set(candidates)];
 const controller=new AbortController();
 const limit=Math.max(10,Math.min(22000,Number(timeoutMs)||20000));
 const timer=setTimeout(()=>controller.abort(),limit);
 try{
  for(const candidate of choices){
   const response=await fetcher("https://generativelanguage.googleapis.com/v1beta/models/"+candidate+":generateContent",{
    method:"POST",headers:{"content-type":"application/json","x-goog-api-key":key},
    signal:controller.signal,
    body:JSON.stringify({contents:[{role:"user",parts:[{text:labPartPrompt(f,part)}]}],
     generationConfig:{responseMimeType:"application/json",temperature:0.45,maxOutputTokens:3072}})
   });
   if(response.status===404&&candidate!==choices[choices.length-1])continue;
   if(!response.ok)throw Error("UPSTREAM_"+response.status);
   if((response.headers?.get?.("content-type")||"").toLowerCase().includes("text/html"))
    throw Error("UPSTREAM_INVALID_RESPONSE");
   const data=await response.json();
   const responseText=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("").trim();
   if(!responseText||responseText.length>5000)throw Error("UPSTREAM_EMPTY");
   let obj;try{obj=JSON.parse(responseText)}catch{throw Error("INVALID_JSON")}
   const chapter=obj?.[part];
   if(typeof chapter!=="string")throw Error("QUALITY_CHECK_FAILED");
   const text=chapter.trim().replace(/\r\n/g,"\n");
   if(text.length<150||text.length>700||/<[^>]+>|\x60{3}|(?:保證|一定會)(?:升職|結婚|發財|生病|離婚)/.test(text))
    throw Error("QUALITY_CHECK_FAILED");
   if(part==="personality"&&!text.includes(f.dayMaster)&&!text.includes(f.element))
    throw Error("QUALITY_CHECK_FAILED");
   if(part==="timing"&&!f.annual.some(x=>text.includes(String(x.year))))
    throw Error("QUALITY_CHECK_FAILED");
   return {model:candidate,text,usage:{
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
