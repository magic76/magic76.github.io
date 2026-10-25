const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const read=path=>readFileSync(path,"utf8");

test("textbook photo picker uses a directly tappable input for Android WebView",()=>{
 const page=read("web-spa/src/teacher/TextbookPage.tsx");
 const styles=read("web-spa/src/styles.css");
 assert.match(page,/className="textbook-file-input" type="file" accept="image\/\*" multiple/);
 assert.doesNotMatch(page,/type="file"[^>]*\bhidden\b/);
 assert.match(styles,/\.textbook-upload\{position:relative/);
 assert.match(styles,/\.textbook-file-input\{position:absolute;inset:0;display:block;width:100%;height:100%;opacity:0/);
});

test("expanded live material camera fills viewport and restores on Escape",()=>{
 const camera=read("web-spa/src/teacher/MaterialLiveCamera.tsx");
 const styles=read("web-spa/src/styles.css");
 assert.match(camera,/setExpanded\(v=>!v\)/);
 assert.match(camera,/event\.key==="Escape"\)setExpanded\(false\)/);
 assert.match(camera,/aria-pressed=\{expanded\}/);
 assert.match(styles,/\.material-live-camera\.expanded\{position:fixed;inset:0;z-index:10000/);
 assert.match(styles,/\.material-live-camera\.expanded \.material-camera-frame\{width:100%;height:65vh;height:65dvh/);
});
