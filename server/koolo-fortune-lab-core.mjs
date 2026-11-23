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
 if(!Array.isArray(raw.questions)||raw.questions.length<1||raw.questions.length>2)return null;
 const questions=raw.questions.map(x=>safeText(x,160));
 if(questions.some(x=>x.length<5))return null;
 const relations=Array.isArray(raw.relations)?raw.relations.slice(0,5).map(x=>safeText(x,35)).filter(Boolean):[];
 return {fourPillars:p.join(" "),dayMaster:master,element,strength,weighted,counts,
  luck:ganZhi?ganZhi:"",annual,questions,relations};
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
 "請以溫暖、沉穩、有見地的繁體中文，直接為命主撰寫專屬八字命書。不要用制式聲明開場，也不要自稱老師或以第一人稱介紹作者身分。",
 "只有下方已計算的命盤數據可當事實。不可編造四柱、干支、十神、流年或必定發生的事件。不許生死疾病預言、投資保證或宿命式語氣。所有建議都應保留個人選擇與現實條件的空間。",
 '只回傳 JSON object，七個字串欄位："preface","personality","career","relationships","timing","letter","plan"。每段約 160 到 300 字；letter 約 230 到 400 字。不得重複內容。',
 "preface：直接從命主的日主、五行特色與當下人生課題切入，像一封專門寫給這個人的信；第一段不要講製作方式、原理或免責聲明。",
 "personality：務必寫出日主或五行，提出優勢、盲點與可驗證的情境，從實際人生選擇反思。",
 "career：包含事業與財富，參照提供的十神計數，指出限制及可操作的方向。",
 "relationships：描述溝通方式、界線與關係，沒有婚期預言。",
 "timing：逐一說明三個提供的年度及主題，使用實際年份，不保證任何事件。",
 "letter：針對命主個人問題逐題回覆，給可執行的具體建議；自然收束，不加任何作者頭銜或署名。",
 "plan：列出四週具體可執行、可衡量的行動。",
 "這是 Koolo 專屬命書服務。正文只寫命盤解讀與具體建議，不說明撰寫者身分、製作技術、平台原理或免責聲明，也不要編造曾面談、通靈、神諭或專業診斷的經歷。文字要有個性、克制、不空泛，不要套話；不需回傳封面、五行分數或 HTML。",
 "命盤摘要（沒有姓名／出生日期）："+JSON.stringify(f)
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
