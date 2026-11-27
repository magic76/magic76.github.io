const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(root+"/web-spa/src/teacher/"+p,"utf8");
const strip=s=>stripTypeScriptTypes(s,{mode:"strip"}).replace(/^import .*;\s*$/gm,"").replace(/\bexport\s+(?=(?:const|function)\b)/g,"");
const api={};
vm.runInNewContext(strip(read("boardProtocol.ts"))+"\n"+strip(read("inlineBoardGate.ts"))+"\nObject.assign(api,{newInlineGate,proposeInlineBoard,finishInlineTurn,dismissInlineBoard,BOARD_FUNCTION});",{api});
const proposal=(gate,title="Past tenses",id="past")=>api.proposeInlineBoard(gate,{name:api.BOARD_FUNCTION,args:{action:"upsert",cards:[{id,type:"comparison",title,pairs:[{source:"went",target:"finished past"},{source:"have gone",target:"present relevance"}]}]}});
const finish=(g,input,now,auto=true,valid=true)=>api.finishInlineTurn(g,input,valid,auto,now);
test("opening and casual chat never auto-open a proposed whiteboard",()=>{
 const g=api.newInlineGate();
 assert.equal(proposal(g).queued,true);assert.equal(finish(g,"",1),null);
 proposal(g);assert.equal(finish(g,"How are you?",2),null);
 proposal(g);assert.equal(finish(g,"Yesterday I go shopping.",3),null);
 proposal(g);assert.equal(finish(g,"What is the difference between went and have gone?",4).id,"past");
});
test("90 seconds AND three learner turns; same material is deduplicated",()=>{
 const g=api.newInlineGate();proposal(g);assert.ok(finish(g,"差別是什麼",100));
 proposal(g,"Another","new");assert.equal(finish(g,"文法規則",100000),null);
 finish(g,"okay",100001);
 proposal(g,"Another","new");assert.ok(finish(g,"文法規則",100002));
 finish(g,"okay",200000);finish(g,"okay",200001);
 proposal(g,"Another","different-id");assert.equal(finish(g,"文法規則",200002),null);
});
test("dismissal blocks automatic reopening for three minutes; explicit requests bypass",()=>{
 const g=api.newInlineGate();proposal(g);assert.ok(finish(g,"發音規則",1));api.dismissInlineBoard(g,10);
 finish(g,"okay",11);finish(g,"okay",12);
 proposal(g,"New card","new");assert.equal(finish(g,"文法規則",100000),null);
 proposal(g,"New card","new");assert.ok(finish(g,"請打開白板",100001,false));
});
test("invalid proposals, repeated tool calls, disabled automatic and invalid turns fail closed",()=>{
 const g=api.newInlineGate();assert.equal(api.proposeInlineBoard(g,{name:api.BOARD_FUNCTION,args:{action:"upsert",cards:[{id:"empty",type:"comparison",title:"Empty"}]}}).ok,false);
 proposal(g);assert.equal(proposal(g).ok,false);assert.equal(finish(g,"文法規則",1,false),null);
 proposal(g);assert.equal(finish(g,"文法規則",2,true,false),null);
 g.requested=true;proposal(g);assert.ok(finish(g,"",3,false));
});
test("integration is optional and does not alter standalone board or Live transport",()=>{
 const live=read("LivePage.tsx"),gate=read("inlineBoardGate.ts"),ui=read("InlineTeacherBoard.tsx");
 assert.match(gate,/INLINE_TEACHER_BOARD_ENABLED=true/);
 assert.match(live,/tools:inlineBoard\.tools,onToolCall:inlineBoard\.onToolCall/);
 assert.match(live,/inlineBoard\.finish\(_turn\)/);
 assert.match(live,/!textMode&&!isRoleplay&&!fortuneKind&&!course&&Boolean\(geminiKey\(\)\)/);
 assert.match(ui,/enabled\?INLINE_BOARD_TOOLS:undefined/);
 assert.match(ui,/localStorage\.setItem\(PREF/);
 assert.match(live,/navigate\("\/teacher\/board"\)/);
});
