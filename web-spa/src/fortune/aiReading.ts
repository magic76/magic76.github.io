export type ParsedAiReading={
 summary:string;next12:string[];work:string;love:string;self:string;turning:string;ask:string[];
 legacy?:boolean;
};
const empty=():ParsedAiReading=>({summary:"",next12:[],work:"",love:"",self:"",turning:"",ask:[]});
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
 output.summary=(firstLine.match(/^.*?[。！？.!?](?=\s|$)/)?.[0]||firstLine).trim();
 output.next12=lines(sections.next12||"");
 output.work=sections.work||"";output.love=sections.love||"";
 output.self=sections.self||"";output.turning=sections.turning||"";
 output.ask=lines(sections.ask||"");
 return output;
}
export function isCurrentRequest(expectedId:string,expectedSequence:number,currentId:string|null,currentSequence:number):boolean{
 return Boolean(expectedId)&&expectedId===currentId&&expectedSequence===currentSequence;
}
function stripPrivate(value:unknown):unknown{
 if(Array.isArray(value))return value.map(stripPrivate);
 if(value&&typeof value==="object"){
  const out:Record<string,unknown>={};
  for(const [key,v] of Object.entries(value)){
   if(/latitude|longitude|coordinate|utcOffset|timeZoneId|birthTime|\blat\b|\blon\b/i.test(key))continue;
   out[key]=stripPrivate(v);
  }
  return out;
 }
 return value;
}
export function buildFortuneQuestionPrompt(facts:unknown,summary:string,today:string,lang:string,question:string):string{
 const present=facts!==null&&facts!==undefined&&(!(typeof facts==="object")||Object.keys(facts).length>0);
 const safe=!present?"":typeof facts==="string"?facts.replace(/"(?:latitude|longitude|utcOffset|timeZoneId|birthTime)"\s*:\s*(?:"[^"]*"|[\d.-]+)\s*,?/gi,""):JSON.stringify(stripPrivate(facts));
 const evidence=(!safe||["null","undefined","{}","[]"].includes(safe.trim())?"":safe).slice(0,16000);
 return "你是 Crew Fortune 命理解讀者。輸出語言："+lang+"。今天："+today+
  "。只能引用下列固定計算命盤事實，不可重新計算或補不存在的資料。"+
  "回答依序：先結論、一句命盤依據、一個具體做法；250 字內。不給醫療或投資指令。"+
  (evidence?"\n固定命盤事實："+evidence:"\n尚未提供命盤，請明說無法對個人命盤下結論。")+
  (summary?"\n該命盤既有 AI 重點："+summary:"")+"\n使用者問題："+question;
}
