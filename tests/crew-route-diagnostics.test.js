const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");

test("chat intent cards have home-theme scoped mobile styling and bounded SVG",()=>{
 const css=read("web-spa/src/pages/crewSections.css");
 assert.match(css,/\.crew-section-chat \.crew-intent-grid\{display:grid/);
 assert.match(css,/\.crew-section-chat \.crew-intent-card svg\{[^}]*width:30px;height:30px;[^}]*fill:none;stroke:/);
 assert.match(css,/@media\(max-width:600px\)\{[\s\S]*?\.crew-section-chat \.crew-intent-grid/);
});

test("game route diagnostics observe successful mounts without adding any reload timer",()=>{
 const app=read("web-spa/src/App.tsx");
 const diag=read("web-spa/src/analytics/gameRouteDiagnostics.tsx");
 const boundary=read("web-spa/src/components/RouteErrorBoundary.tsx");
 assert.match(app,/<GameRouteMonitor pathname=\{pathname\}>/);
 for(const name of ["CrewPlayHubPage","FriendGomokuPage","NumberGamePage","TabooGamePage","CrazyCourtPage","WerewolfPage","TruthNewsPage","NonsenseChampionshipPage","CrewPlayGamePage"]){
  assert.ok(app.includes("<GameRouteReady/><"+name+"/>"),name);
 }
 assert.match(diag,/setTimeout\([\s\S]*"stalled"/);
 assert.doesNotMatch(diag,/location\.(?:reload|replace|assign)|window\.location/);
 assert.match(boundary,/recordGameRouteAssetError\(window\.location\.pathname\)/);
});

test("game diagnostics store only allowlisted path and build locally; analytics is bucketed",()=>{
 const diag=read("web-spa/src/analytics/gameRouteDiagnostics.tsx");
 assert.match(diag,/gameRoutes\.has\(normalized\)/);
 assert.match(diag,/GAME_LOAD_DIAGNOSTICS_KEY/);
 assert.match(diag,/currentBuild\.commit\?\.slice\(0,8\)/);
 assert.match(diag,/gameLoadBucket\(elapsedMs\?\?0\)/);
 assert.doesNotMatch(diag,/fetch\(/);
});
