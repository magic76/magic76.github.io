const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");

function featureFiles(dir){
  const out=[];
  for(const name of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,name.name);
    if(name.isDirectory())out.push(...featureFiles(full));
    else if(name.isFile()&&name.name.endsWith(".js"))out.push(full);
  }
  return out;
}

test("ported app features stay modular and syntactically valid",()=>{
  const files=featureFiles(path.join(root,"features"));
  assert.ok(files.length>=10);
  for(const file of files){
    const source=fs.readFileSync(file,"utf8");
    assert.doesNotThrow(()=>new Function(source),path.relative(root,file));
    assert.ok(Buffer.byteLength(source,"utf8")<18000,path.relative(root,file)+" should stay under 18KB; split by responsibility");
  }
});

test("core port pages exist and are composed from feature modules",()=>{
  const expected={
    "teacher-textbook.html":["features/teacher/textbook/store.js","features/teacher/textbook/lesson.js","features/teacher/textbook/page.js"],
    "story-shelf.html":["features/story/shelf/store.js","features/story/shelf/page.js"],
    "story-create.html":["features/story/create/generator.js","features/story/create/page.js"],
    "story-reader.html":["features/story/reader/page.js"],
    "fortune-reading.html":["features/fortune/bazi/calculator.js","features/fortune/tarot/calculator.js","features/fortune/vedic/calculator.js","features/fortune/reading/page.js"]
  };
  for(const [page,modules] of Object.entries(expected)){
    const source=fs.readFileSync(path.join(root,page),"utf8");
    for(const mod of modules)assert.ok(source.includes(mod),page+" should load "+mod);
  }
});

test("Tarot numerology port matches known deterministic values",()=>{
  const source=fs.readFileSync(path.join(root,"features/fortune/tarot/calculator.js"),"utf8");
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(source,context);
  const result=context.window.CrewFortuneTarot.calculate("1985-07-06",new Date("2026-10-04T00:00:00Z"));
  assert.equal(result.lifePathNumber,9);
  assert.equal(result.personalityCardNumber,9);
  assert.equal(result.soulCardNumber,9);
  assert.equal(result.attitudeNumber,4);
  assert.equal(result.birthCardDisplay,"9 隱者");
  assert.equal(result.personalYearCalendarYear,2026);
});

test("main product pages expose the app-derived entry points",()=>{
  const teacher=fs.readFileSync(path.join(root,"teacher.html"),"utf8");
  const story=fs.readFileSync(path.join(root,"story.html"),"utf8");
  const fortune=fs.readFileSync(path.join(root,"fortune.html"),"utf8");
  assert.ok(teacher.includes("teacher-textbook.html"));
  assert.ok(story.includes("story-shelf.html"));
  assert.ok(story.includes("story-create.html"));
  assert.ok(fortune.includes("fortune-reading.html?mode=bazi"));
  assert.ok(fortune.includes("fortune-reading.html?mode=tarot"));
  assert.ok(fortune.includes("fortune-reading.html?mode=vedic"));
});


test("core surfaces use one Crew Web design system",()=>{
  const globalPages=[
    "index.html","settings.html","teacher.html","teacher-textbook.html",
    "story.html","story-shelf.html","story-create.html","story-reader.html",
    "fortune.html","fortune-reading.html"
  ];
  for(const page of globalPages){
    const source=fs.readFileSync(path.join(root,page),"utf8");
    assert.ok(source.includes("features/shared/design-system.css"),page+" should load the unified design system");
    assert.ok(source.includes("global-nav"),page+" should use the one global navigation");
    assert.ok(!source.includes("crew.css"),page+" should not depend on the legacy Crew stylesheet");
    assert.ok(!source.includes("product-shell.css"),page+" should not depend on the superseded product shell");
  }
  for(const page of ["teacher.html","story.html","fortune.html"]){
    const source=fs.readFileSync(path.join(root,page),"utf8");
    assert.ok(source.includes("subnav"),page+" should use product-local secondary navigation");
    assert.ok(!source.includes('id="liveStage"'),page+" should not embed the Live console on its home surface");
  }
});

test("Live experiences are dedicated session pages",()=>{
  const required={
    "teacher-live.html":["liveStage","liveBadge","liveModel","startLive","stopLive","muteLive","interruptLive","liveVolume","userLine","aiLine","continueLast","lang","scene","level","pace","correction","accent","voice"],
    "story-live.html":["liveStage","liveBadge","liveModel","startLive","stopLive","muteLive","interruptLive","liveVolume","userLine","aiLine","continueLast","topic","style","pace","interaction","voice"],
    "fortune-live.html":["liveStage","liveBadge","liveModel","startLive","stopLive","muteLive","interruptLive","liveVolume","userLine","aiLine","continueLast","birth","focus","tone","voice"]
  };
  for(const [page,ids] of Object.entries(required)){
    const source=fs.readFileSync(path.join(root,page),"utf8");
    assert.ok(source.includes("features/shared/design-system.css"),page+" should use the unified design system");
    assert.ok(source.includes("session-page"),page+" should present Live as a dedicated session state");
    assert.ok(!source.includes("global-nav"),page+" should remove global navigation during an active session surface");
    for(const id of ids)assert.ok(source.includes('id="'+id+'"'),page+" should retain #"+id);
  }
});

test("deep links enter the dedicated Live sessions",()=>{
  const reader=fs.readFileSync(path.join(root,"features/story/reader/page.js"),"utf8");
  const reading=fs.readFileSync(path.join(root,"features/fortune/reading/page.js"),"utf8");
  const teacher=fs.readFileSync(path.join(root,"teacher.html"),"utf8");
  assert.ok(reader.includes('story-live.html?from=book'));
  assert.ok(reading.includes('fortune-live.html?from=reading'));
  assert.ok(teacher.includes('teacher-live.html'));
});
