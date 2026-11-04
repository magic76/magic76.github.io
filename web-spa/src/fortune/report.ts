import type {FortuneMode} from "./types";
import {buildTimingHighlights} from "./yearHighlights";
import type {CurrentPhase} from "./currentPhase";
import{localizedReportFacts}from"./localReportFacts";
import {formatFortuneValue} from "./displayNumber";
import {formatFortuneLocalDate} from "./aiReading";

export type FortuneChapterId = "overview"|"personality"|"career"|"wealth"|"relationships"|"family"|"currentCycle"|"longTerm"|"keyYears"|"advice";
export type FortuneChapter = {id:FortuneChapterId;title:string;text:string;evidence:string[]};
const TITLES:Record<FortuneChapterId,string>={
 overview:"命盤總覽",personality:"性格與天賦",career:"事業與職涯",wealth:"財富與資源",
 relationships:"感情與人際",family:"家庭與子女",currentCycle:"目前人生階段",
 longTerm:"未來十年與長期節奏",keyYears:"重要年份與轉折",advice:"可以如何運用這份解讀"
};
const str=(v:unknown):string=>v===null||v===undefined||v===""?"":formatFortuneValue(v);
const arr=(v:unknown):any[]=>Array.isArray(v)?v:[];
const text=(...parts:unknown[])=>parts.filter(x=>x!==0).map(str).filter(Boolean).join("；");
const uniq=(items:string[])=>[...new Set(items.filter(Boolean))];
function renderValue(v:unknown):string{
 if(v===null||v===undefined||v==="")return "";
 if(typeof v==="string"||typeof v==="number")return str(v);
 if(Array.isArray(v))return v.map(renderValue).filter(Boolean).join("、");
 if(typeof v==="object"){
  const x=v as Record<string,unknown>;
  return text(x.year,x.ganZhi,x.sign,x.house&&"第"+x.house+"宮",x.lord,x.planet,x.startDate&&str(x.startDate)+"–"+str(x.endDate||""));
 }
 return "";
}
function evidence(...items:unknown[]):string[]{return uniq(items.flatMap(x=>Array.isArray(x)?x.map(renderValue):[renderValue(x)]));}
function chapters(parts:Partial<Record<FortuneChapterId,{text:string;evidence?:string[]}>>):FortuneChapter[]{
 return (Object.keys(TITLES) as FortuneChapterId[]).filter(id=>Boolean(parts[id]?.text)).map(id=>({
  id,title:TITLES[id],text:parts[id]!.text,evidence:uniq(parts[id]!.evidence||[])
 }));
}
const fewYears=(v:unknown,n=5)=>uniq(arr(v).map(renderValue).filter(Boolean)).slice(0,n).join("、")||"尚無可對應的年份";
function futureHighlights(mode:FortuneMode,r:any,phase?:CurrentPhase){
 return buildTimingHighlights(mode,r,phase).slice(0,3).map(y=>y.year+"（"+y.label+"；"+y.evidence+"）");
}

function baziCareerAngle(ca:any):string{
 const signals=[
  {count:Number(ca.outputCount||0),label:"食傷（表達與成果）",question:"有哪些想法能變成作品或可展示的成果"},
  {count:Number(ca.officerCount||0),label:"官殺（責任與規範）",question:"哪些角色責任需要更清楚的界線與優先順序"},
  {count:Number(ca.resourceCount||0),label:"印星（學習與支援）",question:"哪些能力值得持續累積、又能從哪裡取得支援"}
 ].sort((a,b)=>b.count-a.count);
 if(signals[0].count===0)return "這三類工作相關十神目前未呈現可比較的數量優勢，適合先從實際工作經驗檢視。";
 return "在這三類記號中，「"+signals[0].label+"」數量相對突出；可拿來問自己：「"+signals[0].question+"？」這些記號可作為閱讀切入點。";
}
function baziWealthAngle(we:any):string{
 const direct=Number(we.directWealthCount||0),indirect=Number(we.indirectWealthCount||0);
 if(!direct&&!indirect)return "本命十神統計未出現正財、偏財記號，不代表沒有收入或財務機會。";
 if(direct===indirect)return "正財與偏財的數量相同，可分別檢視穩定資源管理、彈性機會與風險界線。";
 return direct>indirect
  ?"正財記號較多，傳統上可從穩定收入、履行承諾及持續累積資源的角度反思自己的習慣。"
  :"偏財記號較多，傳統上可從彈性機會、人際資源與不確定性管理的角度反思自己的選擇。";
}

function bazi(r:any,phase?:CurrentPhase):FortuneChapter[]{
 const elements=Object.entries(r.weightedFiveElements||{}).filter(([,v])=>Number(v)>0).sort((a,b)=>Number(b[1])-Number(a[1]));
 const rank=elements.slice(0,3).map(([k,v])=>k+" "+formatFortuneValue(v,true)).join("、");
 const y=arr(r.annualTimeline).find((x:any)=>Number(x.year)===new Date().getFullYear());
 const luck=r.currentLuckPillar;
 const next=arr(r.luckPillars).filter((x:any)=>Number(x.endYear)>=new Date().getFullYear()).slice(0,3);
 const yrs=arr(r.annualTimeline).filter((x:any)=>Number(x.year)>=new Date().getFullYear()).slice(0,10);
 const curYear=new Date().getFullYear();
 const we=r.wealthProfile||{},ca=r.careerProfile||{},re=r.relationshipProfile||{};
 const current=text(luck&&"目前大運 "+luck.ganZhi+"（"+luck.startYear+"–"+luck.endYear+"）",y&&curYear+" 流年 "+y.ganZhi+"，十神 "+y.stemTenGod,y&&y.stemTenGodMeaning&&"這年的十神主題可先理解為「"+y.stemTenGodMeaning+"」",y&&arr(y.natalInteractions).length&&"與本命互動："+uniq(arr(y.natalInteractions).map(String)).slice(0,2).join("、"));
 return chapters({
  overview:{text:"四柱為 "+str(r.fourPillars||"尚未提供")+"，日主 "+str(r.dayMaster||"—")+"（"+str(r.dayMasterElement||"—")+"）。簡化的旺衰指標是「"+str(r.dayMasterStrength||"未提供")+"」，加權五行以 "+(rank||"現有命盤資料")+" 為主要觀察點。",evidence:evidence(r.fourPillars,r.dayMasterStrength,rank)},
  personality:{text:"從日主「"+str(r.dayMasterElement)+"」、五行分布與命局互動看傳統命理所描述的行為傾向。現有結構互動為 "+(fewYears(r.natalInteractions,4)||"未見標註")+"；元素權重依序可先比較 "+rank+"。把這些線索對照自己在壓力、合作與獨立決策時的真實表現，比只貼一個性格標籤更有用。",evidence:evidence(r.dayMasterElement,rank,r.natalInteractions)},
  career:{text:"職涯主題的計算依據包含官殺 "+str(ca.officerCount??"—")+"、印星 "+str(ca.resourceCount??"—")+"、食傷 "+str(ca.outputCount??"—")+"。傳統解讀會分別用這些線索討論責任與制度、學習支援、表達與產出。接下來可對照的工作主題年份："+fewYears(ca.annualSignalYears)+"。"+baziCareerAngle(ca)+"請結合自己的技能、團隊和工作機會判斷。",evidence:evidence(ca.currentLuck?.ganZhi,ca.annualSignalYears)},
  wealth:{text:"此命盤將「"+str(we.wealthElement||"未提供")+"」視為財星對應元素，正財訊號 "+str(we.directWealthCount??"—")+"、偏財訊號 "+str(we.indirectWealthCount??"—")+"。在命理語境中可把它當成檢視穩定資源與彈性機會的提問。"+baziWealthAngle(we)+"較值得觀察的資源主題年份："+fewYears(we.annualSignalYears)+"。",evidence:evidence(we.wealthElement,we.currentLuck?.ganZhi,we.annualSignalYears)},
  relationships:{text:"命盤以日支「"+str(re.spousePalace||"—")+"」作為關係宮位的傳統觀察點，關係相關十神為 "+(renderValue(re.spousePalaceTenGods)||"尚無完整資料")+"。有互動標記的年份："+fewYears(re.annualSignalYears)+"。這些記號適合用來對照自己的溝通方式、合作界線與親密關係需求。",evidence:evidence(re.spousePalace,re.spousePalaceTenGods)},
  currentCycle:{text:current||"目前可查看大運和逐年流年，暫無足夠資料可作更精細的階段解讀。",evidence:evidence(luck?.ganZhi,y?.ganZhi,y?.stemTenGod,y?.natalInteractions)},
  longTerm:{text:"未來十年可先按大運分成不同背景："+(next.map((x:any)=>x.ganZhi+"（"+x.startYear+"–"+x.endYear+"）").join("；")||"大運時段資料未提供")+"。目前已計算的逐年主題包括 "+(yrs.slice(0,6).map((x:any)=>x.year+" "+arr(x.themes).join("／")).join("；")||"尚無可用的逐年資料")+"。適合將不同年份的傳統主題當作檢視人生目標和資源配置的提示。",evidence:evidence(next.map((x:any)=>x.ganZhi),yrs.slice(0,5).map((x:any)=>x.ganZhi))},
  keyYears:{text:"依目前的流年十神、與本命合沖、工作／資源／關係主題訊號，優先整理 "+(futureHighlights("bazi",r,phase).join("；")||"尚無明顯的可排序年份")+"。可到「時間節奏」逐年查看。",evidence:futureHighlights("bazi",r,phase)},
  advice:{text:"先挑一項你真的在意的生活主題，再對照命盤的具體標記和你自己的經驗。若同一年的工作與關係訊號並存，請分開思考兩種情境，避免把不同領域混成一種運勢。重大財務、健康或家庭決定仍應依實際資訊與專業意見處理。",evidence:[]}
 });
}
function tarot(r:any,phase?:CurrentPhase):FortuneChapter[]{
 const y=arr(r.personalYearTimeline).find((x:any)=>Number(x.year)===new Date().getFullYear());
 const next=arr(r.personalYearTimeline).filter((x:any)=>Number(x.year)>=new Date().getFullYear()).slice(0,9);
 const currentYear=r.personalYearCalendarYear;
 const cards=arr(r.birthCards).map((x:any)=>x.number+" "+x.name+"（"+x.keywords+"）").join("、");
 const pinnacle=arr(r.pinnacles).map((x:any,i:number)=>"階段 "+(i+1)+"："+x+"（"+str(arr(r.pinnacleTiming)[i])+"歲）").join("；");
 return chapters({
  overview:{text:"出生牌組為 "+str(r.birthCardDisplay||"—")+"，生命道路 "+str(r.lifePathDisplay||"—")+"，態度數 "+str(r.attitudeNumber||"—")+"。這套系統用生日數字整理反思主題，並不是抽牌占卜。",evidence:evidence(r.birthCardDisplay,r.lifePathDisplay,r.attitudeNumber)},
  personality:{text:(r.personalityCardName&&r.personalityCardName===r.soulCardName?"內外一致：人格牌與靈魂牌同為「"+str(r.personalityCardName)+"」，可從同一張牌反思外在表達與內在需求。":"外在人格牌「"+str(r.personalityCardName||"—")+"」與內在靈魂牌「"+str(r.soulCardName||"—")+"」提供兩種不同的自我描述角度。")+"生命道路 "+str(r.lifePathDisplay)+"、生日數 "+str(r.birthdayNumber||"—")+" 與態度數 "+str(r.attitudeNumber||"—")+" 可以和自己的長期行為習慣對照。牌組關鍵詞："+(cards||"未提供")+"。",evidence:evidence(cards,r.birthdayNumber,r.attitudeNumber)},
  career:{text:"工作主題可以從生命道路 "+str(r.lifePathDisplay)+"、人格牌「"+str(r.personalityCardName)+"」及目前個人年 "+str(r.personalYear)+" 三個層次來比較。階段數字依序為 "+(pinnacle||"尚無資料")+"。可用這些週期設問：你目前更在意建立基礎、嘗試變化，還是完成已有的承諾？實際職涯仍要看能力與外在條件。",evidence:evidence(r.careerProfile?.evidence,r.pinnacles)},
  wealth:{text:"這套生日數字系統目前計算出個人年 "+str(r.personalYear)+"、個人月 "+str(r.personalMonth)+"，以及四項挑戰數 "+renderValue(r.challenges)+"。可把它們視為檢視時間運用、消費習慣、資源壓力的提醒。",evidence:evidence(r.wealthProfile?.evidence,r.challenges)},
  relationships:{text:"關係主題可對照人格牌「"+str(r.personalityCardName)+"」與靈魂牌「"+str(r.soulCardName)+"」是否呈現不同的自我需求，以及態度數 "+str(r.attitudeNumber)+" 所代表的傳統分類。重點是回頭觀察自己如何溝通、如何設立界線。",evidence:evidence(r.relationshipProfile?.evidence)},
  currentCycle:{text:str(currentYear)+" 年個人年為 "+str(r.personalYear)+"「"+str(r.personalYearCardName)+"」，個人月為 "+str(r.personalMonth)+"。"+(y?"當年完整主題："+str(y.plainSummary)+"。":"")+"這些日期以日曆年為界。",evidence:evidence(r.personalYearCardName,r.personalMonth,y?.keywords)},
  longTerm:{text:"接下來數年的個人年順序："+(next.map((x:any)=>x.year+"："+x.personalYear+" "+x.cardName).join("；")||"未提供")+"。四大巔峰階段："+(pinnacle||"尚無資料")+"；挑戰數為 "+renderValue(r.challenges)+"。閱讀時同時留意人生長階段和每年短週期。",evidence:evidence(next.slice(0,5).map((x:any)=>x.cardName),r.challenges)},
  keyYears:{text:"依已算出的個人年與牌組關鍵詞，值得優先展開的年份："+(futureHighlights("tarot",r,phase).join("；")||"暫無資料")+"。可至「時間節奏」查看各年的細節。",evidence:futureHighlights("tarot",r,phase)},
  advice:{text:"把個人年當作年度自我回顧題目：今年的重要選擇是什麼，哪項習慣想保留，哪項想調整？對照個人月與長期巔峰數時，優先記錄實際事件和主觀感受，避免事後只挑符合敘述的證據。",evidence:[]}
 });
}
function vedic(r:any,phase?:CurrentPhase):FortuneChapter[]{
 const md=r.currentMahadasha||{},ad=r.currentAntardasha||{};
 const hs=arr(r.houses),getHouse=(i:number)=>hs.find((x:any)=>Number(x.house)===i)||{};
 const p=arr(r.planets),getPlanet=(name:string)=>p.find((x:any)=>x.name===name)||{};
 const mdFuture=arr(r.mahadashaTimeline).filter((x:any)=>str(x.endDate)>=formatFortuneLocalDate(new Date())).slice(0,4);
 const transit=arr(r.majorTransitTimeline).slice(0,6);
 const profile=(key:string)=>evidence(r[key]?.evidence,r[key]?.natalEvidence);
 return chapters({
  overview:{text:"出生上升為 "+str(r.lagnaSign||"—")+"（"+str(r.lagnaNakshatra||"—")+"），月亮位於 "+str(r.moonSign||"—")+"（"+str(r.moonNakshatra||"—")+"），太陽位於 "+str(r.sunSign||"—")+"。這份星盤使用 Lahiri 恆星黃道與 Whole Sign 宮位系統；不同派別可能得出不同詮釋。",evidence:evidence(r.lagnaSign,r.moonSign,r.sunSign,r.lagnaNakshatra)},
  personality:{text:"個性相關的傳統觀察點是上升與其宮主、月亮、太陽。目前上升星宿為 "+str(r.lagnaNakshatra||"—")+"，月亮星宿為 "+str(r.moonNakshatra||"—")+"。依盤面能查看的具體位置："+[getPlanet("Sun"),getPlanet("Moon")].map(x=>str(x.name)+" "+str(x.sign)+"／第 "+str(x.house)+" 宮").join("；")+"。",evidence:profile("personalityProfile")},
  career:{text:"事業主題依第 10 宮、其宮主、土星及木星位置整理。第 10 宮為 "+str(getHouse(10).sign||"—")+"，宮主 "+str(getHouse(10).lord||"—")+"；目前主週期 "+str(md.lord||"—")+" 亦提供時間背景。可依這些已計算的位置檢視工作與責任的主題。",evidence:profile("careerProfile")},
  wealth:{text:"資源主題以第 2 宮與第 11 宮、木星／金星及 Dasha 為傳統依據。第 2 宮 "+str(getHouse(2).sign||"—")+"（宮主 "+str(getHouse(2).lord||"—")+"），第 11 宮 "+str(getHouse(11).sign||"—")+"（宮主 "+str(getHouse(11).lord||"—")+"）。",evidence:profile("wealthProfile")},
  relationships:{text:"關係主題主要觀察第 7 宮、其宮主與金星。第 7 宮為 "+str(getHouse(7).sign||"—")+"，宮主 "+str(getHouse(7).lord||"—")+"。可用盤面資料反思合作、情感表達與關係中的角色。",evidence:profile("relationshipProfile")},
  family:{text:"家庭與子女主題參考第 4 宮、第 5 宮、各宮宮主及月亮／木星。第 4 宮："+str(getHouse(4).sign||"—")+"（"+str(getHouse(4).lord||"—")+"）；第 5 宮："+str(getHouse(5).sign||"—")+"（"+str(getHouse(5).lord||"—")+"）。",evidence:profile("familyChildrenProfile")},
  currentCycle:{text:"目前 Vimshottari 主週期是 "+str(md.lord||"—")+"（"+str(md.startDate||"—")+" 至 "+str(md.endDate||"—")+"），次週期是 "+str(ad.lord||"—")+"（"+str(ad.startDate||"—")+" 至 "+str(ad.endDate||"—")+"）。目前 Gochar 計算日期為 "+str(r.currentTransitDate||"未提供")+"。週期與行運需要分開閱讀。",evidence:evidence(md,ad,r.currentTransitDate)},
  longTerm:{text:"已計算的主週期時間軸："+(mdFuture.map((x:any)=>x.lord+"（"+x.startDate+"–"+x.endDate+"）").join("；")||"尚無長期時段")+"。接下來三年的主要行運可觀察木星、土星與交點的換座事件。",evidence:evidence(mdFuture)},
  keyYears:{text:"可優先閱讀的時期："+(futureHighlights("vedic",r,phase).join("；")||"尚無資料")+"。已列出的換座事件："+(transit.map((x:any)=>x.date+" "+x.planet+" "+x.fromSign+"→"+x.toSign).join("；")||"無")+"。",evidence:uniq([...futureHighlights("vedic",r,phase),...evidence(transit)])},
  advice:{text:"挑選一個你在意的宮位或目前 Dasha，展開「詳細資料」核對實際行星、宮主與起訖時間。每次解讀應引用已存在的盤面依據。",evidence:[]}
 });
}
export type FortuneTranslator=(key:string,options?:Record<string,unknown>)=>string;
export function buildLocalReport(mode:FortuneMode,result:any,tr?:FortuneTranslator,phase?:CurrentPhase):FortuneChapter[]{
 if(!result||typeof result!=="object")return [];
 const original=mode==="bazi"?bazi(result,phase):mode==="tarot"?tarot(result,phase):vedic(result,phase);
 if(!tr)return original; // Historical and Teacher consumers retain exact zh-TW facts.
 return original.map(chapter=>({...chapter,text:tr("chapter."+chapter.id,{facts:localizedReportFacts(mode,result,chapter.id,tr,phase,buildTimingHighlights(mode,result,phase,tr))})}));
}
export function buildReportPrompt(mode:FortuneMode,result:any,style:string,options?:{today?:string;locale?:string;phase?:{age:number;promptLine:string}|string}):string{
 const fields:Record<FortuneMode,string[]>={
  bazi:["fourPillars","dayMaster","dayMasterElement","weightedFiveElements","tenGods","dayMasterStrength","natalInteractions","luckPillars","currentLuckPillar","annualTimeline","wealthProfile","careerProfile","relationshipProfile"],
  tarot:["birthCardDisplay","birthCards","lifePathDisplay","birthdayNumber","attitudeNumber","personalityCardName","soulCardName","pinnacles","pinnacleTiming","challenges","periodCycles","personalYear","personalMonth","personalYearTimeline","personalMonthTimeline","identityProfile","careerProfile","wealthProfile","relationshipProfile"],
  vedic:["lagnaSign","lagnaNakshatra","moonSign","moonNakshatra","sunSign","planets","houses","houseLords","currentMahadasha","currentAntardasha","mahadashaTimeline","currentTransits","currentTransitDate","majorTransitTimeline","personalityProfile","careerProfile","wealthProfile","relationshipProfile","familyChildrenProfile"]
 };
 const source:Record<string,unknown>={};
 for(const key of fields[mode])if(result?.[key]!==undefined)source[key]=result[key];
 const now=new Date();
 const today=options?.today||[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
 const lang=options?.locale||"繁體中文";
 const phase=typeof options?.phase==="string"?options.phase:options?.phase?.promptLine||"未提供";
 const age=typeof options?.phase==="object"?options.phase.age:"未提供";
 return "你是 Crew Fortune 的解讀者。讀者是不懂命理的一般人，想知道：我是怎樣的人、工作與錢、感情、今年和接下來 12 個月該怎麼做。\n"+
  "輸出語言："+lang+"（標記行除外，全部用此語言）。語氣："+style+"。\n"+
  "今天日期："+today+"；使用者目前 "+age+" 歲（實歲）；現在所在階段："+phase+"\n"+
  "規則：\n"+
  "1. 只能使用下方「固定計算資料」與「現在所在階段」，不得重新計算、不得補造不存在的星曜、十神、宮位、牌或日期。\n"+
  "2. 每個專有名詞第一次出現時，用括號補一句白話（例如「七殺（壓力與硬仗）」）；同一名詞只解釋一次。\n"+
  "3. 每個結論都要引用對應主題的固定計算依據，解釋多個訊號怎麼相互影響；不同主題不能重複同一段話。\n"+
  "4. 不要寫「不代表／不能保證」之類的免責句，頁面已有統一說明；不預測死亡、疾病、懷孕、災難，不給投資或醫療指令。\n"+
  "5. 不寫放之四海皆準的人格描述：如果一句話換成任何人的盤也成立，就刪掉。應指出個人命盤中特別的優勢、限制或互相拉扯的訊號。\n"+
  "6. 建議要具體到「可以做／避免」與時間（年或月份）。\n"+
  "7. 不要在輸出中提到這些規則、資料來源格式或「依據列表記錄」之類的說法。\n"+
  "8. 不要寫出資料的欄位名或英文鍵名（例如 weightedFiveElements、annualTimeline、pinnacleTiming），改用一般人看得懂的說法。\n"+
  "9. 資料沒有提供的意義、相位、宮位關係或解釋，不要自行補上；資料中有「白話／meaning／plainSummary」時優先沿用。\n"+
  "請只輸出以下 8 個標記段落（標記行原樣保留），總長約 1000–1500 個中文字（其他語言約 550–750 words）：\n"+
  "## @summary\n（30 字內：這張盤最核心的一個特點＋現在的時機；不附依據）\n"+
  "## @next12\n（剛好 3 點，每點一行：時間 → 主題 → 可以做什麼）\n"+
  "## @work\n（只談事業與職涯：用官印食傷、職涯 profile 或第 10 宮等實際存在的資料；至少兩個具體命盤事實及其交互作用，不要重複財務分析）\n"+
  "## @wealth\n（只談金錢與資源：用財星、財務 profile 或第 2／11 宮等實際存在的資料；至少兩個具體命盤事實，不要重複職涯分析，不給投資指令）\n"+
  "## @love\n（感情與人際：結合關係資料與具體命盤依據，說明相處優勢、摩擦及調整方向）\n"+
  "## @self\n（個性與優勢：以這張盤獨有的強弱對比為主，與事業、財務、關係章節避免重複）\n"+
  "## @turning\n（最近一次大運／主週期／巔峰期切換：何時、從什麼變成什麼、怎麼準備）\n"+
  "## @ask\n（3 個以這張盤為依據的具體追問，每個一行）\n"+
  "固定計算資料："+JSON.stringify(source);
}
