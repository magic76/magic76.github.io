// Free preview of the website edition. All chart facts come from the existing calculator.
type Pair = [string,string];
type Section = {title:Pair; body:Pair};
type Topic = {id:string; title:Pair; sections:Section[]};
const pair=(zh:string,en:string):Pair=>[zh,en];
const section=(zt:string,et:string,zb:string,eb:string):Section=>({title:pair(zt,et),body:pair(zb,eb)});
const topic=(id:string,zt:string,et:string,sections:Section[]):Topic=>({id,title:pair(zt,et),sections});
const str=(v:unknown)=>typeof v==="string"&&v.trim()?v:"—";
const count=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;
const show=(v:number|null)=>v===null?"—":String(v);
const list=(v:unknown)=>Array.isArray(v)?v.filter(x=>typeof x==="string"&&x.trim()).join("、"):"";
const elements:Record<string,Pair>={木:pair("循序成長、建立方向","gradual growth and direction"),火:pair("表達、連結與推動","expression and momentum"),土:pair("穩定、整合與承接","stability and integration"),金:pair("判斷、原則與取捨","judgment and structure"),水:pair("觀察、理解與調整","observation and flexibility")};
const gods:Record<string,Pair>={正印:pair("累積知識與支援","learning and support"),偏印:pair("獨立研究與新方法","independent research"),食神:pair("創作與穩定輸出","steady creative output"),傷官:pair("表達與改善流程","expression and improvement"),正官:pair("責任與制度","responsibility and structure"),七殺:pair("挑戰與決策","challenge and decisions"),正財:pair("穩定資源與規劃","steady resource planning"),偏財:pair("機會與彈性資源","opportunities and flexibility"),比肩:pair("自主與同儕合作","autonomy and peer collaboration"),劫財:pair("競爭與資源界線","competition and resource boundaries")};
const god=(v:unknown)=>gods[String(v)]||pair("生活重心的調整","adjusting priorities");
const arr=(v:unknown):any[]=>Array.isArray(v)?v:[];
export function buildBaziWebsiteReading(r:any,year:number){
 const dm=str(r?.dayMaster), strength=str(r?.dayMasterStrength), element=str(r?.dayMasterElement);
 const nature=elements[element]||pair("自身的行動方式","personal ways of acting");
 const career=r?.careerProfile||{},wealth=r?.wealthProfile||{},rel=r?.relationshipProfile||{};
 const resource=count(career.resourceCount),output=count(career.outputCount),officer=count(career.officerCount);
 const ranked=[{n:resource,z:"學習與方法",e:"learning and methods"},{n:output,z:"表達與成果",e:"expression and delivery"},{n:officer,z:"責任與管理",e:"responsibility and management"}].filter(x=>x.n!==null).sort((a,b)=>b.n!-a.n!);
 const lead=ranked.length&&ranked[0].n!>0?ranked.filter(x=>x.n===ranked[0].n).map(x=>x.z).join("、"):"尚無突出線索";
 const leadEn=ranked.length&&ranked[0].n!>0?ranked.filter(x=>x.n===ranked[0].n).map(x=>x.e).join(" / "):"no clear leading signal";
 const direct=count(wealth.directWealthCount),indirect=count(wealth.indirectWealthCount);
 const money=direct===null||indirect===null||direct+indirect===0?pair("沒有足夠的財星數量可區分兩種取向","insufficient wealth signals to distinguish approaches"):direct>indirect?pair("穩定規劃的線索較多","steady planning is more prominent"):indirect>direct?pair("彈性尋找機會的線索較多","flexible opportunities are more prominent"):pair("穩定規劃與彈性機會的線索相近","both approaches are similarly represented");
 const spouse=str(rel.spousePalace),partner=count(rel.partnerGodCount);
 const spouseThemes=arr(rel.spousePalaceTenGods).map(god);
 const relZ=spouseThemes.map(x=>x[0]).join("、")||"資料不足";
 const relE=spouseThemes.map(x=>x[1]).join(", ")||"not available";
 const cycles=arr(r?.luckPillars).filter(x=>x&&Number.isInteger(x.startYear)&&Number.isInteger(x.endYear)&&x.endYear>=x.startYear&&typeof x.ganZhi==="string").sort((a,b)=>a.startYear-b.startYear);
 const current=cycles.find(x=>x.startYear<=year&&x.endYear>=year);
 const next=cycles.find(x=>x.startYear>year);
 const cycleLabel=(x:any)=>x?x.ganZhi+" · "+x.startYear+"–"+x.endYear:"—";
 const interactions=list(r?.natalInteractions);
 const balance=list(r?.balancingElements);
 const weighted=Object.keys(elements).map(k=>({k,n:count(r?.weightedFiveElements?.[k])})).filter(x=>x.n!==null).sort((a,b)=>b.n!-a.n!);
 const high=weighted.length&&weighted[0].n!>0?weighted.filter(x=>x.n===weighted[0].n).map(x=>x.k).join("、"):"—";
 const years=Array.from({length:5},(_,i)=>year+i+1).map(y=>{
  const a=arr(r?.annualTimeline).find(x=>x?.year===y);
  const g=god(a?.stemTenGod), branches=arr(a?.branchTenGods).map(god), bz=branches.map(x=>x[0]).join("、"),be=branches.map(x=>x[1]).join(", ");
  const work=arr(career.annualSignalYears).includes(y),money=arr(wealth.annualSignalYears).includes(y),relationship=arr(rel.annualSignalYears).some(x=>x?.year===y);
  return {year:y,ganZhi:str(a?.ganZhi),cycle:str(a?.luckPillar),available:Boolean(a),theme:g,
   body:a?pair("這一年的主要象徵為"+g[0]+"。"+(bz?"地支另帶有"+bz+"的線索。":"")+(work?"工作方面可留意技能與責任的變化；":"")+(money?"資源方面適合盤點收支與承諾；":"")+(relationship?"關係方面可多留意溝通與彼此安排；":"")+"把重點放在可掌握的選擇，而不是等待特定事件發生。","The main theme is "+g[1]+". "+(be?"Branch themes: "+be+". ":"")+(work?"Review skills and responsibilities. ":"")+(money?"Review budgets and commitments. ":"")+(relationship?"Make room for communication. ":"")+"Focus on choices you can control, not predicted events."):pair("這份歷史命盤未包含該年的計算資料；可重新排盤取得較新的流年資料。","This saved chart lacks data for this year. Recalculate for updated annual information.")};
 });
 const topics=[
 topic("personality","核心性格","Core personality",[
 section("你的性格底色","Your baseline","你的日主是「"+dm+"」，五行屬"+element+"，在傳統八字裡代表"+nature[0]+"的處事象徵。這不表示你在每個情境都會有相同反應，而是提供一個理解自己決策習慣的角度。當外部要求與個人節奏不一致時，先分清楚是目標本身不認同，還是執行方式不適合；兩者需要的調整完全不同。","Your day master is "+dm+" ("+element+"), traditionally associated with "+nature[1]+". Distinguish disagreement with a goal from discomfort with the way it is pursued; each calls for a different adjustment."),
 section("天賦如何發揮","Putting strengths to work","加權五行較突出的是"+high+"，而日主本身的力量描述為"+strength+"。前者反映命盤中不同元素的相對配置，後者是對日主所受支持與消耗的估計，不是能力高低的評分。適合把優勢放進有明確成果的情境，例如把熟悉的知識整理成流程、把經驗轉成作品，再用別人的真實回饋校正判斷。","Weighted elements most prominent: "+high+"; day-master strength: "+strength+". Neither measures talent. Put strengths into concrete outputs and use real feedback to refine your judgment."),
 section("性格盲點與壓力反應","Blind spots and pressure","命盤提供的調和元素線索為"+(balance||"—")+"。這類符號可用來提醒自己不要長期只使用同一種處事方式，而不是要求改變本性。例如遇到壓力時，把事情拆成需要立即處理、可以延後、應該交給他人的三類；在做重大選擇之前，先確認自己有足夠的資訊和休息，不用把疲憊誤認成能力不足。","Balancing elements: "+(balance||"not available")+". Treat this as a reminder to diversify responses, not a demand to change your nature. Separate urgent, deferrable and delegable tasks before making major choices.")
 ]),
 topic("career","事業發展","Career development",[
 section("適合的工作模式","Work style","命盤中的學習、成果與責任線索分別為"+show(resource)+"、"+show(output)+"、"+show(officer)+"，較突出的是"+lead+"。這三個方向可用來比較不同工作環境，而不是直接指定職業。選擇工作時，可以比較是否能持續累積能力、是否有自主安排方法的空間、成果是否容易被看見，以及責任和權限是否一致。","Learning, output and authority signals: "+show(resource)+", "+show(output)+", "+show(officer)+". Leading themes: "+leadEn+". Compare learning opportunities, autonomy, feedback and alignment of responsibility with authority."),
 section("能力變成職涯資產","Building career capital","以"+lead+"為觀察起點，建立能夠帶到下一份工作的能力，而非只累積目前公司的流程經驗。偏向學習時，將研究結果整理成可重用的方法；偏向成果時，保留能展示品質的作品；偏向責任時，記錄如何協調資源與解決問題。每隔一段時間整理成果與回饋，比依靠職稱判斷自己的成長更具體。","Use "+leadEn+" as a starting point. Make research reusable, keep evidence of delivered work, and document resource coordination. Review outcomes rather than relying solely on job titles."),
 section("合作與轉換跑道","Collaboration and transitions","目前的大運線索是"+cycleLabel(current)+"。職涯轉換可從這個階段的現實條件出發：現有收入、可投入時間、已建立的人脈，以及尚未驗證的技能。想換方向時，先用小型專案驗證需求和自己的投入程度，再比較留下與轉換的成本。合作時把交付範圍、決策權與成功條件講清楚，避免彼此對責任的理解不同。","Current cycle: "+cycleLabel(current)+". Before changing direction, test demand and your interest with small projects; compare actual costs, skills, time and relationships. Clarify responsibilities and success criteria.")
 ]),
 topic("wealth","財富格局","Wealth and resources",[
 section("資源累積的取向","Resource orientation","正財線索為"+show(direct)+"，偏財線索為"+show(indirect)+"，目前"+money[0]+"。在八字的傳統語境裡，正財偏向持續累積，偏財偏向機會與彈性；數量不等於收入大小。可先建立固定支出、預備資源和可自由運用的預算三個層次，讓穩定累積與嘗試新機會不必彼此衝突。","Direct and indirect wealth signals: "+show(direct)+", "+show(indirect)+". "+money[1]+". Counts do not measure income. Separate fixed expenses, reserves and discretionary resources."),
 section("機會與風險的界線","Opportunity and limits","財星對應的五行是"+str(wealth.wealthElement)+"。這是傳統的元素關係，不是投資標的提示。當出現新的工作、合作或副業機會時，除了可能收益，也應看清楚時間成本、退出條件及最壞情況是否能承受。把每一次嘗試視為可檢驗的選擇，不因短期結果好壞就判斷自己是否具有財運。","The wealth element is "+str(wealth.wealthElement)+", not an investment signal. Consider time, exit conditions and downside when evaluating work or side projects; short-term results do not prove fortune."),
 section("資源與人生目標","Resources and life goals","依照"+money[0]+"的象徵方向，可以檢視自己的資源是花在維持生活、取得自由，還是擴大選擇。若同時追求多個目標，先區分必要需求與可延後項目，再設定可接受的投入上限；涉及投資、借貸或重大財務承諾時，以實際資料及專業意見為準，不以命盤取代財務決策。","Given "+money[1]+", review whether resources support daily life, independence or options. Set limits when pursuing multiple goals and rely on real information and professional advice for major financial decisions.")
 ]),
 topic("love","愛情與伴侶","Love and partnership",[
 section("親密關係中的需求","Relationship needs","你的日支為"+spouse+"，配偶宮相關的十神象徵包括"+relZ+"。這些符號可作為觀察自己親密關係需求的起點，例如你更在意共同目標、穩定陪伴、彼此理解或保留個人空間。真正的相處方式仍要從雙方的生活習慣與價值觀確認，不能單憑命盤認定誰是理想伴侶。","Day branch: "+spouse+". Related symbols: "+relE+". Use these themes to explore needs for shared goals, reliability, understanding or independence; actual compatibility depends on both people."),
 section("關係如何長期經營","Sustaining a relationship","傳統伴侶星線索數量是"+show(partner)+"，它描述命盤中的象徵配置，並不代表桃花多寡、婚姻次數或是否能遇到對的人。長期關係通常需要可預期的承諾與能夠討論的分歧：例如家庭分工、金錢安排、彼此的社交空間與未來規劃。把期待說清楚，比期待對方自動理解更有助於建立信任。","Traditional partner-symbol count: "+show(partner)+". It does not predict marriage or romance. Discuss household roles, money, social space and plans rather than expecting unspoken needs to be understood."),
 section("面對差異與衝突","Navigating differences","原局互動線索為"+(interactions||"—")+"。這是干支間的傳統關係，不是現實衝突清單。當兩人的節奏不同時，可以先區分情緒上的需要與實際要解決的問題；先聽完對方想表達的內容，再討論可行的改變。若出現反覆的傷害或不安全情況，應以現實處境和安全為優先，不必用命理合理化。","Natal interactions: "+(interactions||"not available")+". These are symbolic, not actual conflicts. Separate emotional needs from practical problems, listen first and prioritize safety in harmful situations.")
 ]),
 topic("people","人際與家庭","People and family",[
 section("與不同個性的人合作","Working with different people","由日主"+dm+"的"+nature[0]+"象徵出發，可觀察自己如何在群體中提出想法與接收意見。和做事節奏不同的人合作時，先約定哪些事情需要共同決定，哪些可以獨立執行。把對方的不同做法視為補充資訊，而不是對自身能力的否定，有助於減少不必要的摩擦。","Starting from "+dm+" and "+nature[1]+", observe how you share ideas and receive feedback. Clarify joint versus independent decisions and treat different approaches as additional information."),
 section("支持與界線","Support and boundaries","命盤學習與支援的線索是"+show(resource)+"，責任的線索是"+show(officer)+"。可以對照自己習慣接受協助或提供協助的方式，尤其是家庭和長期合作關係。願意承擔不等於所有責任都應該自己處理；清楚說明可提供的時間、能力與範圍，讓彼此能建立穩定而不失衡的期待。","Support and responsibility signals: "+show(resource)+" and "+show(officer)+". Reflect on giving and receiving help. Clearly state the time, capacity and scope you can offer."),
 section("家庭中的角色變化","Changing family roles","以原局互動"+(interactions||"資料未列出")+"為觀察背景，家庭關係仍需看實際的照顧責任和人生階段。隨著工作、居住或家庭成員的需求改變，原本自然形成的分工可能需要重新協調。可以定期討論共同開銷、照顧時間與個人休息，避免長期依賴某一個人默默承擔所有變化。","Natal interaction context: "+(interactions||"unavailable")+". Family roles depend on actual circumstances. Revisit shared costs, care time and rest as needs change.")
 ]),
 topic("life","人生階段","Life stages",[
 section("早期的人生累積","Early development","這份命盤的第一段已計算大運為"+cycleLabel(cycles[0])+"。早期階段適合用來回顧形成的生活習慣、學習方式與環境影響，而不是替童年指定好壞事件。把過去的經驗分成至今仍有幫助的能力，以及已不再適合現況的應對方式，可讓成年後的選擇更有彈性。","First calculated cycle: "+cycleLabel(cycles[0])+". Review habits, learning and environmental influences without assuming specific childhood events. Distinguish useful skills from outdated responses."),
 section("現在的人生重心","Your current phase","目前所處的計算階段是"+cycleLabel(current)+"。大運是以約十年為單位的傳統時間架構，並非十年內每一天都會出現同樣的狀況。可用這個階段作為長期盤點的起點，將工作、家庭、財務與生活品質分別檢視，找出最需要持續投入的方向，而非急著在每個面向同時追求突破。","Current calculated phase: "+cycleLabel(current)+". A traditional decade cycle is not a daily prediction. Review work, family, resources and quality of life separately and identify sustained priorities."),
 section("下一階段的準備","Preparing for the next phase","下一段已計算大運為"+cycleLabel(next)+"。如果資料有下一段，可以把交界年份當作回顧長期目標的提醒；若沒有資料，也不代表人生走到終點。比起預測特定事件，更適合提早累積可轉移的能力、維持重要關係、整理資源，讓未來在環境改變時仍有足夠選擇。","Next calculated cycle: "+cycleLabel(next)+". Use a recorded boundary as a reminder to review long-term goals, not an event prediction. Missing data does not imply an end to life.")
 ]),
 topic("years","未來五年","Next five years",[
 section("逐年閱讀方式","How to read annual themes","未來五個曆年為"+(year+1)+"至"+(year+5)+"年，下方逐年使用計算出的干支、十神與工作、資源、關係線索。流年實際交界依立春，畫面以曆年標記方便閱讀。某個主題出現不表示一定發生事件，而是提供一年一個可觀察的方向。缺少的年份會直接標明，不補造結果。","The next five calendar years are "+(year+1)+"–"+(year+5)+". Each uses calculated stem-branch and theme data; traditional boundaries follow the start of spring. Missing years are marked, not invented."),
 section("工作與資源節奏","Work and resources across years","逐年資料中，工作線索出現在"+(years.filter(x=>x.available&&arr(career.annualSignalYears).includes(x.year)).map(x=>x.year).join("、")||"未列出")+"；資源線索出現在"+(years.filter(x=>x.available&&arr(wealth.annualSignalYears).includes(x.year)).map(x=>x.year).join("、")||"未列出")+"。這些年份不等於升職或獲利時點，可以用來安排年度回顧，確認技能與預算是否支持自己的目標。","Work themes: "+(years.filter(x=>x.available&&arr(career.annualSignalYears).includes(x.year)).map(x=>x.year).join(", ")||"not listed")+". Resource themes: "+(years.filter(x=>x.available&&arr(wealth.annualSignalYears).includes(x.year)).map(x=>x.year).join(", ")||"not listed")+". Use them for reviews, not predictions of promotion or profit."),
 section("關係與生活安排","Relationships across years","關係線索較值得觀察的已計算年份為"+(years.filter(x=>x.available&&arr(rel.annualSignalYears).some(v=>v?.year===x.year)).map(x=>x.year).join("、")||"未列出")+"。適合將關係中的共同計畫、家庭安排與個人時間放在一起檢視。不必因某一年沒有線索就忽略親友，也不應因出現線索便預設感情會發生重大變化。","Calculated relationship-theme years: "+(years.filter(x=>x.available&&arr(rel.annualSignalYears).some(v=>v?.year===x.year)).map(x=>x.year).join(", ")||"not listed")+". Review shared plans and personal time without assuming major relationship changes.")
 ]),
 topic("advice","個人行動建議","Personal action guide",[
 section("建立適合你的節奏","Build a sustainable rhythm","以日主的"+nature[0]+"象徵，以及"+lead+"的工作線索為參考，安排一個能持續執行的小目標：將重要的事情拆成有明確成果的步驟，每次完成後保留簡短紀錄。比起一次改變所有生活習慣，更適合先找到一種自己願意長期維持的方法，再依實際成果調整。","Use "+nature[1]+" and "+leadEn+" as prompts to set one sustainable goal. Divide it into concrete steps and record outcomes before expanding the habit."),
 section("把命盤轉成生活工具","Turn insights into practical tools","財星呈現"+money[0]+"，關係方面則帶有"+relZ+"的象徵。兩者可以一起提醒自己：資源安排與重要關係都需要清楚的期待。把共同生活的承諾和個人目標列在同一份計畫中，確認它們是否互相支持；遇到不同意見時，先調整可協商的安排，而不是把差異歸因於命格。","Resource theme: "+money[1]+". Relationship themes: "+relE+". Check whether commitments and personal goals support each other, and negotiate practical arrangements rather than attributing differences to destiny."),
 section("定期回顧與修正","Review and revise","把"+cycleLabel(current)+"視為長期背景，未來五年則作為分段檢視的時間刻度。每年記下哪些選擇讓生活更穩定、哪些經驗值得延續，以及哪些目標需要重新安排。命理提供的是傳統象徵的閱讀角度，真正的方向仍由你的經驗、現實條件、價值與選擇共同決定；不必因解讀與自身經驗不一致而否定自己。","Use "+cycleLabel(current)+" as background and the next five years as review intervals. Record what worked, what to continue and what to change. Your experience, circumstances and choices—not symbolic readings—determine your direction.")
 ])
 ];
 return {topics,cycles,years,current};
}
