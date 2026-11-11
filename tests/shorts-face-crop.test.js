const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const cssRule=(css,selector)=>{
 const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 const found=css.match(new RegExp(escaped+"\\{([^}]*)\\}"));
 assert.ok(found,`CSS rule is present: ${selector}`);
 return found[1];
};

test("Shorts photo keeps the 3:4 image top visible in every card viewport",()=>{
 const css=read("web-spa/src/teacher/shorts.css");
 const image=cssRule(css,".crew-short-image>img");
 assert.match(image,/object-fit:cover/);
 assert.match(image,/object-position:center top/);
 assert.match(image,/transform-origin:center top/,"hover zoom must not shift the photo top out of frame");
 const actions=cssRule(css,".crew-short-actions");
 assert.match(actions,/bottom:152px/);
 assert.doesNotMatch(actions,/top:12px/);
});

test("Shorts referral square thumbnail is top-aligned at both 82px and 66px",()=>{
 const css=read("web-spa/src/friends/friends.css");
 const image=cssRule(css,".friend-live-post img");
 assert.match(image,/width:82px;height:82px/);
 assert.match(image,/object-fit:cover;object-position:center top/);
 const small=cssRule(css,".friend-live-page:has(.friend-shorts-first-action) .friend-live-post img");
 assert.match(small,/width:66px;height:66px/);
 assert.doesNotMatch(small,/object-position:/,"66px variant must retain the base top crop");
});
