const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");

function files(dir,ext){
 const out=[];
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())out.push(...files(full,ext));
  else if(entry.isFile()&&entry.name.endsWith(ext))out.push(full);
 }
 return out;
}

test("legacy service modules stay modular and syntactically valid",()=>{
 const list=files(path.join(root,"features"),".js");
 assert.ok(list.length>=10);
 for(const file of list){
  const source=fs.readFileSync(file,"utf8");
  assert.doesNotThrow(()=>new Function(source),path.relative(root,file));
  assert.ok(Buffer.byteLength(source,"utf8")<18000,path.relative(root,file)+" should stay under 18KB");
 }
});

test("React surfaces stay split by product and responsibility",()=>{
 const list=files(path.join(root,"web-spa","src"),".tsx");
 assert.ok(list.length>=18);
 for(const file of list){
  const bytes=Buffer.byteLength(fs.readFileSync(file,"utf8"),"utf8");
  assert.ok(bytes<26000,path.relative(root,file)+" should stay under 26KB");
 }
});

test("Tarot numerology deterministic service keeps known values",()=>{
 const source=fs.readFileSync(path.join(root,"features/fortune/tarot/calculator.js"),"utf8");
 const context={window:{}};vm.createContext(context);vm.runInContext(source,context);
 const result=context.window.CrewFortuneTarot.calculate("1985-07-06",new Date("2026-10-04T00:00:00Z"));
 assert.equal(result.lifePathNumber,9);
 assert.equal(result.personalityCardNumber,9);
 assert.equal(result.soulCardNumber,9);
 assert.equal(result.attitudeNumber,4);
 assert.equal(result.birthCardDisplay,"9 隱者");
 assert.equal(result.personalYearCalendarYear,2026);
});

test("every public legacy entry routes into the unified React SPA",()=>{
 const pages=["index.html","settings.html","teacher.html","teacher-live.html","teacher-textbook.html","teacher-vocabulary.html","teacher-course.html","teacher-pronunciation.html","story.html","story-shelf.html","story-create.html","story-reader.html","story-live.html","fortune.html","fortune-reading.html","fortune-live.html"];
 for(const page of pages){
  const source=fs.readFileSync(path.join(root,page),"utf8");
  assert.ok(source.includes("crew-app/#/"),page+" should forward to Crew React");
  assert.ok(!source.includes("features/shared/design-system.css"),page+" should no longer render a legacy UI");
 }
});

test("unified React router owns all Crew product surfaces",()=>{
 const app=fs.readFileSync(path.join(root,"web-spa/src/App.tsx"),"utf8");
 const routes=["/","/settings","/teacher","practice","learn","tutor","me","vocabulary","course","pronunciation","textbook","/teacher/live","/story","shelf","create","read/:id","/story/live","/fortune","history","reading","/fortune/live"];
 for(const route of routes)assert.ok(app.includes(route),"missing React route "+route);
});

test("Teacher React mirrors native app feature names",()=>{
 const practice=fs.readFileSync(path.join(root,"web-spa/src/teacher/PracticePage.tsx"),"utf8");
 const learn=fs.readFileSync(path.join(root,"web-spa/src/teacher/LearnPage.tsx"),"utf8");
 const combined=practice+"\n"+learn;
 for(const label of ["跟老師聊","教材陪讀","單字練習","情境課程","朗讀糾音"])assert.ok(combined.includes(label));
 assert.ok(!combined.includes("表達教練"));
 assert.ok(!combined.includes("工作情境"));
});

test("Teacher React keeps adaptive vocabulary review behavior",()=>{
 const source=fs.readFileSync(path.join(root,"web-spa/src/teacher/VocabularyPage.tsx"),"utf8");
 assert.ok(source.includes("crew_vocab_score"));
 assert.ok(source.includes("3000"));
 assert.ok(source.includes("speechSynthesis"));
});

test("all React Live products use shared manual-interrupt session hook",()=>{
 const hook=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 const controls=fs.readFileSync(path.join(root,"web-spa/src/live/LiveControls.tsx"),"utf8");
 assert.ok(hook.includes("manualInterruptOnly:true"));
 assert.ok(controls.includes('live.state!=="speaking"'));
 for(const page of ["teacher/LivePage.tsx","teacher/PronunciationPage.tsx","teacher/TextbookPage.tsx","story/LivePage.tsx","fortune/LivePage.tsx"]){
  const source=fs.readFileSync(path.join(root,"web-spa/src",page),"utf8");
  assert.ok(source.includes("useLiveSession"),page+" should use shared Live state");
  assert.ok(!source.includes("liveModel"),page+" should not expose model UI");
  assert.ok(!source.includes("底層仍沿用"),page+" should not show implementation copy");
  assert.ok(!source.includes("畫面跟著 Live state"),page+" should not show implementation copy");
  assert.ok(!source.includes("liveModel"),page+" should not expose model UI");
 }
});

test("Teacher profiles use local public avatar assets",()=>{
 const profiles=fs.readFileSync(path.join(root,"web-spa/src/teacher/teacherProfiles.ts"),"utf8");
 const tutor=fs.readFileSync(path.join(root,"web-spa/src/teacher/TutorPage.tsx"),"utf8");
 const live=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 for(const name of ["emma","alex","james","mia"]){
  assert.ok(fs.existsSync(path.join(root,"assets/teacher/teacher-"+name+".webp")),"missing public avatar for "+name);
  assert.ok(profiles.includes("teacher-"+name+".webp"),"profile registry should import "+name+" avatar");
 }
 assert.ok(tutor.includes("getTeacherProfile"));
 assert.ok(live.includes("getTeacherProfile"));
 assert.ok(!tutor.includes("raw.githubusercontent.com/magic76/crew-teacher"));
 assert.ok(!live.includes("raw.githubusercontent.com/magic76/crew-teacher"));
});

test("React build toolchain is the primary Web toolchain",()=>{
 const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
 assert.equal(pkg.dependencies.react,"19.3.0");
 assert.equal(pkg.dependencies["react-router-dom"],"7.18.4");
 assert.equal(pkg.dependencies.zustand,"5.0.15");
 assert.ok(pkg.scripts["check:web"]);
 assert.ok(pkg.scripts["build:web"]);
 const config=fs.readFileSync(path.join(root,"vite.web.config.ts"),"utf8");
 assert.ok(config.includes('root: "web-spa"'));
 assert.ok(config.includes('outDir: "../crew-app"'));
});


test("superseded Teacher-only SPA is removed",()=>{
 assert.ok(!fs.existsSync(path.join(root,"teacher-spa")),"teacher-spa should be replaced by web-spa");
 assert.ok(!fs.existsSync(path.join(root,"teacher-app")),"teacher-app should be replaced by crew-app");
 assert.ok(!fs.existsSync(path.join(root,"vite.teacher.config.ts")),"Teacher-only Vite config should be removed");
 const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
 assert.equal(pkg.scripts["build:teacher"],undefined);
 assert.equal(pkg.scripts["check:teacher"],undefined);
});

test("Live model names stay internal",()=>{
 const core=fs.readFileSync(path.join(root,"crew-live.js"),"utf8");
 const hook=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 const settings=fs.readFileSync(path.join(root,"web-spa/src/pages/SettingsPage.tsx"),"utf8");
 assert.ok(!core.includes('this._status("正在連線 "+model'));
 assert.ok(!core.includes('this._status(attempt.model+'));
 assert.ok(hook.includes('replace(/gemini-'));
 assert.ok(settings.includes('replace(/gemini-'));
});


test("Teacher Web mirrors native selectable tutor profiles",()=>{
 const profiles=fs.readFileSync(path.join(root,"web-spa/src/teacher/teacherProfiles.ts"),"utf8");
 const store=fs.readFileSync(path.join(root,"web-spa/src/store/teacherStore.ts"),"utf8");
 const picker=fs.readFileSync(path.join(root,"web-spa/src/teacher/TeacherProfilePicker.tsx"),"utf8");
 const tutor=fs.readFileSync(path.join(root,"web-spa/src/teacher/TutorPage.tsx"),"utf8");
 const live=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 for(const name of ["Emma","Alex","James","Mia"])assert.ok(profiles.includes('name:"'+name+'"'),"missing tutor "+name);
 for(const voice of ["Kore","Hyperion","Prospero","Leda"])assert.ok(profiles.includes('recommendedVoice:"'+voice+'"'),"missing recommended voice "+voice);
 assert.ok(store.includes("teacherProfile"));
 assert.ok(store.includes("setTeacherProfile"));
 assert.ok(store.includes("profile.recommendedVoice"),"changing tutor should apply the recommended voice");
 assert.ok(picker.includes("TEACHER_PROFILES"));
 assert.ok(tutor.includes("TeacherProfilePicker"));
 assert.ok(live.includes("TeacherProfilePicker"));
 assert.ok(live.includes("teacherIdentityPrompt(profile)"));
});

test("Teacher session openings stay natural across new sessions and reconnects",()=>{
 const profiles=fs.readFileSync(path.join(root,"web-spa/src/teacher/teacherProfiles.ts"),"utf8");
 const live=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 const pronunciation=fs.readFileSync(path.join(root,"web-spa/src/teacher/PronunciationPage.tsx"),"utf8");
 const textbook=fs.readFileSync(path.join(root,"web-spa/src/teacher/TextbookPage.tsx"),"utf8");
 const core=fs.readFileSync(path.join(root,"crew-live.js"),"utf8");
 assert.ok(profiles.includes("Hi there"));
 assert.ok(profiles.includes("after an interruption, reconnect, session resumption, or topic transition"));
 assert.ok(live.includes("This is the only proactive opening for this session"));
 assert.ok(live.includes("Do not greet, re-introduce yourself, or restart the session"));
 assert.ok(live.includes("Skip generic greetings"));
 assert.ok(pronunciation.includes("Do not greet"));
 assert.ok(textbook.includes("Do not greet or restart the conversation"));
 assert.ok(core.includes("this.openingSent=false"));
 assert.ok(core.includes("this.openingSent=true"));
 assert.ok(core.includes("||this.openingSent"),"core should prevent repeated proactive openings");
});
