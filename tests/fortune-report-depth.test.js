const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {stripTypeScriptTypes} = require("node:module");

require.extensions[".ts"] = (mod, file) => {
 const source = fs.readFileSync(file, "utf8");
 const code = stripTypeScriptTypes(source, {mode:"strip"})
  .replace(/import \{buildTimingHighlights\} from "\.\/yearHighlights";/, 'const {buildTimingHighlights} = require("./yearHighlights");')
  .replace(/import \{formatFortuneValue\} from "\.\/displayNumber";/, 'const {formatFortuneValue} = require("./displayNumber.ts");')
  .replace(/import\{localizedReportFacts\}from"\.\/localReportFacts";/, 'const {localizedReportFacts} = require("./localReportFacts.ts");')
  .replace(/import \{formatFortuneLocalDate\} from "\.\/aiReading";/, 'const {formatFortuneLocalDate} = require("./aiReading.ts");')
  .replace(/export function /g, "function ")
  + "\nmodule.exports = {formatFortuneLocalDate: typeof formatFortuneLocalDate === 'undefined' ? undefined : formatFortuneLocalDate, buildYearHighlights: typeof buildYearHighlights === 'undefined' ? undefined : buildYearHighlights, buildTimingHighlights: typeof buildTimingHighlights === 'undefined' ? undefined : buildTimingHighlights, localizedReportFacts: typeof localizedReportFacts === 'undefined' ? undefined : localizedReportFacts, buildLocalReport: typeof buildLocalReport === 'undefined' ? undefined : buildLocalReport, buildReportPrompt: typeof buildReportPrompt === 'undefined' ? undefined : buildReportPrompt, formatFortuneValue: typeof formatFortuneValue === 'undefined' ? undefined : formatFortuneValue};";
 mod._compile(code, file);
};

const {buildLocalReport,buildReportPrompt} = require("../web-spa/src/fortune/report.ts");
const get = (chapters,id) => chapters.find(x=>x.id===id)?.text || "";
const all = chapters => chapters.map(x=>x.text).join("\n");

test("八字免費章節使用財官與實際年份，完整、不需 Gemini",()=>{
 const r={
  fourPillars:"甲子 乙丑 丙寅 丁卯",dayMaster:"丙",dayMasterElement:"火",dayMasterStrength:"偏弱",
  weightedFiveElements:{木:3.399999999999999,火:0.30000000000000004,土:1,金:0,水:1},
  natalInteractions:["子丑 六合"],
  currentLuckPillar:{ganZhi:"辛未",startYear:2025,endYear:2034},
  luckPillars:[{ganZhi:"辛未",startYear:2025,endYear:2034},{ganZhi:"壬申",startYear:2035,endYear:2044}],
  annualTimeline:[{year:2026,ganZhi:"丙午",stemTenGod:"比肩",themes:["自我／同儕"],plainSummary:"自主主題",luckPillar:"辛未"}],
  careerProfile:{officerCount:1,resourceCount:2,outputCount:3,annualSignalYears:[2028]},
  wealthProfile:{wealthElement:"金",directWealthCount:1,indirectWealthCount:2,annualSignalYears:[2027]},
  relationshipProfile:{spousePalace:"寅",spousePalaceTenGods:["偏印"],annualSignalYears:[{year:2029}]}
 };
 const report=buildLocalReport("bazi",r);
 assert.ok(report.length>=9);
 assert.match(get(report,"overview"),/木 3\.4/);
 assert.doesNotMatch(all(report),/3\.399999999999999|0\.30000000000000004/);
 assert.match(get(report,"wealth"),/正財訊號 1/);
 assert.match(get(report,"career"),/官殺 1/);
 assert.match(get(report,"career"),/食傷（表達與成果）/);
 assert.match(get(report,"wealth"),/偏財記號較多/);
 assert.match(get(report,"relationships"),/2029/);
 assert.match(get(report,"currentCycle"),/辛未/);
 assert.doesNotMatch(all(report),/undefined|\[object Object\]/);
});

test("塔羅免費章節含牌組與年度節奏，且不假裝能預言",()=>{
 const result={
  birthCardDisplay:"19 太陽 × 10 命運之輪 × 1 魔術師",lifePathDisplay:"22/4",
  personalityCardName:"太陽",soulCardName:"魔術師",attitudeNumber:3,birthdayNumber:14,
  birthCards:[{number:19,name:"太陽",keywords:"展現"}],
  pinnacles:[1,2,3,4],pinnacleTiming:["0–30","31–39","40–48","49+"],challenges:[2,1,3,0],
  personalYearCalendarYear:2026,personalYear:5,personalYearCardName:"教皇",personalMonth:8,
  personalYearTimeline:[{year:2026,personalYear:5,cardName:"教皇",plainSummary:"責任主題"},{year:2027,personalYear:6,cardName:"戀人"}]
 };
 const report=buildLocalReport("tarot",result);
 assert.match(get(report,"personality"),/太陽/);
 assert.match(get(report,"longTerm"),/2027/);
 assert.match(get(report,"currentCycle"),/2026/);
 assert.doesNotMatch(all(report),/undefined/);
});

test("印度星盤免費章節包括家庭、週期與明確時間依據",()=>{
 const result={
  lagnaSign:"Virgo",lagnaNakshatra:"Hasta",moonSign:"Libra",moonNakshatra:"Swati",sunSign:"Aries",
  planets:[{name:"Sun",sign:"Aries",house:8},{name:"Moon",sign:"Libra",house:2}],
  houses:[{house:2,sign:"Libra",lord:"Venus"},{house:4,sign:"Sagittarius",lord:"Jupiter"},{house:5,sign:"Capricorn",lord:"Saturn"},{house:7,sign:"Pisces",lord:"Jupiter"},{house:10,sign:"Gemini",lord:"Mercury"},{house:11,sign:"Cancer",lord:"Moon"}],
  currentMahadasha:{lord:"Saturn",startDate:"2020-01-01",endDate:"2039-12-31"},
  currentAntardasha:{lord:"Moon",startDate:"2026-01-01",endDate:"2027-12-31"},
  mahadashaTimeline:[{lord:"Saturn",startDate:"2020-01-01",endDate:"2039-12-31"}],
  currentTransitDate:"2026-10-19",
  majorTransitTimeline:[{date:"2027-03-02",planet:"Jupiter",fromSign:"Aries",toSign:"Taurus"}],
  familyChildrenProfile:{evidence:["4th house Sagittarius"]}
 };
 const report=buildLocalReport("vedic",result);
 assert.match(get(report,"family"),/第 4 宮/);
 assert.match(get(report,"currentCycle"),/Saturn/);
 assert.match(get(report,"keyYears"),/2027/);
 assert.doesNotMatch(all(report),/undefined|\[object Object\]/);
});

test("AI prompt uses machine headers and raw grounded fields without 24k string slicing",()=>{
 const prompt=buildReportPrompt("bazi",{fourPillars:"甲子 乙丑 丙寅 丁卯",annualTimeline:[{year:2027,plainSummary:"合沖信號"}]},"白話");
 assert.match(prompt,/## @work/);
 assert.match(prompt,/## @next12/);
 assert.match(prompt,/2027/);
 assert.match(prompt,/甲子/);
 assert.doesNotMatch(prompt,/slice\(0,24000\)/);
});


test("重點年份的主要主題、摘要與依據應不同，不直接複製固定通用摘要",()=>{
 const {buildYearHighlights}=require("../web-spa/src/fortune/yearHighlights.ts");
 const timeline=[
  {year:2031,ganZhi:"辛亥",stemTenGod:"正財",stemTenGodMeaning:"穩定資源",luckPillar:"戊寅",natalInteractions:["亥巳 六沖"],plainSummary:"相同的通用說明"},
  {year:2033,ganZhi:"癸丑",stemTenGod:"正官",stemTenGodMeaning:"責任與規範",luckPillar:"戊寅",natalInteractions:["丑未 六沖"],plainSummary:"相同的通用說明"},
  {year:2037,ganZhi:"丁巳",stemTenGod:"劫財",stemTenGodMeaning:"資源分配",luckPillar:"丁丑",natalInteractions:["巳亥 六沖"],plainSummary:"相同的通用說明"},
  {year:2039,ganZhi:"己未",stemTenGod:"正財",stemTenGodMeaning:"穩定資源",luckPillar:"丁丑",natalInteractions:[],plainSummary:"相同的通用說明"}
 ];
 const result={annualTimeline:timeline,wealthProfile:{annualSignalYears:[2031,2039]},careerProfile:{annualSignalYears:[2033]},relationshipProfile:{annualSignalYears:[2037]}};
 const picked=buildYearHighlights("bazi",result).slice(0,3);
 assert.equal(picked.length,3);
 assert.equal(new Set(picked.map(x=>x.label.split(" · ")[0])).size,3);
 assert.equal(new Set(picked.map(x=>x.summary)).size,3);
 assert.ok(picked.every(x=>!x.summary.includes("相同的通用說明")));
 assert.ok(picked.every(x=>x.evidence.includes("大運")&&x.evidence.includes("流年十神")));
});
test("閱讀頁在固定命盤完成後立即展示白話報告",()=>{
 const jsx=fs.readFileSync(require.resolve("../web-spa/src/fortune/ReadingPage.tsx"),"utf8");
 const overview=fs.readFileSync(require.resolve("../web-spa/src/fortune/ReadingOverview.tsx"),"utf8");
 assert.ok(jsx.includes("<FortuneReadingOverview mode={reading!.mode}"));
 assert.ok(jsx.indexOf("<FortuneReadingOverview mode={reading!.mode}")<jsx.indexOf("<FortuneYearHighlights mode={reading!.mode}"));
 assert.match(overview,/buildLocalReport/);
 assert.match(overview,/fortune-reading-chapters/);
});


test("AI 詳解主入口緊接摘要，語音與分享改為頁尾次要操作",()=>{
 const reading=fs.readFileSync(require.resolve("../web-spa/src/fortune/ReadingPage.tsx"),"utf8");
 const content=fs.readFileSync(require.resolve("../web-spa/src/fortune/result/depth.css"),"utf8");
 const tw=JSON.parse(fs.readFileSync(require.resolve("../web-spa/src/i18n/locales/zh-TW/fortune.json"),"utf8"));
 const en=JSON.parse(fs.readFileSync(require.resolve("../web-spa/src/i18n/locales/en/fortune.json"),"utf8"));
 assert.ok(reading.indexOf("<FortuneSummaryCard")<reading.indexOf('className="fortune-ai-entry"'));
 assert.ok(reading.indexOf('className="fortune-ai-entry"')<reading.indexOf("<FortuneReadingOverview"));
 assert.equal(reading.split('className="fortune-ai-entry-button"').length-1,1);
 assert.match(reading,/className="fortune-reading-end"/);
 assert.match(reading,/getElementById\("fortune-ai-setup"\)/);
 assert.match(reading,/nav\("\/fortune\/live\?from=reading"\)/);
 assert.match(content,/fortune-ai-entry-button:focus-visible/);
 assert.match(content,/prefers-reduced-motion:reduce/);
 for(const locale of [tw,en]){
  assert.ok(locale.reading.aiCtaGenerate);
  assert.ok(locale.reading.aiCtaRead);
  assert.ok(locale.reading.aiCtaSetup);
  assert.ok(locale.reading.askTeacherAction);
 }
});

test("Fortune display numbers omit binary float tails but keep useful precision",()=>{
 const {formatFortuneValue}=require("../web-spa/src/fortune/displayNumber.ts");
 const cases=[
  [3.399999999999999,"3.4"],
  [0.30000000000000004,"0.3"],
  [2.0000000000000004,"2"],
  [2026,"2026"],
  [12.123456,"12.123456"],
  [-0.0000000000000001,"0"],
  ["3.399999999999999","3.4"],
  ["2026-10-21","2026-10-21"],
  ["00123","00123"]
 ];
 for(const [input,expected] of cases)assert.equal(formatFortuneValue(input),expected,String(input));
 assert.equal(formatFortuneValue(3.399999999999999,true),"3.4");
});
