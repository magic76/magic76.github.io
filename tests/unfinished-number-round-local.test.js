const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const file=path.resolve(__dirname,"../web-spa/src/games/unfinishedNumberRound.ts");
const source=stripTypeScriptTypes(fs.readFileSync(file,"utf8"),{mode:"strip"}).replace(/^export /gm,"");
function storage(){const values=new Map();return{
 getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)
}}
function run(localStorage){const scope={localStorage};vm.runInNewContext(source+"\nObject.assign(this,{readUnfinishedNumberRound,saveUnfinishedNumberRound,clearUnfinishedNumberRound});",scope);return scope}
test("unfinished 1A2B restores the same secret and turns and can be discarded",()=>{
 const local=storage(),game=run(local),round={mode:"guess",digits:4,secret:"1234",dailyDate:null,history:[{guess:"5678",result:{a:0,b:0}}],at:Date.now()};
 game.saveUnfinishedNumberRound(round);
 assert.equal(game.readUnfinishedNumberRound().secret,"1234");
 assert.equal(game.readUnfinishedNumberRound().history[0].guess,"5678");
 game.clearUnfinishedNumberRound();assert.equal(game.readUnfinishedNumberRound(),null);
});
test("finished, tampered and outdated daily rounds cannot be resumed",()=>{
 const local=storage(),game=run(local),base={mode:"guess",digits:4,secret:"1234",dailyDate:null,history:[{guess:"5678",result:{a:0,b:0}}],at:Date.now()};
 local.setItem("crew_1a2b_unfinished_v1",JSON.stringify({...base,history:[{guess:"1234",result:{a:4,b:0}}]}));
 assert.equal(game.readUnfinishedNumberRound(),null);
 local.setItem("crew_1a2b_unfinished_v1",JSON.stringify({...base,history:[{guess:"5678",result:{a:1,b:0}}]}));
 assert.equal(game.readUnfinishedNumberRound(),null);
 local.setItem("crew_1a2b_unfinished_v1",JSON.stringify({...base,dailyDate:"2020-01-01"}));
 assert.equal(game.readUnfinishedNumberRound(),null);
});
