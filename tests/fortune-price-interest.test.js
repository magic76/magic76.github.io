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
 assert.match(component,/預定原價 NT\$79/);assert.match(component,/限時免費/);assert.match(component,/尚未開放領取/);
 for(const path of ["web-spa/src/analytics/usage.ts","functions/api/usage/event.ts","web-spa/src/analytics/usageDashboardDefinitions.ts","web-spa/src/analytics/usageExport.ts"]){
  assert.match(read(path),/fortune_price_view/);assert.match(read(path),/fortune_price_interest/);
 }
});

test("member purchase cards preserve icon, copy and arrow tracks",()=>{
 const page=read("web-spa/src/pages/CrewSectionPage.tsx"),css=read("web-spa/src/pages/crewSections.css");
 for(const route of ["/me/orders","/purchase-info"]){const start=page.indexOf('to="'+route+'"');assert.ok(start>=0);const card=page.slice(start,page.indexOf("</Link>",start));assert.match(card,/crew-section-card-icon[\s\S]*crew-section-card-copy[\s\S]*crew-section-arrow/);}
 assert.match(css,/crew-section-card>\.crew-section-card-copy\{grid-column:2;grid-row:1\}/);
 assert.match(css,/crew-section-card>\.crew-section-arrow\{grid-column:3;grid-row:1/);
 assert.match(read("web-spa/src/pages/PurchaseSupportPage.tsx"),/預定原價 NT\$79/);
});
