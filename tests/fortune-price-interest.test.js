const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const read=p=>fs.readFileSync(p,"utf8");
test("bazi-only non-transactional price experiment",()=>{
 const page=read("web-spa/src/fortune/ReadingPage.tsx"),component=read("web-spa/src/fortune/FortunePriceInterest.tsx");
 assert.match(page,/reading!\.mode==="bazi"&&<FortunePriceInterest/);
 assert.match(component,/fortune_price_view/);
 assert.match(component,/fortune_price_interest/);
 assert.match(component,/尚未開放購買|尚未開放/);assert.match(component,/koolo_fortune_bazi_interest_v1/);
 // The existing admin-only sandbox config GET is the sole allowed fetch.
 const calls=[...component.matchAll(/fetch\("([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(calls,["/api/fortune/ecpay/test-config"]);
 assert.doesNotMatch(component,/method:\s*["\x27]POST|checkout|paymentIntent/);
 assert.match(component,/完整命盤解鎖/);assert.match(component,/專屬一生命書/);assert.match(component,/NT\$99/);assert.match(component,/NT\$30/);assert.match(component,/預定原價 NT\$69/);assert.match(component,/限時免費/);assert.match(component,/目前免費閱讀/);
 for(const path of ["web-spa/src/analytics/usage.ts","functions/api/usage/event.ts","web-spa/src/analytics/usageDashboardDefinitions.ts","web-spa/src/analytics/usageExport.ts"]){
  assert.match(read(path),/fortune_price_view/);assert.match(read(path),/fortune_price_interest/);
 }
});

test("member purchase routes use the grouped whole-row link",()=>{
 const page=read("web-spa/src/pages/MyAccountGroups.tsx"),css=read("web-spa/src/pages/myAccountGroups.css");
 for(const route of ["/me/orders","/purchase-info"])assert.ok(page.includes('<AccountRow to="'+route+'"'));
 assert.match(page,/<Link className="koolo-account-row" to=\{to\}>/);
 assert.match(css,/koolo-account-row\{[^}]+min-height:56px/);
 assert.match(read("web-spa/src/pages/PurchaseSupportPage.tsx"),/預定原價 NT\$69/);
});

test("planned 69/99 offers are distinct and no live purchase is enabled",()=>{
 const support=read("web-spa/src/pages/PurchaseSupportPage.tsx"),component=read("web-spa/src/fortune/FortunePriceInterest.tsx");
 assert.match(support,/完整命盤解鎖 · 預定 NT\$69/);assert.match(support,/專屬一生命書 · 預定 NT\$99/);assert.match(support,/免費體驗不等同已支付 NT\$69/);assert.match(support,/目前尚未開放正式購買/);
 assert.doesNotMatch(component,/NT\$(?:79|379)/);assert.match(component,/尚未開放購買/);assert.match(read("web-spa/src/fortune/fortunePriceInterest.css"),/@media\(max-width:560px\)/);
 assert.match(read("migrations/crew-auth/0006_fortune_paid_reports.sql"),/CHECK\(amount_twd=79\)/);
});

test("69 website trial reads the actual chart rather than fictional sample",()=>{
 const component=read("web-spa/src/fortune/FortunePriceInterest.tsx"),page=read("web-spa/src/fortune/ReadingPage.tsx"),model=read("web-spa/src/fortune/baziWebsiteReading.ts"),view=read("web-spa/src/fortune/FortuneBaziWebsiteReading.tsx");
 assert.doesNotMatch(component,/UNLOCK_SAMPLE|虛構命盤/);
 assert.match(page,/FortunePriceInterest readingId=\{reading!\.id\}/);
 assert.doesNotMatch(component,/<FortuneBaziWebsiteReading/);assert.match(component,/navigate\(premiumHref\(readingId\)/);
 assert.match(component,/免費解鎖我的完整解析/);
 assert.equal((model.match(/\btopic\("/g)||[]).length,8);
 assert.equal((model.match(/\bsection\("/g)||[]).length,24);
 for(const field of ["dayMaster","weightedFiveElements","careerProfile","wealthProfile","relationshipProfile","luckPillars","annualTimeline"])assert.ok(model.includes(field));
 assert.match(model,/length:5/);assert.match(model,/未包含該年的計算資料/);
 assert.match(view,/to=\{url\(t\.id\)\}/);assert.match(view,/fortune-website-timeline/);
 assert.doesNotMatch(model+view,/CrewAI\.call|fetch\(|geminiKey\(/);
});

test("website model varies with actual chart and does not invent missing years",async()=>{
 const {buildBaziWebsiteReading}=await import("../web-spa/src/fortune/baziWebsiteReading.ts");
 const a=buildBaziWebsiteReading({dayMaster:"甲",dayMasterElement:"木",careerProfile:{resourceCount:4,outputCount:1,officerCount:2},wealthProfile:{directWealthCount:3,indirectWealthCount:0},relationshipProfile:{spousePalace:"子"},luckPillars:[{ganZhi:"甲子",startYear:2020,endYear:2029}],annualTimeline:[{year:2027,ganZhi:"丁未",stemTenGod:"食神",luckPillar:"甲子"}]},2026);
 const b=buildBaziWebsiteReading({dayMaster:"壬",dayMasterElement:"水",careerProfile:{resourceCount:0,outputCount:4,officerCount:1},wealthProfile:{directWealthCount:0,indirectWealthCount:3}},2026);
 assert.equal(a.topics.length,8);assert.equal(a.topics.flatMap(x=>x.sections).length,24);
 assert.notEqual(a.topics[0].sections[0].body[0],b.topics[0].sections[0].body[0]);
 assert.match(a.topics[0].sections[0].body[0],/樹幹/);assert.match(b.topics[0].sections[0].body[0],/江海/);
 assert.match(a.topics[1].sections[0].body[0],/學習與方法/);assert.match(b.topics[1].sections[0].body[0],/表達與成果/);
 assert.deepEqual(a.years.map(x=>x.year),[2027,2028,2029,2030,2031]);
 assert.equal(a.years[0].ganZhi,"丁未");assert.equal(a.years[1].available,false);assert.equal(a.years[1].ganZhi,"—");
 assert.equal(a.current.ganZhi,"甲子");assert.equal(b.current,undefined);
});

test("premium reading is a separate route with chart-scoped trial history",()=>{
 const app=read("web-spa/src/App.tsx"),page=read("web-spa/src/fortune/FortunePremiumPage.tsx"),store=read("web-spa/src/fortune/premiumStore.ts"),history=read("web-spa/src/fortune/HistoryPage.tsx"),mine=read("web-spa/src/pages/MyAccountGroups.tsx");
 assert.match(app,/<Route path="premium" element=\{<FortunePremiumPage\/>\}/);
 assert.match(page,/hasPremiumTrial\(id\)/);assert.match(page,/readPremiumChart\(id\)/);
 assert.match(page,/reading=\{reading\}/);assert.match(history,/hasPremiumTrial\(x\.id\)/);
 assert.match(history,/clearPremiumTrials\(\)/);assert.match(history,/removePremiumTrial\(x\.id\)/);
 assert.match(mine,/to="\/fortune\/premium"/);
 assert.doesNotMatch(store+page,/fetch\(|CrewAI\.call|paymentIntent|geminiKey\(/);
});
test("local premium free trial does not unlock other charts or resurrect deleted records",async()=>{
 const orig=global.localStorage;const map=new Map();
 global.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
 try{
  const s=await import("../web-spa/src/fortune/premiumStore.ts");
  const a={id:"a",mode:"bazi",result:{dayMaster:"甲"}},b={id:"b",mode:"bazi",result:{dayMaster:"乙"}},other={id:"other",mode:"tarot",result:{dayMaster:"甲"}};
  map.set("crew_fortune_readings_v2",JSON.stringify([a,b,other]));
  assert.equal(s.unlockPremiumTrial("a"),true);assert.equal(s.hasPremiumTrial("b"),false);assert.equal(s.unlockPremiumTrial("other"),false);
  assert.deepEqual(s.readPremiumTrials().map(x=>x.id),["a"]);
  assert.match(s.premiumHref("a","life"),/\/fortune\/premium\?history=a&chapter=life/);
  map.set("crew_fortune_readings_v2",JSON.stringify([b]));
  assert.equal(s.hasPremiumTrial("a"),false);assert.deepEqual(s.readPremiumTrials(),[]);
  assert.equal(s.unlockPremiumTrial("b"),true);s.removePremiumTrial("b");assert.equal(s.hasPremiumTrial("b"),false);
  assert.equal(s.unlockPremiumTrial("b"),true);s.clearPremiumTrials();assert.deepEqual(s.readPremiumTrials(),[]);
  map.set("crew_fortune_readings_v2","invalid");assert.equal(s.unlockPremiumTrial("b"),false);
 }finally{global.localStorage=orig}
});
