const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const game=name=>fs.readFileSync(path.join(root,"web-spa/src/games",name),"utf8");

test("shared game panel clears backdrop dismissal after a cancelled touch gesture",()=>{
 const panel=game("GamePanel.tsx");
 assert.match(panel,/const cancelBackdropPointer=\(\)=>\{backdropPointerRef\.current=false\}/);
 assert.match(panel,/onPointerCancel=\{cancelBackdropPointer\}/);
 assert.match(panel,/backdropPointerRef\.current&&event\.target===event\.currentTarget/);
});

test("shared game panel keeps coarse-pointer controls at least 44px tall",()=>{
 const css=game("gamePanel.css");
 assert.match(css,/@media\(pointer:coarse\)/);
 assert.match(css,/\.crew-game-panel-trigger\{min-height:44px\}/);
 assert.match(css,/\.crew-game-panel-content button,\.crew-game-panel-content select\{min-height:44px\}/);
 assert.match(css,/touch-action:manipulation/);
});

test("open game dialogs isolate the background and restore its previous inert state",()=>{
 const panel=game("GamePanel.tsx");
 assert.match(panel,/const backdropRef=useRef<HTMLDivElement>\(null\)/);
 assert.match(panel,/element!==backdrop/);
 assert.match(panel,/wasInert:element\.hasAttribute\("inert"\)/);
 assert.match(panel,/element\.setAttribute\("inert",""\)/);
 assert.match(panel,/if\(!wasInert\)element\.removeAttribute\("inert"\)/);
 assert.match(panel,/ref=\{backdropRef\}/);
 assert.match(panel,/aria-modal="true"/);
});
