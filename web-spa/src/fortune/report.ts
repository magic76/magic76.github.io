import type {FortuneMode} from "./types";
import {buildYearHighlights} from "./yearHighlights";

export type FortuneChapterId = "overview"|"personality"|"career"|"wealth"|"relationships"|"family"|"currentCycle"|"longTerm"|"keyYears"|"advice";
export type FortuneChapter = {id:FortuneChapterId;title:string;text:string;evidence:string[]};
const TITLES:Record<FortuneChapterId,string>={
 overview:"命盤總覽",personality:"性格與天賦",career:"事業與職涯",wealth:"財富與資源",
 relationships:"感情與人際",family:"家庭與子女",currentCycle:"目前人生階段",
 longTerm:"未來十年與長期節奏",keyYears:"重要年份與轉折",advice:"可以如何運用這份解讀"
};
const str=(v:unknown):string=>v===null||v===undefined||v===""?"":String(v);
const arr=(v:unknown):any[]=>Array.isArray(v)?v:[];
const text=(...parts:unknown[])=>parts.map(str).filter(Boolean).join("；");
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
const fewYears=(v:unknown,n=5)=>arr(v).slice(0,n).map(renderValue).filter(Boolean).join("、")||"尚無可對應的年份";
function futureHighlights(mode:FortuneMode,r:any){
 return buildYearHighlights(mode,r).slice(0,4).map(y=>y.year+"（"+y.label+"；"+y.evidence+"）");
}
function bazi(r:any):FortuneChapter[]{
 const elements=Object.entries(r.weightedFiveElements||{}).filter(([,v])=>Number(v)>0).sort((a,b)=>Number(b[1])-Number(a[1]));
 const rank=elements.slice(0,3).map(([k,v])=>k+" "+v).join("、");
 const y=arr(r.annualTimeline).find((x:any)=>Number(x.year)===new Date().getFullYear());
 const luck=r.currentLuckPillar;
 const next=arr(r.luckPillars).filter((x:any)=>Number(x.endYear)>=new Date().getFullYear()).slice(0,3);
 const yrs=arr(r.annualTimeline).filter((x:any)=>Number(x.year)>=new Date().getFullYear()).slice(0,10);
 const curYear=new Date().getFullYear();
 const we=r.wealthProfile||{},ca=r.careerProfile||{},re=r.relationshipProfile||{};
 const current=text(luck&&"目前大運 "+luck.ganZhi+"（"+luck.startYear+"–"+luck.endYear+"）",y&&curYear+" 流年 "+y.ganZhi+"，十神 "+y.stemTenGod,y&&y.plainSummary);
 return chapters({
  overview:{text:"四柱為 "+str(r.fourPillars||"尚未提供")+"，日主 "+str(r.dayMaster||"—")+"（"+str(r.dayMasterElement||"—")+"）。簡化的旺衰指標是「"+str(r.dayMasterStrength||"未提供")+"」，加權五行以 "+(rank||"現有命盤資料")+" 為主要觀察點。這些是傳統命理計算與分類，並不能單獨判定現實中的成敗。",evidence:evidence(r.fourPillars,r.dayMasterStrength,rank)},
  personality:{text:"從日主「"+str(r.dayMasterElement)+"」、五行分布與命局互動看傳統命理所描述的行為傾向。現有結構互動為 "+(fewYears(r.natalInteractions,4)||"未見標註")+"；元素權重依序可先比較 "+rank+"。把這些線索對照自己在壓力、合作與獨立決策時的真實表現，比只貼一個性格標籤更有用。",evidence:evidence(r.dayMasterElement,rank,r.natalInteractions)},
  career:{text:"職涯主題的計算依據包含官殺 "+str(ca.officerCount??"—")+"、印星 "+str(ca.resourceCount??"—")+"、食傷 "+str(ca.outputCount??"—")+"。傳統解讀會分別用這些線索討論責任與制度、學習支援、表達與產出；它們不是升遷機率。接下來可對照的工作主題年份："+fewYears(ca.annualSignalYears)+"。請結合自己的技能、團隊和工作機會判斷。",evidence:evidence(ca.currentLuck?.ganZhi,ca.annualSignalYears)},
  wealth:{text:"此命盤將「"+str(we.wealthElement||"未提供")+"」視為財星對應元素，正財訊號 "+str(we.directWealthCount??"—")+"、偏財訊號 "+str(we.indirectWealthCount??"—")+"。在命理語境中可把它當成檢視穩定資源與彈性機會的提問，不代表現金收入或投資績效。較值得觀察的資源主題年份："+fewYears(we.annualSignalYears)+"。",evidence:evidence(we.wealthElement,we.currentLuck?.ganZhi,we.annualSignalYears)},
  relationships:{text:"命盤以日支「"+str(re.spousePalace||"—")+"」作為關係宮位的傳統觀察點，關係相關十神為 "+(renderValue(re.spousePalaceTenGods)||"尚無完整資料")+"。有互動標記的年份："+fewYears(re.annualSignalYears)+"。這些標記只用來反思溝通、承諾與界線，不代表一定結婚、分手或遇到某種人。",evidence:evidence(re.spousePalace,re.spousePalaceTenGods)},
  currentCycle:{text:current||"目前可查看大運和逐年流年，暫無足夠資料可作更精細的階段解讀。",evidence:evidence(luck?.ganZhi,y?.ganZhi,y?.stemTenGod,y?.natalInteractions)},
  longTerm:{text:"未來十年可先按大運分成不同背景："+(next.map((x:any)=>x.ganZhi+"（"+x.startYear+"–"+x.endYear+"）").join("；")||"大運時段資料未提供")+"。目前已計算的逐年主題包括 "+(yrs.slice(0,6).map((x:any)=>x.year+" "+arr(x.themes).join("／")).join("；")||"尚無可用的逐年資料")+"。適合將不同年份的傳統主題當作檢視人生目標和資源配置的提示，而非確定的事件日程。",evidence:evidence(next.map((x:any)=>x.ganZhi),yrs.slice(0,5).map((x:any)=>x.ganZhi))},
  keyYears:{text:"依目前的流年十神、與本命合沖、工作／資源／關係主題訊號，優先整理 "+(futureHighlights("bazi",r).join("；")||"尚無明顯的可排序年份")+"。這是依規則挑出適合深入閱讀的時間點，不是吉凶分數或事件預測。可到「時間節奏」逐年查看。",evidence:futureHighlights("bazi",r)},
  advice:{text:"先挑一項你真的在意的生活主題，再對照命盤的具體標記和你自己的經驗。若同一年的工作與關係訊號並存，請分開思考兩種情境，避免把不同領域混成一種運勢。重大財務、健康或家庭決定仍應依實際資訊與專業意見處理。",evidence:[]}
 });
}
function tarot(r:any):FortuneChapter[]{
 const y=arr(r.personalYearTimeline).find((x:any)=>Number(x.year)===new Date().getFullYear());
 const next=arr(r.personalYearTimeline).filter((x:any)=>Number(x.year)>=new Date().getFullYear()).slice(0,9);
 const currentYear=r.personalYearCalendarYear;
 const cards=arr(r.birthCards).map((x:any)=>x.number+" "+x.name+"（"+x.keywords+"）").join("、");
 const pinnacle=arr(r.pinnacles).map((x:any,i:number)=>"階段 "+(i+1)+"："+x+"（"+str(arr(r.pinnacleTiming)[i])+"歲）").join("；");
 return chapters({
  overview:{text:"出生牌組為 "+str(r.birthCardDisplay||"—")+"，生命道路 "+str(r.lifePathDisplay||"—")+"，態度數 "+str(r.attitudeNumber||"—")+"。這套系統用生日數字整理反思主題，並不是抽牌占卜，也無法證明個人的命運或能力。",evidence:evidence(r.birthCardDisplay,r.lifePathDisplay,r.attitudeNumber)},
  personality:{text:"外在人格牌「"+str(r.personalityCardName||"—")+"」與內在靈魂牌「"+str(r.soulCardName||"—")+"」提供兩種不同的自我描述角度。生命道路 "+str(r.lifePathDisplay)+"、生日數 "+str(r.birthdayNumber||"—")+" 與態度數 "+str(r.attitudeNumber||"—")+" 可以和自己的長期行為習慣對照。牌組關鍵詞："+(cards||"未提供")+"；不同牌組的說法不應當成客觀人格測驗。",evidence:evidence(cards,r.birthdayNumber,r.attitudeNumber)},
  career:{text:"工作主題可以從生命道路 "+str(r.lifePathDisplay)+"、人格牌「"+str(r.personalityCardName)+"」及目前個人年 "+str(r.personalYear)+" 三個層次來比較。階段數字依序為 "+(pinnacle||"尚無資料")+"。可用這些週期設問：你目前更在意建立基礎、嘗試變化，還是完成已有的承諾？實際職涯仍要看能力與外在條件。",evidence:evidence(r.careerProfile?.evidence,r.pinnacles)},
  wealth:{text:"財務與資源不會因某張牌而有保證結果。這套生日數字系統目前計算出個人年 "+str(r.personalYear)+"、個人月 "+str(r.personalMonth)+"，以及四項挑戰數 "+renderValue(r.challenges)+"。可把它們視為檢視時間運用、消費習慣、資源壓力的提醒，不應轉化成投資指令。",evidence:evidence(r.wealthProfile?.evidence,r.challenges)},
  relationships:{text:"關係主題可對照人格牌「"+str(r.personalityCardName)+"」與靈魂牌「"+str(r.soulCardName)+"」是否呈現不同的自我需求，以及態度數 "+str(r.attitudeNumber)+" 所代表的傳統分類。重點是回頭觀察自己如何溝通、如何設立界線，而非預測某年一定出現關係事件。",evidence:evidence(r.relationshipProfile?.evidence)},
  currentCycle:{text:str(currentYear)+" 年個人年為 "+str(r.personalYear)+"「"+str(r.personalYearCardName)+"」，個人月為 "+str(r.personalMonth)+"。"+(y?"當年完整主題："+str(y.plainSummary)+"。":"")+"這些日期對應日曆年系統，並非每個月都必定發生事件。",evidence:evidence(r.personalYearCardName,r.personalMonth,y?.keywords)},
  longTerm:{text:"接下來數年的個人年順序："+(next.map((x:any)=>x.year+"："+x.personalYear+" "+x.cardName).join("；")||"未提供")+"。四大巔峰階段："+(pinnacle||"尚無資料")+"；挑戰數為 "+renderValue(r.challenges)+"。閱讀時同時留意人生長階段和每年短週期，但不要把數字當成事件機率。",evidence:evidence(next.slice(0,5).map((x:any)=>x.cardName),r.challenges)},
  keyYears:{text:"依已算出的個人年與牌組關鍵詞，值得優先展開的年份："+(futureHighlights("tarot",r).join("；")||"暫無資料")+"。這些是閱讀導航，不代表特定年份會必然變好或變壞；詳細主題請至「時間節奏」查看。",evidence:futureHighlights("tarot",r)},
  advice:{text:"把個人年當作年度自我回顧題目：今年的重要選擇是什麼，哪項習慣想保留，哪項想調整？對照個人月與長期巔峰數時，優先記錄實際事件和主觀感受，避免事後只挑符合敘述的證據。",evidence:[]}
 });
}
function vedic(r:any):FortuneChapter[]{
 const md=r.currentMahadasha||{},ad=r.currentAntardasha||{};
 const hs=arr(r.houses),getHouse=(i:number)=>hs.find((x:any)=>Number(x.house)===i)||{};
 const p=arr(r.planets),getPlanet=(name:string)=>p.find((x:any)=>x.name===name)||{};
 const mdFuture=arr(r.mahadashaTimeline).filter((x:any)=>str(x.endDate)>=new Date().toISOString().slice(0,10)).slice(0,4);
 const transit=arr(r.majorTransitTimeline).slice(0,6);
 const profile=(key:string)=>evidence(r[key]?.evidence,r[key]?.natalEvidence);
 return chapters({
  overview:{text:"出生上升為 "+str(r.lagnaSign||"—")+"（"+str(r.lagnaNakshatra||"—")+"），月亮位於 "+str(r.moonSign||"—")+"（"+str(r.moonNakshatra||"—")+"），太陽位於 "+str(r.sunSign||"—")+"。這份星盤使用 Lahiri 恆星黃道與 Whole Sign 宮位系統；不同派別可能得出不同詮釋。",evidence:evidence(r.lagnaSign,r.moonSign,r.sunSign,r.lagnaNakshatra)},
  personality:{text:"個性相關的傳統觀察點是上升與其宮主、月亮、太陽。目前上升星宿為 "+str(r.lagnaNakshatra||"—")+"，月亮星宿為 "+str(r.moonNakshatra||"—")+"。依盤面能查看的具體位置："+[getPlanet("Sun"),getPlanet("Moon")].map(x=>str(x.name)+" "+str(x.sign)+"／第 "+str(x.house)+" 宮").join("；")+"。這是象徵語言，不是心理學診斷。",evidence:profile("personalityProfile")},
  career:{text:"事業主題依第 10 宮、其宮主、土星及木星位置整理。第 10 宮為 "+str(getHouse(10).sign||"—")+"，宮主 "+str(getHouse(10).lord||"—")+"；目前主週期 "+str(md.lord||"—")+" 亦提供時間背景。可依這些已計算的位置檢視工作與責任的主題，不預測升遷。",evidence:profile("careerProfile")},
  wealth:{text:"資源主題以第 2 宮與第 11 宮、木星／金星及 Dasha 為傳統依據。第 2 宮 "+str(getHouse(2).sign||"—")+"（宮主 "+str(getHouse(2).lord||"—")+"），第 11 宮 "+str(getHouse(11).sign||"—")+"（宮主 "+str(getHouse(11).lord||"—")+"）。這些配置不代表收入數字或投資勝率。",evidence:profile("wealthProfile")},
  relationships:{text:"關係主題主要觀察第 7 宮、其宮主與金星。第 7 宮為 "+str(getHouse(7).sign||"—")+"，宮主 "+str(getHouse(7).lord||"—")+"。可用盤面資料反思合作、情感表達與關係中的角色，但不應據此斷言婚姻或伴侶事件。",evidence:profile("relationshipProfile")},
  family:{text:"家庭與子女主題參考第 4 宮、第 5 宮、各宮宮主及月亮／木星。第 4 宮："+str(getHouse(4).sign||"—")+"（"+str(getHouse(4).lord||"—")+"）；第 5 宮："+str(getHouse(5).sign||"—")+"（"+str(getHouse(5).lord||"—")+"）。這只反映星盤分類，不推測懷孕、生育或家人健康。",evidence:profile("familyChildrenProfile")},
  currentCycle:{text:"目前 Vimshottari 主週期是 "+str(md.lord||"—")+"（"+str(md.startDate||"—")+" 至 "+str(md.endDate||"—")+"），次週期是 "+str(ad.lord||"—")+"（"+str(ad.startDate||"—")+" 至 "+str(ad.endDate||"—")+"）。目前 Gochar 計算日期為 "+str(r.currentTransitDate||"未提供")+"。週期與行運需要分開閱讀，無法由此推定具體事件。",evidence:evidence(md,ad,r.currentTransitDate)},
  longTerm:{text:"已計算的主週期時間軸："+(mdFuture.map((x:any)=>x.lord+"（"+x.startDate+"–"+x.endDate+"）").join("；")||"尚無長期時段")+"。接下來三年的主要行運只涵蓋木星、土星與交點的換座事件，不包含未計算的完整未來行星每日運行。",evidence:evidence(mdFuture)},
  keyYears:{text:"可優先閱讀的時期："+(futureHighlights("vedic",r).join("；")||"尚無資料")+"。已列出的換座事件："+(transit.map((x:any)=>x.date+" "+x.planet+" "+x.fromSign+"→"+x.toSign).join("；")||"無")+"。這些是天體與週期資料的日期，不是生活事件預言。",evidence:evidence(transit)},
  advice:{text:"挑選一個你在意的宮位或目前 Dasha，展開「詳細資料」核對實際行星、宮主與起訖時間。每次解讀應引用已存在的盤面依據；對沒有算出的 D9、Yogas 等進階分類不自行補完。",evidence:[]}
 });
}
export function buildLocalReport(mode:FortuneMode,result:any):FortuneChapter[]{
 if(!result||typeof result!=="object")return [];
 return mode==="bazi"?bazi(result):mode==="tarot"?tarot(result):vedic(result);
}
export function buildReportPrompt(mode:FortuneMode,result:any,style:string):string{
 const fields:Record<FortuneMode,string[]>={
  bazi:["fourPillars","dayMaster","dayMasterElement","weightedFiveElements","tenGods","dayMasterStrength","natalInteractions","luckPillars","currentLuckPillar","annualTimeline","wealthProfile","careerProfile","relationshipProfile"],
  tarot:["birthCardDisplay","birthCards","lifePathDisplay","birthdayNumber","attitudeNumber","personalityCardName","soulCardName","pinnacles","pinnacleTiming","challenges","periodCycles","personalYear","personalMonth","personalYearTimeline","personalMonthTimeline","identityProfile","careerProfile","wealthProfile","relationshipProfile"],
  vedic:["lagnaSign","lagnaNakshatra","moonSign","moonNakshatra","sunSign","planets","houses","houseLords","currentMahadasha","currentAntardasha","mahadashaTimeline","currentTransits","currentTransitDate","majorTransitTimeline","personalityProfile","careerProfile","wealthProfile","relationshipProfile","familyChildrenProfile"]
 };
 const source:Record<string,unknown>={};
 for(const key of fields[mode])if(result?.[key]!==undefined)source[key]=result[key];
 const headings=["命盤總覽","性格與天賦","事業與職涯","財富與資源","感情與人際",...(mode==="vedic"?["家庭與子女"]:[]),"目前人生階段","未來十年與長期節奏","重要年份與轉折","可以如何運用這份解讀"];
 return "你是 Crew Fortune 的命理解讀者，使用繁體中文。"+style+
 "你只能依據提供的固定命理計算資料寫作，不得重新計算、補造不存在的十神、宮位、牌、日期，也不能保證任何未來事件。"+
 "請以以下 Markdown 二級標題依序逐章輸出，每章應有白話結論、2–4 個具體計算依據、該資料可如何理解與限制，不要反覆寫空泛人格描述。"+
 "每章盡量 150–300 個中文字。可針對缺少足夠依據的主題直接說明不足。"+
 "逐年必須引用所給的年度資料，不要只說流年好壞；財富不是投資建議，不預測死亡、疾病、懷孕或重大災難。"+
 "只輸出以下標題與正文，不要額外開場或分享文案：\n"+headings.map(x=>"## "+x).join("\n")+
 "\n\n固定計算資料：\n"+JSON.stringify(source);
}