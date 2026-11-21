const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
test("account statistics reuse protected usage endpoint and D1 aggregates",()=>{
 const report=fs.readFileSync("functions/api/usage/report.ts","utf8");
 const panel=fs.readFileSync("web-spa/src/analytics/AccountStatsPanel.tsx","utf8");
 assert.match(report,/if\(!await verifyAccess\(request,env\)\)/);
 assert.match(report,/view==="accounts"/);
 assert.match(report,/COUNT\(\*\) AS total/);
 assert.match(report,/COUNT\(DISTINCT user_id\) AS activeSessions/);
 assert.match(report,/expires_at>\?/);
 assert.doesNotMatch(report,/SELECT \* FROM crew_auth_users/);
 assert.match(panel,/view=accounts/);
 assert.match(panel,/有效登入 Session 不等於/);
});
