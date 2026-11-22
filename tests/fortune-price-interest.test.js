const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");

test("BaZi offers both planned prices without activating public checkout",()=>{
 const page=read("web-spa/src/fortune/ReadingPage.tsx");
 const component=read("web-spa/src/fortune/FortunePriceInterest.tsx");
 const app=read("web-spa/src/App.tsx");
 assert.match(page,/reading!\.mode==="bazi"&&<FortunePriceInterest/);
 assert.match(component,/NT\$79/);
 assert.match(component,/NT\$379/);
 assert.match(component,/尚未開放購買/);
 assert.match(component,/koolo_fortune_bazi_interest_v1/);
 assert.match(component,/koolo_fortune_bazi_premium_interest_v1/);
 assert.match(component,/fortune_price_view/);
 assert.match(component,/fortune_price_interest/);
 assert.match(component,/\/fortune\/report-sample/);
 assert.match(app,/path="report-sample" element=\{<FortuneReportSamplePage\/>\}/);
 // The owner-only sandbox remains accessible, but the plan cards must not create paid orders.
 assert.match(component,/\/fortune\/ecpay\/test\?history=/);
 assert.doesNotMatch(component,/paymentIntent|\/api\/fortune\/checkout|\/api\/fortune\/ecpay\/test-order|window\.location/);
 for(const path of ["web-spa/src/analytics/usage.ts","functions/api/usage/event.ts","web-spa/src/analytics/usageDashboardDefinitions.ts","web-spa/src/analytics/usageExport.ts"]){
  assert.match(read(path),/fortune_price_view/);
  assert.match(read(path),/fortune_price_interest/);
 }
});

test("premium sample contains a clearly fictional editorial preview and no paid-data access",()=>{
 const sample=read("web-spa/src/fortune/FortuneReportSamplePage.tsx");
 const css=read("web-spa/src/fortune/fortuneReportSample.css");
 assert.match(sample,/虛構示範/);
 assert.match(sample,/NT\$379/);
 assert.match(sample,/五行/);
 assert.match(sample,/老師給你的話/);
 assert.match(sample,/未開放購買/);
 assert.match(sample,/AI 生成/);
 assert.doesNotMatch(sample,/fetch\(|paymentIntent|\/api\/fortune\/reports|localStorage|sessionStorage/);
 assert.match(css,/max-width:650px/);
 assert.match(css,/max-width:390px/);
});
