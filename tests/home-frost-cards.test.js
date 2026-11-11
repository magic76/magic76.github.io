const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {createHash}=require("node:crypto");
const path=require("node:path");
const read=file=>readFileSync(path.resolve(__dirname,"..",file),"utf8");
const css=read("web-spa/src/pages/mobileHome.css");
const page=read("web-spa/src/pages/MobileHomePage.tsx");
const cssRule=selector=>{
 const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 const match=css.match(new RegExp(escaped+"\\{([^}]*)\\}"));
 assert.ok(match,`missing CSS rule ${selector}`);
 return match[1];
};
const rgb=hex=>[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255);
const luminance=hex=>rgb(hex).reduce((sum,n,index)=>sum+[.2126,.7152,.0722][index]*(n<=.04045?n/12.92:((n+.055)/1.055)**2.4),0);
const contrast=(left,right)=>{
 const [bright,dark]=[luminance(left),luminance(right)].sort((a,b)=>b-a);
 return (bright+.05)/(dark+.05);
};

const palettes={
 friends:["#ffe6eb","#f8cedd","#803651"],
 teacher:["#eaf2ff","#cedefa","#365b99"],
 games:["#e5f8ee","#c8ecd9","#276b50"],
 story:["#fff1dd","#f8d9af","#80501f"],
 fortune:["#eee7ff","#d8cdf8","#5f468d"],
 shorts:["#ffe7f0","#f6ccdd","#833e61"],
 timeline:["#e7effb","#cedbed","#3c5985"],
 scenarios:["#e4f6f6","#c9e8e8","#2c6572"]
};

test("mobile shortcut cards reuse the shared frost tokens and remain distinct from the dock",()=>{
 const card=cssRule(".cmh-app");
 assert.match(css,/@media\(max-width:767px\)/);
 assert.match(css,/\.crew-mobile-home\{display:none\}/);
 for(const token of ["--crew-frost-bg","--crew-frost-blur","--crew-frost-border"]){
  assert.ok(card.includes(`var(${token})`),`missing shared token ${token}`);
 }
 assert.match(card,/-webkit-backdrop-filter:var\(--crew-frost-blur\)/);
 assert.match(card,/(?:^|;)\s*backdrop-filter:var\(--crew-frost-blur\)/);
 assert.match(card,/border-radius:var\(--cmh-card-radius\)/);
 assert.match(card,/box-shadow:var\(--cmh-card-shadow\)/);
 assert.match(card,/min-height:102px/);
 assert.match(css,/--cmh-card-radius:19px/);
 assert.match(css,/@supports not \(\(backdrop-filter:blur\(1px\)\) or \(-webkit-backdrop-filter:blur\(1px\)\)\)\{\s*\.cmh-app\{background:var\(--crew-frost-bg-fallback\)\}/);
});

test("eight pale gradient icon palettes use dark strokes with at least 4.5:1 endpoint contrast",()=>{
 const icon=cssRule(".cmh-app-icon");
 assert.match(icon,/background:linear-gradient\(145deg,var\(--cmh-tint-a\),var\(--cmh-tint-b\)\)/);
 assert.match(icon,/color:var\(--cmh-ink\)/);
 assert.match(icon,/width:46px;height:46px/);
 assert.match(icon,/border-radius:14px/);
 assert.match(cssRule(".cmh-app-icon svg"),/stroke:currentColor/);
 for(const [id,colors] of Object.entries(palettes)){
  const rule=cssRule(`.cmh-app-${id}`);
  for(const [prop,value] of ["--cmh-tint-a","--cmh-tint-b","--cmh-ink"].map((prop,i)=>[prop,colors[i]])){
   assert.ok(rule.includes(`${prop}:${value}`),`${id} missing ${prop}`);
  }
  for(const tile of colors.slice(0,2)){
   assert.ok(contrast(tile,colors[2])>=4.5,`${id}: ${tile} on ${colors[2]} below 4.5:1`);
  }
 }
});

test("four columns, readable wrapping labels and accessible motion and press feedback",()=>{
 const grid=cssRule(".cmh-app-grid");
 assert.match(grid,/display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(grid,/gap:10px 8px/);
 assert.match(cssRule(".cmh-app"),/padding:10px 4px 9px/);
 const label=cssRule(".cmh-app-name");
 const size=label.match(/font-size:(\d+(?:\.\d+)?)px/);
 assert.ok(size&&Number(size[1])>=12,"labels must be >=12px");
 assert.match(label,/white-space:normal/);
 assert.match(label,/overflow-wrap:normal/);
 assert.doesNotMatch(label,/ellipsis|white-space:nowrap/);
 assert.match(label,/color:var\(--crew-frost-idle\)/);
 assert.match(cssRule(".cmh-app:active"),/transform:scale\(\.96\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\s*\.cmh-app\{transition:none!important\}\s*\.cmh-app:active\{transform:none\}/);
 assert.match(css,/\.crew-mobile-home :is\(a,button\):focus-visible\{outline:3px solid #6267c4/);
 assert.match(css,/@media\(max-width:360px\)\{[\s\S]*?\.cmh-app-icon\{width:44px;height:44px\}/);
});

test("the source APPS entries, routes, order, icons, tracking and markup are unchanged",()=>{
 const expectedHash="335c06140d3daf69ad76519c9ac0a16350fffee967c3914dd935fd40f9221e74";
 assert.equal(createHash("sha256").update(page).digest("hex"),expectedHash,"MobileHomePage.tsx must remain byte-identical to base");
 const source=page.slice(page.indexOf("const APPS:"),page.indexOf("/** Mobile-only"));
 const actual=[...source.matchAll(/\{id:"([^"]+)",zh:"([^"]+)",en:"([^"]+)",icon:"([^"]+)",to:"([^"]+)",event:"([^"]+)"\}/g)];
 const expected=[
  ["friends","AI 朋友","AI Friends","chat","/teacher/roles?mode=friends","friend"],
  ["teacher","學語言","Learn","teacher","/learn","learn"],
  ["games","玩遊戲","Games","play","/games","play"],
  ["story","故事","Stories","story","/story","story"],
  ["fortune","命理","Fortune","fortune","/fortune","fortune"],
  ["shorts","朋友動態","Moments","image","/teacher/shorts","shorts"],
  ["timeline","時光機","Timeline","history","/timeline","timeline"],
  ["scenarios","情境課程","Scenarios","scene","/teacher/course","learn"]
 ];
 assert.deepEqual(actual.map(item=>item.slice(1)),expected);
 assert.match(page,/className="cmh-app-grid"\>\{APPS\.map\(app=><Link to=\{app.to\} key=\{app.id\} className="cmh-app" onClick=\{\(\)=>track\(app.event\)\}/);
});
