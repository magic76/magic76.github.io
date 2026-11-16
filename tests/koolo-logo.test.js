const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createHash}=require("node:crypto");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const sha256=file=>createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex");
const iconBase="web-spa/public/brand/";
const approved={
 "koolo-wordmark-C.svg":"d55197593c40ef34182829c7627009f8d067d8e6c6b0cc6263d035066a45ba90",
 "koolo-wordmark-C-dark.svg":"aa9cc12869705d33ce26c9861ada43d2f9d716f9f74904eb085750dfe2691b9e",
 "koolo-icon-C.svg":"670ba7a43b8f4d3744d8c499dc31045f611c11dd1aa0ed027a5f95f4fffa97de",
 "koolo-icon-C-dark.svg":"599aaaa5c015c02cd556930d4dd125f862283e68101792985866dec84ccbc84d"
};

test("approved Koolo C SVG bytes are immutable and AppChrome uses light wordmark",()=>{
 for(const [name,expected] of Object.entries(approved))assert.equal(sha256(iconBase+name),expected,name);
 assert.equal(sha256("web-spa/public/favicon.svg"),approved["koolo-icon-C.svg"]);
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 assert.match(chrome,/<img className="app-wordmark" src="\/brand\/koolo-wordmark-C\.svg"/);
 assert.doesNotMatch(chrome,/koolo-wordmark-C-dark|koolo-icon-C-dark|app-mark/);
 assert.match(chrome,/to=\{product==="teacher"\?"\/teacher":"\/"\}/);
 assert.match(chrome,/aria-label=\{t\("brand\.homeLink",\{name:"Koolo"/);
 assert.match(chrome,/headerContext\?\.\[0\]/);
 assert.match(chrome,/headerContext\?\.\[1\]/);
 assert.match(chrome,/"chrome\.shortsSection"/);
 assert.match(chrome,/"chrome\.timelineTitle"/);
 assert.match(chrome,/briefing:"Briefing"/);
});

test("all headers keep 44px tappable brand and the <=410px teacher suffix stays visible",()=>{
 const shared=read("features/shared/design-system.css");
 const menu=read("web-spa/src/components/crewFeatureMenu.css");
 const mobile=read("web-spa/src/pages/mobileHome.css");
 assert.match(shared,/a\.app-brand\{min-height:44px;/);
 assert.match(shared,/\.app-wordmark\{[^}]*height:31px/);
 assert.match(menu,/@media\(max-width:410px\)/);
 assert.match(menu,/\.app-header \.app-wordmark\{width:80px;height:24px\}/);
 assert.doesNotMatch(menu,/\.app-header \.app-title strong\{[^}]*max-width:76px/);
 assert.doesNotMatch(menu,/\.app-header \.app-title strong\{[^}]*text-overflow:ellipsis/);
 assert.match(menu,/\.app-header \.app-title strong\{font-size:12px;white-space:normal\}/);
 assert.match(mobile,/\.app-header \.app-wordmark\{width:100px;height:30px\}/);
 assert.match(mobile,/\.app-header \.app-title\{display:none\}/);
 assert.doesNotMatch(mobile,/\.app-header \.app-title strong\{font-size:23px/);
 // No new sub-12px text was introduced by brand-related CSS declarations.
 const brandRules=[...shared.matchAll(/(?:\.app-wordmark|a\.app-brand)\{([^}]*)\}/g),...menu.matchAll(/\.app-header \.app-(?:title strong|wordmark)\{([^}]*)\}/g),...mobile.matchAll(/\.app-header \.app-(?:wordmark|title)\{([^}]*)\}/g)];
 for(const match of brandRules)for(const size of match[1].matchAll(/font-size:\s*([\d.]+)px/g))assert.ok(Number(size[1])>=12,size[0]);
});

test("Koolo PWA icons use fresh URLs without renaming Crew or shortcuts",async()=>{
 const manifest=JSON.parse(read("web-spa/public/site.webmanifest"));
 const html=read("web-spa/index.html");
 const cf=read("scripts/prepare-cloudflare.mjs");
 const vite=read("vite.web.config.ts");
 const generator=read("scripts/pwa-icons.mjs");
 const iconUrl="/icons/koolo-v1-180.png";
 assert.equal(manifest.short_name,"Crew");
 assert.match(manifest.name,/Crew/);
 assert.deepEqual(manifest.icons.map(icon=>icon.src),[
  "/icons/koolo-v1-192.png","/icons/koolo-v1-512.png","/icons/koolo-v1-maskable-512.png"
 ]);
 for(const input of [html,cf]){
  assert.ok(input.includes(iconUrl));
  assert.ok(input.includes('/favicon.svg'));
 }
 for(const input of [html,cf,JSON.stringify(manifest)])assert.ok(!input.includes('/icons/crew-teacher-v2-'));
 assert.match(html,/apple-mobile-web-app-title" content="Crew"/);
 assert.match(cf,/apple-mobile-web-app-title" content="Crew"/);
 assert.match(vite,/koolo-v1-maskable-512\.png/);
 assert.match(vite,/shortcut-\$\{kind\}-\$\{size\}\.png/);
 assert.match(generator,/icons\/koolo-source\.png/);
 assert.equal(sha256("web-spa/public/icons/koolo-source.png"),"172ef55cf1c3ea56dfb07c9748271890f58d1efc49f829755fa20eb98d91723d");
 const {createCrewPwaIcon}=await import("../scripts/pwa-icons.mjs");
 assert.deepEqual(createCrewPwaIcon(192),fs.readFileSync(path.join(root,"web-spa/public/icons/koolo-source.png")));
 assert.deepEqual(manifest.shortcuts.map(s=>s.url),["/chat","/learn","/games"]);
});
