const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("Koolo loading asset keeps the approved wordmark geometry and staggered letter motion",()=>{
 const svg=read("web-spa/public/brand/koolo-loading.svg");
 const wordmark=read("web-spa/public/brand/koolo-wordmark-koo-v2.svg");
 for(const geometry of ["M15 10V36M15 25 31 11M16 25 32 37","M105 10V37","M55 44Q66 47 77 44",'cx="53" cy="24"','cx="79" cy="24"','cx="130" cy="24"','cx="152" cy="33"']){
  assert.ok(svg.includes(geometry)&&wordmark.includes(geometry),geometry);
 }
 assert.match(svg,/animation-delay: \.45s/);
 assert.match(svg,/prefers-reduced-motion: reduce/);
 assert.match(svg,/\.letter \{ animation: none; \}/);
});
test("HTML and route fallback share the loader without delaying a valid prerender",()=>{
 const html=read("web-spa/index.html"),cf=read("scripts/prepare-cloudflare.mjs");
 const app=read("web-spa/src/App.tsx"),loader=read("web-spa/src/components/KooloLoader.tsx");
 const css=read("web-spa/src/styles.css");
 assert.ok(html.includes('src="/brand/koolo-loading.svg"'));
 assert.match(html,/#root:empty \+ \.koolo-boot-loader, html\.crew-dynamic-route \.koolo-boot-loader/);
 assert.match(html,/\.koolo-boot-loader \{ display:none/);
 assert.ok(html.indexOf('class="koolo-boot-loader"')<html.indexOf('src="/src/main.tsx"'));
 assert.ok(cf.includes("const bootStyle=")&&cf.includes("const bootMarkup=")&&cf.includes("${bootStyle}"));
 assert.ok(cf.includes("+'</div>'+bootMarkup+'</body>'"));
 assert.match(app,/Suspense fallback=\{<KooloLoader label=\{t\("loading"\)\}/);
 assert.ok(app.indexOf("</Routes></Suspense>")<app.indexOf("<GlobalNav active="));
 assert.match(loader,/BASE_URL\+"brand\/koolo-loading\.svg"/);
 assert.match(loader,/role="status"/);
 assert.match(css,/koolo-loader-reveal \.15s/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test("route loading is viewport centered without intercepting navigation; inline remains in flow",()=>{
 const css=read("web-spa/src/styles.css");
 assert.match(css,/\.koolo-loader\{[^}]*display:grid;place-items:center/);
 assert.match(css,/\.koolo-loader:not\(\.koolo-loader--inline\)\{position:fixed;inset:0;pointer-events:none\}/);
 assert.match(css,/\.koolo-loader--inline\{min-height:0;padding:12px\}/);
 assert.doesNotMatch(css,/\.koolo-loader\{[^}]*45s?vh/);
});
