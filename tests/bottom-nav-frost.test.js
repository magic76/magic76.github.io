const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=file=>readFileSync(path.resolve(__dirname,"..",file),"utf8");
const css=read("web-spa/src/components/mobileNavigation.css");
const chrome=read("web-spa/src/components/AppChrome.tsx");
const design=read("features/shared/design-system.css");

function rule(selector){
 const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 const match=css.match(new RegExp(escaped+"\\s*\\{([^}]*)\\}"));
 assert.ok(match,"missing CSS rule "+selector);
 return match[1];
}
function rgb(hex){return [1,3,5].map(pos=>parseInt(hex.slice(pos,pos+2),16));}
function luminance([r,g,b]){
 const channel=v=>{const s=v/255;return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4;};
 return 0.2126*channel(r)+0.7152*channel(g)+0.0722*channel(b);
}
function contrast(a,b){const [light,dark]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (light+.05)/(dark+.05);}

 test("shared frosted surface variables exist outside phone media query",()=>{
  const root=rule(":root");
  for(const token of ["bg","bg-fallback","blur","border","shadow","radius","idle","active","highlight"]){
   assert.match(root,new RegExp("--crew-frost-"+token+":\\s*[^;]+;"));
  }
  assert.ok(css.indexOf(":root{")<css.indexOf("@media(max-width:767px)"));
 });

test("phone nav is floating, frosted and safely inset without changing reserved nav height",()=>{
 const dock=rule(".crew-mobile-dock"); // The visible display:none base rule remains intact.
 const phone=css.slice(css.indexOf("@media(max-width:767px)"));
 const mobileDock=phone.match(/\.crew-mobile-dock\s*\{([^}]*)\}/)?.[1];
 assert.ok(mobileDock,"missing phone dock styles");
 for(const token of ["bg","blur","border","shadow","radius","idle"]){
  assert.ok(mobileDock.includes("var(--crew-frost-"+token+")"),"dock must use shared token "+token);
 }
 assert.match(mobileDock,/backdrop-filter:\s*var\(--crew-frost-blur\)/);
 assert.match(mobileDock,/-webkit-backdrop-filter:\s*var\(--crew-frost-blur\)/);
 assert.match(mobileDock,/border-radius:\s*var\(--crew-frost-radius\)/);
 assert.match(mobileDock,/bottom:calc\(8px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(mobileDock,/left:max\(10px,env\(safe-area-inset-left,0px\)\)/);
 assert.match(mobileDock,/right:max\(10px,env\(safe-area-inset-right,0px\)\)/);
 assert.match(mobileDock,/height:calc\(var\(--nav-h,68px\) - 8px\)/);
 assert.match(mobileDock,/max-width:620px/);
 assert.doesNotMatch(mobileDock,/border-top/);
 assert.match(design,/--nav-h:68px/);
 assert.match(phone,/\.crew-mobile-dock-inner\s*\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(phone,/\.crew-mobile-dock--immersive\{display:none!important\}/);
 assert.match(chrome,/aria-current=\{active===item.id\?"page":undefined\}/);
 assert.match(dock,/display:none/);
});

test("non-blur browsers use a more opaque fallback and focused tabs stay visible",()=>{
 assert.match(css,/@supports not \(\(backdrop-filter:blur\(1px\)\) or \(-webkit-backdrop-filter:blur\(1px\)\)\)/);
 assert.match(css,/\.crew-mobile-dock\{background:var\(--crew-frost-bg-fallback\)!important\}/);
 assert.match(rule(".crew-mobile-dock-item"),/font-size:12px/);
 assert.match(css,/\.crew-mobile-dock-item:focus-visible\{outline:3px solid/);
 assert.match(rule(".crew-mobile-dock-item"),/min-height:54px/);
 assert.ok(!/transition\s*:|animation\s*:/.test(css),"new dock must not animate without a reduced-motion override");
});

test("idle and active ink meet WCAG AA on the darkest translucent surface",()=>{
 const root=rule(":root");
 const alpha=Number(root.match(/--crew-frost-bg:rgba\(255,255,255,([\d.]+)\)/)?.[1]);
 assert.ok(alpha>=.72&&alpha<1,"frost needs visible transparency and adequate opacity");
 const underlyingDark=[Math.round(alpha*255),Math.round(alpha*255),Math.round(alpha*255)];
 const fallback=Number(root.match(/--crew-frost-bg-fallback:rgba\(255,255,255,([\d.]+)\)/)?.[1]);
 const fallbackDark=[Math.round(fallback*255),Math.round(fallback*255),Math.round(fallback*255)];
 for(const name of ["idle","active"]){
  const ink=rgb(root.match(new RegExp("--crew-frost-"+name+":(#[0-9a-fA-F]{6})"))?.[1]||"");
  assert.ok(contrast(ink,underlyingDark)>=4.5,"insufficient "+name+" contrast over a black Shorts photo");
  assert.ok(contrast(ink,fallbackDark)>=4.5,"insufficient "+name+" fallback contrast");
 }
});
