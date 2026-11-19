export type ParsedAiReading={
 summary:string;next12:string[];work:string;wealth:string;love:string;self:string;turning:string;ask:string[];
 legacy?:boolean;
};
const empty=():ParsedAiReading=>({summary:"",next12:[],work:"",wealth:"",love:"",self:"",turning:"",ask:[]});
const lines=(s:string)=>s.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(x=>x.replace(/^\s*(?:[-*•]|\d+[.)、])\s*/,"").trim()).filter(Boolean);
export function parseAiReading(text:string):ParsedAiReading{
 const output=empty();
 const headers=[...String(text||"").matchAll(/^\s*##\s+@([a-z0-9]+)\s*$/gim)];
 if(!headers.length){if(/^\s*##\s+\S+/m.test(text||""))return{...output,legacy:true};return output}
 const sections:Record<string,string>={};
 for(let i=0;i<headers.length;i++){
  const key=headers[i][1].toLowerCase(),start=(headers[i].index||0)+headers[i][0].length;
  const end=i+1<headers.length?(headers[i+1].index||0):text.length;
  sections[key]=text.slice(start,end).trim();
 }
 const firstLine=(sections.summary||"").split(/\r?\n/).map(line=>line.trim()).find(Boolean)||"";
 output.summary=(firstLine.match(/^.*?[。！？.!?]/)?.[0]||firstLine).trim();
 output.next12=lines(sections.next12||"");
 output.work=sections.work||"";output.wealth=sections.wealth||"";output.love=sections.love||"";
 output.self=sections.self||"";output.turning=sections.turning||"";
 output.ask=lines(sections.ask||"");
 return output;
}
export type FortuneAiAudit={ok:boolean;issues:string[]};

function sectionOverlap(first:string,second:string):number{
 const grams=(value:string)=>{
  const cleaned=value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu,"");
  const found=new Set<string>();
  for(let i=0;i+3<=cleaned.length;i++)found.add(cleaned.slice(i,i+3));
  return found;
 };
 const a=grams(first),b=grams(second);
 if(!a.size||!b.size)return 0;
 let shared=0;
 for(const part of a)if(b.has(part))shared++;
 return shared/Math.min(a.size,b.size);
}

/** Prefer recognizable calculated identifiers over generic sentiment as evidence. */
function groundedTokens(facts:unknown,mode:"bazi"|"tarot"|"vedic"):string[]{
 if(!facts||typeof facts!=="object")return [];
 const r=facts as Record<string,any>;
 const values:unknown[]=mode==="bazi"
  ?[r.fourPillars,r.dayMaster,r.dayMasterElement,r.currentLuckPillar?.ganZhi,...(Array.isArray(r.annualTimeline)?r.annualTimeline.slice(0,3).map((x:any)=>x.ganZhi):[])]
  :mode==="tarot"
   ?[r.birthCardDisplay,r.personalityCardName,r.soulCardName,r.personalYearCardName,...(Array.isArray(r.birthCards)?r.birthCards.map((x:any)=>x.name):[])]
   :[r.lagnaSign,r.moonSign,r.sunSign,r.lagnaNakshatra,r.moonNakshatra,r.currentMahadasha?.lord,r.currentAntardasha?.lord,...(Array.isArray(r.houses)?r.houses.map((x:any)=>x.sign):[])];
 return [...new Set(values.filter((x):x is string=>typeof x==="string").map(x=>x.trim()).filter(x=>x.length>=2&&x!=="未提供"&&x!=="—"))];
}
function hasConcreteAnchor(section:string,tokens:string[]):boolean{
 return tokens.some(token=>section.includes(token));
}
const EMPTY_CLAIMS=[/你(?:擁有|具有|具備)(?:很大|無限|不少)?(?:的)?潛力/,/只要(?:保持|相信|堅持)(?:自己|初心|努力)/,/機會與挑戰(?:並存|同時存在)/,/保持(?:積極|正向|樂觀)(?:的)?心態/];

/** Checks the AI's actual output. Local computed facts remain the fallback on failure. */
export function auditAiReading(text:string,facts:unknown,mode:"bazi"|"tarot"|"vedic"):FortuneAiAudit{
 const parsed=parseAiReading(text),issues:string[]=[];
 if(parsed.legacy||!parsed.summary)issues.push("缺少有效的 @summary 段落");
 for(const [name,value] of [["work",parsed.work],["wealth",parsed.wealth],["love",parsed.love],["self",parsed.self]]){
  if([...value.trim()].length<50)issues.push("@"+name+" 必須提供獨立而具體的分析");
 }
 if(parsed.turning.trim().length<16)issues.push("@turning 必須解釋實際週期或資料不足的理由");
 if(parsed.next12.length!==3)issues.push("@next12 必須恰好三點");
 if(parsed.ask.length!==3)issues.push("@ask 必須恰好三題");
 if(parsed.work&&parsed.wealth&&sectionOverlap(parsed.work,parsed.wealth)>0.72)issues.push("工作與財務兩段高度重複");
 const tokens=groundedTokens(facts,mode);
 // Only enforce anchor presence when the calculation exposes usable identifiers.
 if(tokens.length>=2){
  const sections=[["work",parsed.work],["wealth",parsed.wealth],["love",parsed.love],["self",parsed.self]] as const;
  const anchored=sections.filter(([,body])=>hasConcreteAnchor(body,tokens)).length;
  if(anchored<2)issues.push("至少兩個主題段落需引用可核對的命盤標記，而非只有通用建議");
 }
 for(const [name,body] of [["work",parsed.work],["wealth",parsed.wealth],["love",parsed.love],["self",parsed.self]]){
  if(EMPTY_CLAIMS.some(pattern=>pattern.test(body))&&!hasConcreteAnchor(body,tokens))issues.push("@"+name+" 有空泛敘述，請改為命盤依據與可驗證情境");
 }

 if(mode==="bazi"&&facts&&typeof facts==="object"){
  const known=JSON.stringify(facts);
  const mentioned=new Set(String(text||"").match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g)||[]);
  for(const pillar of mentioned)if(!known.includes(pillar))issues.push("引用了命盤未提供的干支："+pillar);
 }
 return{ok:issues.length===0,issues};
}

export function isCurrentRequest(expectedId:string,expectedSequence:number,currentId:string|null,currentSequence:number):boolean{
 return Boolean(expectedId)&&expectedId===currentId&&expectedSequence===currentSequence;
}
function stripPrivate(value:unknown):unknown{
 if(Array.isArray(value))return value.map(stripPrivate);
 if(value&&typeof value==="object"){
  const out:Record<string,unknown>={};
  for(const [key,v] of Object.entries(value)){
   if(/birthDate|birthTime|latitude|longitude|coordinate|utcOffset|timeZoneId|\blat\b|\blon\b/i.test(key))continue;
   out[key]=stripPrivate(v);
  }
  return out;
 }
 return value;
}
export function buildFortuneQuestionPrompt(facts:unknown,summary:string,today:string,lang:string,question:string,history?:ReadonlyArray<{q:string;a:string}>):string{
 const present=facts!==null&&facts!==undefined&&(!(typeof facts==="object")||Object.keys(facts).length>0);
 const safe=!present?"":typeof facts==="string"?facts.replace(/"(?:birthDate|birthTime|latitude|longitude|utcOffset|timeZoneId)"\s*:\s*(?:"[^"]*"|[\d.-]+)\s*,?/gi,""):JSON.stringify(stripPrivate(facts));
 const evidence=(!safe||!safe.trim()||["null","undefined","{}","[]"].includes(safe.trim())?"":safe).slice(0,16000);
 return "你是 Crew Fortune 命理解讀者。輸出語言："+lang+"。今天："+today+
  "。只能引用下列固定計算命盤事實，不可重新計算或補不存在的資料。"+
  "回答依序：先結論、一句命盤依據、一個具體做法；請使用純文字小標，不使用 Markdown 的 **、# 或條列標記；250 字內。不給醫療或投資指令。"+
  (evidence?"\n固定命盤事實："+evidence:"\n尚未提供命盤，請明說無法對個人命盤下結論。")+
  (summary?"\n該命盤既有 AI 重點："+summary:"")+
  (history?.length?"\n最近對話（僅供上下文參考）："+history.slice(-3).map(x=>"\n問："+String(x.q||"").slice(0,400)+"\n答："+String(x.a||"").slice(0,400)).join(""):"")+
  "\n使用者問題："+question;
}

export function formatFortuneLocalDate(date:Date):string{
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
