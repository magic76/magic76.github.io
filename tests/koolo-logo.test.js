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

test("approved C SVGs remain immutable and AppChrome uses v2 shorter-smile wordmark",()=>{
 for(const [name,expected] of Object.entries(approved))assert.equal(sha256(iconBase+name),expected,name);
 assert.equal(sha256("web-spa/public/favicon.svg"),"f21633aeb23557fa10a523fbdfae77f37a3a9a2dd746f99f68d73ac8c1e708b7");
 assert.equal(sha256(iconBase+"koolo-wordmark-koo-v2.svg"),"1776f60986bb34d7e87b185291d0dfa7b3d299763057be9d4e1c6487d4cc1b44");
 assert.equal(sha256(iconBase+"koolo-wordmark-koo-v2-dark.svg"),"96d7badddafb6e45158a2eb9c52f9cc4501e73627f9388b7eb8536e3e74d64e7");
 assert.match(read(iconBase+"koolo-wordmark-koo-v2.svg"),/M55 39Q66 46 77 39/);
 assert.match(read(iconBase+"koolo-icon-koo-v2.svg"),/M13 22V42/);
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 assert.match(chrome,/<img className="app-wordmark" src="\/brand\/koolo-wordmark-koo-v2\.svg"/);
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
 assert.match(shared,/@media\(max-width:767px\)\{\s*\.app-header \.inner\{height:52px\}\s*\.app-header \.app-wordmark\{width:88px;height:26px\}\s*\}/);
 assert.doesNotMatch(menu,/\.app-header \.app-wordmark\{/);
 assert.doesNotMatch(menu,/\.app-header \.app-title strong\{[^}]*max-width:76px/);
 assert.doesNotMatch(menu,/\.app-header \.app-title strong\{[^}]*text-overflow:ellipsis/);
 assert.match(menu,/\.app-header \.app-title strong\{font-size:12px;white-space:normal\}/);
 assert.doesNotMatch(mobile,/\.app-header \.(?:inner|app-wordmark)\{/);
 assert.match(mobile,/\.app-header \.app-title\{display:none\}/);
 assert.doesNotMatch(mobile,/\.app-header \.app-title strong\{font-size:23px/);
 // No new sub-12px text was introduced by brand-related CSS declarations.
 const brandRules=[...shared.matchAll(/(?:\.app-wordmark|a\.app-brand)\{([^}]*)\}/g),...menu.matchAll(/\.app-header \.app-(?:title strong|wordmark)\{([^}]*)\}/g),...mobile.matchAll(/\.app-header \.app-(?:wordmark|title)\{([^}]*)\}/g)];
 for(const match of brandRules)for(const size of match[1].matchAll(/font-size:\s*([\d.]+)px/g))assert.ok(Number(size[1])>=12,size[0]);
});

test("Koolo PWA icons use fresh URLs with Koolo app name and unchanged shortcuts",async()=>{
 const manifest=JSON.parse(read("web-spa/public/site.webmanifest"));
 const html=read("web-spa/index.html");
 const cf=read("scripts/prepare-cloudflare.mjs");
 const vite=read("vite.web.config.ts");
 const generator=read("scripts/pwa-icons.mjs");
 const iconUrl="/icons/koolo-v2-180.png";
 assert.equal(manifest.short_name,"Koolo");
 assert.match(manifest.name,/Koolo/);
 assert.deepEqual(manifest.icons.map(icon=>icon.src),[
  "/icons/koolo-v2-192.png","/icons/koolo-v2-512.png","/icons/koolo-v2-maskable-512.png"
 ]);
 for(const input of [html,cf]){
  assert.ok(input.includes(iconUrl));
  assert.ok(input.includes('/favicon.svg'));
 }
 for(const input of [html,cf,JSON.stringify(manifest)])assert.ok(!input.includes('/icons/crew-teacher-v2-'));
 assert.match(html,/apple-mobile-web-app-title" content="Koolo"/);
 assert.match(cf,/apple-mobile-web-app-title" content="Koolo"/);
 assert.match(vite,/koolo-v2-maskable-512\.png/);
 assert.match(vite,/shortcut-\$\{kind\}-\$\{size\}\.png/);
 assert.match(generator,/icons\/koolo-source-v2\.png/);
 assert.equal(sha256("web-spa/public/icons/koolo-source-v2.png"),"25ba52c3f2b1b6b5218df36e5a832d22a94f524543056739fffe0c4572b89c7b");
 const {createCrewPwaIcon}=await import("../scripts/pwa-icons.mjs");
 assert.deepEqual(createCrewPwaIcon(192),fs.readFileSync(path.join(root,"web-spa/public/icons/koolo-source-v2.png")));
 assert.deepEqual(manifest.shortcuts.map(s=>s.url),["/chat","/learn","/games"]);
});
