const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");

test("Crew Friends profile dialog renders at viewport root instead of animated page",()=>{
 const page=read("web-spa/src/friends/FriendsPage.tsx");
 const css=read("web-spa/src/friends/friends.css");
 const motion=read("web-spa/src/motion.css");
 assert.match(motion,/\.page\.page-enter\{animation:crew-route-in/);
 assert.match(page,/import \{createPortal\} from "react-dom"/);
 assert.match(page,/selected\?createPortal\(<div className="friends-modal-backdrop"/);
 assert.match(page,/<\/div>,document\.body\):null\}/);
 assert.match(css,/\.friends-modal-backdrop\{position:fixed;inset:0;z-index:2100;display:flex;align-items:center;justify-content:center/);
 assert.match(css,/max-height:min\(86dvh,740px\);overflow-y:auto/);
});
test("Friends dialog traps background scroll and restores keyboard focus on close",()=>{
 const page=read("web-spa/src/friends/FriendsPage.tsx");
 assert.match(page,/document\.body\.style\.overflow="hidden"/);
 assert.match(page,/document\.body\.style\.overflow=oldOverflow/);
 assert.match(page,/closeButton\.current\?\.focus\(\)/);
 assert.match(page,/lastFocused\?\.isConnected/);
 assert.match(page,/event\.key==="Escape"/);
 assert.match(page,/ref=\{closeButton\}/);
 assert.match(page,/onClick=\{e=>e\.stopPropagation\(\)\}/);
});
