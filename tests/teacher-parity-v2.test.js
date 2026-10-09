const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
function storage(){
 const data=new Map();
 return{getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
}
function load(modulePath,localStorage){
 const source=fs.readFileSync(path.join(root,modulePath),"utf8");
 const js=stripTypeScriptTypes(source,{mode:"transform"}).replace(/\bexport\s+(?=(?:function|const|let|class))/g,"");
 const names=modulePath.includes("adaptivePlacement")?["placementState","recordPlacement"]:["personalMemoryEnabled","saveStudentMemory","studentMemories","buildTutorMemoryContext","buildRoleplayMemoryContext","ingestStudentReport","setPersonalMemoryEnabled","deleteStudentMemory"];
 const exports={},ctx={exports,localStorage,Date,Math,JSON};
 vm.runInNewContext(js+"\nObject.assign(exports,{"+names.join(",")+"});",ctx,{filename:modulePath});return exports;
}
test("verified next-band vocabulary requires two correct probes and ignores failed stretch guesses",()=>{
 const store=storage(),p=load("web-spa/src/teacher/adaptivePlacement.ts",store);
 const hard=["counterpart","對應的人","","B2","business",64];
 assert.equal(p.placementState().score,50);
 const first=p.recordPlacement(hard,true);
 assert.equal(first.score,50);assert.equal(first.probeWins,1);assert.equal(first.forceProbe,true);
 const second=p.recordPlacement(hard,true);
 assert.equal(second.score,61);assert.equal(second.probeWins,0);
 const farAbove=["hypothesis","假設","","C1","business",90];
 assert.equal(p.recordPlacement(farAbove,false).score,61);
});
test("learner memory scopes by language, opt-in verifies student speech, and erased facts stay erased",()=>{
 const store=storage(),m=load("web-spa/src/teacher/studentMemory.ts",store);
 assert.equal(m.personalMemoryEnabled(),false);
 m.saveStudentMemory("英文","goal","I want to improve speaking");
 assert.ok(m.buildTutorMemoryContext("英文").includes("improve speaking"));
 assert.equal(m.studentMemories("日文").length,0);
 const report={memory_updates:{
  weaknesses:[{key:"tense:error",detail:"過去式用法",confidence:.7}],
  goals:[{key:"goal:meetings",detail:"Practice meetings",evidence_quote:"I want to practice meetings"}]}};
 m.ingestStudentReport("英文",report,[{input:"I want to practice meetings next month."}]);
 assert.equal(m.studentMemories("英文").filter(x=>x.type==="goal").length,1);
 assert.equal(m.studentMemories("英文").filter(x=>x.type==="weakness").length,1);
 m.setPersonalMemoryEnabled(true);
 m.ingestStudentReport("英文",report,[{input:"I want to practice meetings next month."}]);
 assert.equal(m.studentMemories("英文").filter(x=>x.type==="goal").length,2);
 const inferred=m.studentMemories("英文").find(x=>x.key==="goal:meetings");
 m.deleteStudentMemory("英文",inferred.id);
 m.ingestStudentReport("英文",report,[{input:"I want to practice meetings next month."}]);
 assert.equal(m.studentMemories("英文").filter(x=>x.key==="goal:meetings").length,0);
 assert.equal(m.studentMemories("日文").length,0);
 assert.equal(m.buildRoleplayMemoryContext("英文").includes("過去式用法"),false);
});
test("Web roleplay and camera parity remain enforced",()=>{
 const read=f=>fs.readFileSync(path.join(root,f),"utf8");
 const policy=read("web-spa/src/teacher/teacherPolicy.ts");
 const live=read("web-spa/src/teacher/LivePage.tsx");
 const service=read("features/teacher/reports/session-report.js");
 const cam=read("web-spa/src/teacher/MaterialLiveCamera.tsx");
 const socket=read("crew-live.js");
 assert.ok(policy.includes("Never provide unsolicited corrections"));
 assert.ok(policy.includes("buildRoleplayMemoryContext"));
 assert.ok(live.includes("evaluateCourseSession"));
 assert.ok(!live.includes("scoreCourseSession"));
 assert.ok(service.includes("mission_results"));
 assert.ok(cam.includes("visibilitychange")&&cam.includes("FRAME_INTERVAL_MS=3500"));
 assert.ok(socket.includes("sendVideoFrame"));
 assert.doesNotThrow(()=>new Function(socket));
 assert.doesNotThrow(()=>new Function(service));
});
