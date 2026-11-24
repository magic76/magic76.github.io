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
 assert.match(component,/完整命盤解鎖/);assert.match(component,/專屬一生命書/);assert.match(component,/NT\$99/);assert.match(component,/NT\$30/);assert.match(component,/預定原價 NT\$69/);assert.match(component,/限時免費/);assert.match(component,/尚未開放領取/);
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

test("69 website sample is explicitly fictional and never grants paid access",()=>{
 const component=read("web-spa/src/fortune/FortunePriceInterest.tsx");
 assert.match(component,/UNLOCK_SAMPLE\.map/);
 assert.match(component,/免費試閱網站深度解析/);
 assert.match(component,/虛構命盤展示內容深度/);
 for(const topic of ["命格總覽","天賦與盲點","事業與職涯","財富與資源","愛情與人際","大運與流年"])assert.ok(component.includes(topic));
 assert.match(component,/尚未開放購買/);
});
