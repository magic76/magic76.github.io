const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.join(__dirname,"..");
const source=file=>fs.readFileSync(path.join(root,"web-spa/src/fortune",file),"utf8");
const transpile=s=>stripTypeScriptTypes(s,{mode:"strip"}).replace(/\bexport\s+(?=(?:const|function)\b)/g,"");
const artifacts={};
new Function("exports",transpile(source("identityArtwork.ts"))+"\nexports.identityArtworkUrl=identityArtworkUrl;exports.APPROVED_TAROT_ARTWORK_IDS=APPROVED_TAROT_ARTWORK_IDS;")(artifacts);
const identities={};
new Function("exports",transpile(source("identity.ts"))+"\nexports.buildFortuneIdentity=buildFortuneIdentity;")(identities);
const names=["自由冒險家","創造實踐者","直覺洞察者","豐盛培育者","秩序建構者","智慧傳承者","關係選擇者","意志推進者","溫柔勇者","真理探索者","轉機掌握者","公平裁決者","逆向思考者","轉化重生者","平衡調和者","慾望探索者","破框革新者","希望引路人","潛意識旅人","光芒散播者","覺醒召喚者","圓滿整合者"];
test("all 22 approved tarot characters are mapped by the runtime's actual personality-card number",()=>{
 assert.equal(artifacts.APPROVED_TAROT_ARTWORK_IDS.length,22);
 assert.equal(new Set(artifacts.APPROVED_TAROT_ARTWORK_IDS).size,22);
 for(let sourceNumber=1;sourceNumber<=22;sourceNumber++){
  const runtimeNumber=sourceNumber===1?22:sourceNumber-1;
  const id="tarot-"+runtimeNumber;
  const identity=identities.buildFortuneIdentity("tarot",{personalityCardNumber:runtimeNumber},"zh-TW");
  assert.ok(identity,id);
  assert.equal(identity.id,id);
  assert.equal(identity.title,names[sourceNumber-1],"ZIP source #"+sourceNumber+" must match runtime #"+runtimeNumber);
  assert.equal(artifacts.identityArtworkUrl(id),"/fortune/identity/art/"+id+".webp");
  const file=path.join(root,"web-spa/public/fortune/identity/art",id+".webp");
  const data=fs.readFileSync(file);
  assert.ok(data.length>100000&&data.length<900000,id+" optimized WebP should be substantial");
  assert.equal(data.toString("ascii",0,4),"RIFF",id);
  assert.equal(data.toString("ascii",8,12),"WEBP",id);
  assert.equal(data.toString("ascii",12,16),"VP8 ",id);
  assert.equal(data.readUInt16LE(26)&0x3fff,1536,id+" width");
  assert.equal(data.readUInt16LE(28)&0x3fff,864,id+" height");
 }
 assert.equal(artifacts.identityArtworkUrl("tarot-0"),"/fortune/identity/art/tarot-22.webp","0 is a harmless Fool fallback");
 assert.equal(identities.buildFortuneIdentity("tarot",{personalityCardNumber:22}).title,"自由冒險家");
 assert.equal(artifacts.identityArtworkUrl("tarot-23"),null);
 assert.equal(artifacts.identityArtworkUrl("tarot--1"),null);
 assert.equal(artifacts.identityArtworkUrl("tarot-luna"),null);
});
test("tarot on-screen previews and share images reuse the same mapped approved illustration",()=>{
 const card=source("FortuneIdentityCard.tsx");
 const share=source("identityShare.ts");
 assert.match(card,/buildFortuneCardModel/);
 assert.match(card,/artSrc=view.artSrc/);
 assert.match(share,/renderCollectibleCard/);
 assert.match(source("fortuneCardCanvas.ts"),/ctx.drawImage\(art/);
 assert.ok(!share.includes("reading.profile"));
});
