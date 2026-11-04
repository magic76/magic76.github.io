const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");

const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const js=stripTypeScriptTypes(read("web-spa/src/fortune/aiReading.ts"),{mode:"strip"})
 .replace(/^export\s+/gm,"");
const {parseAiReading,auditAiReading}=Function(js+"\nreturn {parseAiReading,auditAiReading};")();

const career="工作方面，官殺代表責任要求，食傷代表表達與成果。把這兩項一起看，比只看職稱更有意義，尤其要留意團隊合作與交付節奏。";
const wealth="財務方面，正財與偏財應分開看，前者偏向日常資源，後者偏向機會與分配。請先盤點現金流與風險習慣，再安排下一個階段的預算。";
const love="感情方面，關係相關的日支資料和互動訊號需要一起觀察，重點不只是適合誰，而是怎麼建立彼此都能接受的界線與溝通方式。";
const self="個人特質方面，日主五行和命局互動可以呈現優勢與盲點的拉扯。當外界有壓力時，先留意自己是更想控制流程還是需要尋求支援。";
const report=(changes={})=>{
 const parts={summary:"這張盤的核心是重視成果與調整步調。",next12:"- 2027 年先整理現有工作\n- 2028 年觀察資源安排\n- 2029 年調整合作策略",
  work:career,wealth,love,self,turning:"目前先依已計算的大運與年度訊號判讀人生階段，下一次切換要以實際命盤資料中的起訖年份為準。",
  ask:"- 哪一年工作主題最強？\n- 如何看我的財務習慣？\n- 關係中的重要課題是什麼？",...changes};
 return Object.entries(parts).map(([key,value])=>"## @"+key+"\n"+value).join("\n\n");
};

test("AI output keeps career and wealth as independent chapters",()=>{
 const p=parseAiReading(report());
 assert.equal(p.work,career);
 assert.equal(p.wealth,wealth);
 assert.notEqual(p.work,p.wealth);
 assert.equal(p.next12.length,3);
 assert.equal(p.ask.length,3);
 assert.equal(auditAiReading(report(),{fourPillars:"甲子"},"bazi").ok,true);
});

test("missing independent wealth chapter cannot silently reuse work",()=>{
 const old=report().replace(/## @wealth\n[\s\S]*?(?=## @love)/,"");
 const p=parseAiReading(old);
 assert.equal(p.wealth,"");
 assert.equal(auditAiReading(old,{fourPillars:"甲子"},"bazi").ok,false);
 assert.ok(auditAiReading(old,{fourPillars:"甲子"},"bazi").issues.some(x=>x.includes("@wealth")));
});

test("quality gate detects identical chapters, missing lines and invented BaZi pillars",()=>{
 assert.ok(auditAiReading(report({wealth:career}),{},"tarot").issues.some(x=>x.includes("重複")));
 assert.ok(auditAiReading(report({ask:"- 一題"}),{},"tarot").issues.some(x=>x.includes("@ask")));
 assert.ok(auditAiReading(report({work:career+" 此外乙亥是我命盤中的重要干支。"}),{fourPillars:"甲子"},"bazi").issues.some(x=>x.includes("乙亥")));
 assert.ok(auditAiReading(report({work:career+" 甲子是我命盤中的重要干支。"}),{fourPillars:"甲子"},"bazi").ok);
});

test("report prompt, UI and generation flow maintain distinct topics and computed evidence",()=>{
 const prompt=read("web-spa/src/fortune/report.ts");
 const overview=read("web-spa/src/fortune/ReadingOverview.tsx");
 const page=read("web-spa/src/fortune/ReadingPage.tsx");
 assert.match(prompt,/## @wealth/);
 assert.match(prompt,/以下 8 個標記段落/);
 assert.match(overview,/career:parsed\.work,wealth:parsed\.wealth/);
 assert.match(overview,/text:aiText\[chapter\.id\]!}:chapter/);
 assert.doesNotMatch(overview,/text:aiText\[chapter\.id\]!,evidence:\[\]/);
 assert.match(page,/auditAiReading\(text,item\.result,item\.mode\)/);
 assert.match(page,/if\(!audit\.ok\)throw new Error/);
});
