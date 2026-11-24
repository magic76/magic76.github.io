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

test("member purchase cards preserve icon, copy and arrow tracks",()=>{
 const page=read("web-spa/src/pages/CrewSectionPage.tsx"),css=read("web-spa/src/pages/crewSections.css");
 for(const route of ["/me/orders","/purchase-info"]){const start=page.indexOf('to="'+route+'"');assert.ok(start>=0);const card=page.slice(start,page.indexOf("</Link>",start));assert.match(card,/crew-section-card-icon[\s\S]*crew-section-card-copy[\s\S]*crew-section-arrow/);}
 assert.match(css,/crew-section-card>\.crew-section-card-copy\{grid-column:2;grid-row:1\}/);
 assert.match(css,/crew-section-card>\.crew-section-arrow\{grid-column:3;grid-row:1/);
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
 assert.match(page,/FortunePriceInterest readingId=\{reading!\.id\} result=\{reading!\.result\}/);
 assert.match(component,/FortuneBaziWebsiteReading result=\{result\}/);
 assert.match(component,/免費閱讀我的完整解析/);
 assert.equal((model.match(/\btopic\("/g)||[]).length,8);
 assert.equal((model.match(/\bsection\("/g)||[]).length,24);
 for(const field of ["dayMaster","weightedFiveElements","careerProfile","wealthProfile","relationshipProfile","luckPillars","annualTimeline"])assert.ok(model.includes(field));
 assert.match(model,/length:5/);assert.match(model,/未包含該年的計算資料/);
 assert.match(view,/aria-pressed/);assert.match(view,/fortune-website-timeline/);
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
