const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const read=p=>fs.readFileSync(p,"utf8");
test("bazi-only non-transactional price experiment",()=>{
 const page=read("web-spa/src/fortune/ReadingPage.tsx"),component=read("web-spa/src/fortune/FortunePriceInterest.tsx");
 assert.match(page,/reading!\.mode==="bazi"&&<FortunePriceInterest/);
 assert.match(component,/fortune_price_view/);
 assert.match(component,/fortune_price_interest/);
 assert.match(component,/尚未開放購買/);
 assert.doesNotMatch(component,/fetch\(|checkout|paymentIntent/);
 for(const path of ["web-spa/src/analytics/usage.ts","functions/api/usage/event.ts","web-spa/src/analytics/usageDashboardDefinitions.ts","web-spa/src/analytics/usageExport.ts"]){
  assert.match(read(path),/fortune_price_view/);assert.match(read(path),/fortune_price_interest/);
 }
});
