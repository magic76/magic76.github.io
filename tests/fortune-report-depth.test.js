const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = (mod, file) => {
 const source = fs.readFileSync(file, "utf8");
 const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 mod._compile(code, file);
};

const {buildLocalReport,buildReportPrompt} = require("../web-spa/src/fortune/report.ts");
const get = (chapters,id) => chapters.find(x=>x.id===id)?.text || "";
const all = chapters => chapters.map(x=>x.text).join("\n");

test("八字免費章節使用財官與實際年份，完整、不需 Gemini",()=>{
 const r={
  fourPillars:"甲子 乙丑 丙寅 丁卯",dayMaster:"丙",dayMasterElement:"火",dayMasterStrength:"偏弱",
  weightedFiveElements:{木:3,火:2,土:1,金:0,水:1},
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
 assert.match(get(report,"wealth"),/正財訊號 1/);
 assert.match(get(report,"career"),/官殺 1/);
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

test("AI prompt uses Android-compatible chapter titles and raw grounded fields without 24k string slicing",()=>{
 const prompt=buildReportPrompt("bazi",{fourPillars:"甲子 乙丑 丙寅 丁卯",annualTimeline:[{year:2027,plainSummary:"合沖信號"}]},"白話");
 assert.match(prompt,/## 事業與職涯/);
 assert.match(prompt,/## 未來十年與長期節奏/);
 assert.match(prompt,/2027/);
 assert.match(prompt,/甲子/);
 assert.doesNotMatch(prompt,/slice\(0,24000\)/);
});
