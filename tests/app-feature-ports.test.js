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
 const routes=["/","/settings","/teacher","practice","learn","tutor","me","vocabulary","course","pronunciation","textbook","phrasebook","reports","reading-library","/teacher/live","/story","shelf","create","edit/:id","physical","physical/:id","read/:id","/story/live","/fortune","history","reading","/fortune/live"];
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
 for(const name of ["emma","alex","james","mia","sophie","lina"]){
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
 for(const name of ["Emma","Alex","James","Mia","Sophie","Lina"])assert.ok(profiles.includes('name:"'+name+'"'),"missing tutor "+name);
 for(const voice of ["Kore","Hyperion","Prospero","Leda","Callisto","Europa"])assert.ok(profiles.includes('recommendedVoice:"'+voice+'"'),"missing recommended voice "+voice);
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


test("Story React mirrors native shelf editor player and physical-book flows",()=>{
 const app=fs.readFileSync(path.join(root,"web-spa/src/App.tsx"),"utf8");
 const shelf=fs.readFileSync(path.join(root,"web-spa/src/story/ShelfPage.tsx"),"utf8");
 const editor=fs.readFileSync(path.join(root,"web-spa/src/story/EditorPage.tsx"),"utf8");
 const reader=fs.readFileSync(path.join(root,"web-spa/src/story/ReaderPage.tsx"),"utf8");
 const player=fs.readFileSync(path.join(root,"web-spa/src/story/player/StoryPlayerView.tsx"),"utf8");
 const physical=fs.readFileSync(path.join(root,"web-spa/src/story/PhysicalBookPage.tsx"),"utf8");
 const mine=fs.readFileSync(path.join(root,"web-spa/src/story/MyPage.tsx"),"utf8");
 const analyzer=fs.readFileSync(path.join(root,"features/story/physical/analyzer.js"),"utf8");
 for(const route of ["edit/:id","physical","physical/:id"])assert.ok(app.includes(route));
 for(const label of ["繼續閱讀","創作故事","實體書陪讀","探索故事"])assert.ok(shelf.includes(label));
 for(const label of ["編輯繪本","刪除此頁","說故事的感覺","角色台詞"])assert.ok(editor.includes(label));
 assert.ok(reader.includes("StoryPlayerView"));
 for(const label of ["播放","story-page-progress","跟阿奇說話","暫停","繼續","再聽一次","更多"])assert.ok(player.includes(label));
 assert.ok(!player.includes("繼續本頁"));
 for(const label of ["拍故事書封面","拍第一頁","拍下一頁"])assert.ok(physical.includes(label));
 for(const label of ["說書語言","阿奇聲線","故事偏好"])assert.ok(mine.includes(label));
 assert.ok(analyzer.includes("visibleText"));
 assert.ok(analyzer.includes("spoilerBoundary"));
});

test("Fortune React exposes APK-style result tabs and deterministic evidence",()=>{
 const reading=fs.readFileSync(path.join(root,"web-spa/src/fortune/ReadingPage.tsx"),"utf8");
 const bazi=fs.readFileSync(path.join(root,"web-spa/src/fortune/result/BaZiTabs.tsx"),"utf8");
 const tarot=fs.readFileSync(path.join(root,"web-spa/src/fortune/result/TarotTabs.tsx"),"utf8");
 const vedic=fs.readFileSync(path.join(root,"web-spa/src/fortune/result/VedicTabs.tsx"),"utf8");
 const bzCalc=fs.readFileSync(path.join(root,"features/fortune/bazi/calculator.js"),"utf8");
 const tarotCalc=fs.readFileSync(path.join(root,"features/fortune/tarot/calculator.js"),"utf8");
 const vedicEnrich=fs.readFileSync(path.join(root,"features/fortune/vedic/enrich.js"),"utf8");
 assert.ok(reading.includes("shareFortuneReading"));
 for(const label of ["先看重點","時間節奏","生活主題","完整解讀"])assert.ok(bazi.includes(label));
 for(const label of ["先看重點","時間節奏","生活主題","完整解讀"])assert.ok(tarot.includes(label));
 for(const label of ["先看重點","生活主題","詳細資料","完整解讀"])assert.ok(vedic.includes(label));
 for(const key of ["annualTimeline","wealthProfile","careerProfile","relationshipProfile"])assert.ok(bzCalc.includes(key));
 assert.ok(tarotCalc.includes("personalMonthTimeline"));
 for(const key of ["currentTransits","majorTransitTimeline","houseLords","familyChildrenProfile"])assert.ok(vedicEnrich.includes(key));
});

test("Fortune history is reopenable instead of summary-only",()=>{
 const historyPage=fs.readFileSync(path.join(root,"web-spa/src/fortune/HistoryPage.tsx"),"utf8");
 const store=fs.readFileSync(path.join(root,"features/fortune/shared/profile.js"),"utf8");
 assert.ok(historyPage.includes("/fortune/reading?history="));
 assert.ok(store.includes("function get(id)"));
 assert.ok(store.includes("filter(function(x){return !x||x.id!==id})"),"history updates should upsert by reading id");
});


test("Fortune keeps Live as secondary help instead of a primary product surface",()=>{
 const layout=fs.readFileSync(path.join(root,"web-spa/src/fortune/FortuneLayout.tsx"),"utf8");
 const home=fs.readFileSync(path.join(root,"web-spa/src/fortune/HomePage.tsx"),"utf8");
 const reading=fs.readFileSync(path.join(root,"web-spa/src/fortune/ReadingPage.tsx"),"utf8");
 const common=fs.readFileSync(path.join(root,"web-spa/src/fortune/result/Common.tsx"),"utf8");
 const bazi=fs.readFileSync(path.join(root,"web-spa/src/fortune/result/BaZiTabs.tsx"),"utf8");
 const tarot=fs.readFileSync(path.join(root,"web-spa/src/fortune/result/TarotTabs.tsx"),"utf8");
 const vedic=fs.readFileSync(path.join(root,"web-spa/src/fortune/result/VedicTabs.tsx"),"utf8");
 assert.ok(!layout.includes("/fortune/live"),"Fortune primary tabs should be data/history only");
 assert.ok(!home.includes("/fortune/live"),"Fortune home should not promote Live");
 assert.ok(!home.includes("開始對話"),"Fortune home should not lead with teacher chat");
 assert.ok(reading.includes("想再問清楚一點？"),"Live help should stay collapsed behind a follow-up affordance");
 assert.ok(reading.includes("/fortune/live?from=reading"),"the optional result follow-up should still exist");
 assert.ok(!common.includes("問老師"),"topic evidence cards should remain data-only");
 for(const source of [bazi,tarot,vedic]){
  assert.ok(!source.includes("onAsk"),"result timelines should not route individual facts into Live");
  assert.ok(!source.includes("問老師"),"result tabs should not promote Live");
 }
});


test("Story Player narration is Gemini Live, not browser speechSynthesis",()=>{
 const reader=fs.readFileSync(path.join(root,"web-spa/src/story/ReaderPage.tsx"),"utf8");
 const player=fs.readFileSync(path.join(root,"web-spa/src/story/player/StoryPlayerView.tsx"),"utf8");
 const narrator=fs.readFileSync(path.join(root,"web-spa/src/story/player/useStoryNarrator.ts"),"utf8");
 const prompt=fs.readFileSync(path.join(root,"web-spa/src/story/player/narration.ts"),"utf8");
 assert.ok(reader.includes("StoryPlayerView"));
 assert.ok(player.includes("useStoryNarrator"));
 assert.ok(narrator.includes("useLiveSession"));
 assert.ok(narrator.includes("sendPreparedImage"));
 assert.ok(narrator.includes("sendText"));
 assert.ok(prompt.includes("turnComplete 自動翻到下一頁"));
 assert.ok(prompt.includes("不要主動停下來等孩子回答"));
 assert.ok(narrator.includes("onTurnComplete"));
 assert.ok(narrator.includes('book.readingMode==="physical"'));
 assert.ok(narrator.includes('live.state!=="listening"'));
 assert.ok(narrator.includes("pendingAdvanceRef"));
 assert.ok(narrator.includes("650"));
 assert.ok(player.includes("handlePageAdvance"));
 assert.ok(!reader.includes("speechSynthesis"));
 assert.ok(!player.includes("speechSynthesis"));
 assert.ok(!reader.includes("SpeechSynthesisUtterance"));
 assert.ok(!player.includes("SpeechSynthesisUtterance"));
});


test("published Android apps expose verified Google Play links while Fortune stays unpublished",()=>{
 const component=fs.readFileSync(path.join(root,"web-spa/src/components/PlayStoreLink.tsx"),"utf8");
 const home=fs.readFileSync(path.join(root,"web-spa/src/pages/HomePage.tsx"),"utf8");
 const teacher=fs.readFileSync(path.join(root,"web-spa/src/teacher/MyPage.tsx"),"utf8");
 const story=fs.readFileSync(path.join(root,"web-spa/src/story/MyPage.tsx"),"utf8");
 const fortuneHome=fs.readFileSync(path.join(root,"web-spa/src/fortune/HomePage.tsx"),"utf8");
 const fortuneLayout=fs.readFileSync(path.join(root,"web-spa/src/fortune/FortuneLayout.tsx"),"utf8");
 assert.ok(component.includes("id=com.crewpocket.teacher"));
 assert.ok(component.includes("id=com.crewpocket.story"));
 assert.ok(!component.includes("com.crewpocket.fortune"));
 assert.ok(home.includes('product="teacher"'));
 assert.ok(home.includes('product="story"'));
 assert.ok(home.includes('product="fortune"'));
 assert.ok(teacher.includes('product="teacher"'));
 assert.ok(story.includes('product="story"'));
 assert.ok(!fortuneHome.includes("PlayStoreLink"));
 assert.ok(!fortuneLayout.includes("PlayStoreLink"));
});


test("Teacher and Story expose Google Play links while Fortune stays unlisted",()=>{
 const play=fs.readFileSync(path.join(root,"web-spa/src/components/PlayStoreLink.tsx"),"utf8");
 const home=fs.readFileSync(path.join(root,"web-spa/src/pages/HomePage.tsx"),"utf8");
 const teacher=fs.readFileSync(path.join(root,"web-spa/src/teacher/MyPage.tsx"),"utf8");
 const story=fs.readFileSync(path.join(root,"web-spa/src/story/MyPage.tsx"),"utf8");
 const fortuneHome=fs.readFileSync(path.join(root,"web-spa/src/fortune/HomePage.tsx"),"utf8");
 const fortuneLayout=fs.readFileSync(path.join(root,"web-spa/src/fortune/FortuneLayout.tsx"),"utf8");
 assert.ok(play.includes("com.crewpocket.teacher"));
 assert.ok(play.includes("com.crewpocket.story"));
 assert.ok(home.includes('PlayStoreLink product="teacher"'));
 assert.ok(home.includes('PlayStoreLink product="story"'));
 assert.ok(home.includes('PlayStoreLink product="fortune"'));
 assert.ok(teacher.includes('PlayStoreLink product="teacher"'));
 assert.ok(story.includes('PlayStoreLink product="story"'));
 assert.ok(!play.includes("com.crewpocket.fortune"),"Fortune is not published on Google Play yet");
 assert.ok(!fortuneHome.includes("PlayStoreLink"));
 assert.ok(!fortuneLayout.includes("PlayStoreLink"));
});

test("Crew Web hides root and nested scrollbar chrome without disabling scrolling",()=>{
 const styles=fs.readFileSync(path.join(root,"web-spa/src/styles.css"),"utf8");
 const legacy=fs.readFileSync(path.join(root,"crew.css"),"utf8");
 for(const source of [styles,legacy]){
  assert.ok(source.includes("scrollbar-width:none!important"));
  assert.ok(source.includes("-ms-overflow-style:none!important"));
  assert.ok(source.includes("scrollbar-gutter:auto!important"));
  assert.ok(source.includes("html::-webkit-scrollbar"));
  assert.ok(source.includes("body::-webkit-scrollbar"));
  assert.ok(source.includes("#root::-webkit-scrollbar"));
  assert.ok(source.includes("width:0!important"));
  assert.ok(source.includes("height:0!important"));
  assert.ok(source.includes("background:transparent!important"));
 }
 assert.ok(styles.includes("overflow:auto")||styles.includes("overflow-x:auto"),"SPA must keep scrollable surfaces");
 assert.ok(legacy.includes("overflow:auto")||legacy.includes("overflow-x:auto"),"legacy surfaces must keep scrolling enabled");
});


test("Google Play cards visibly name the app instead of only the store",()=>{
 const play=fs.readFileSync(path.join(root,"web-spa/src/components/PlayStoreLink.tsx"),"utf8");
 assert.ok(play.includes("<strong>{app.name}</strong>"));
 assert.ok(play.includes("Crew Teacher"));
 assert.ok(play.includes("Crew Story"));
 assert.ok(play.includes("Crew Fortune"));
 assert.ok(play.includes("COMING SOON"));
 assert.ok(play.includes("GET IT ON Google Play"));
 assert.ok(!play.includes("<strong>Google Play</strong>"),"Google Play should not be the primary card title");
});


test("core Web entry points follow the Android app parity contract",()=>{
 const teacher=fs.readFileSync(path.join(root,"web-spa/src/teacher/PracticePage.tsx"),"utf8");
 const teacherTutor=fs.readFileSync(path.join(root,"web-spa/src/teacher/PracticeTutorStrip.tsx"),"utf8");
 const teacherNext=fs.readFileSync(path.join(root,"web-spa/src/teacher/ContinueLearningCard.tsx"),"utf8");
 const story=fs.readFileSync(path.join(root,"web-spa/src/story/ShelfPage.tsx"),"utf8");
 const storyMy=fs.readFileSync(path.join(root,"web-spa/src/story/MyPage.tsx"),"utf8");
 const fortune=fs.readFileSync(path.join(root,"web-spa/src/fortune/HomePage.tsx"),"utf8");
 const fortuneLayout=fs.readFileSync(path.join(root,"web-spa/src/fortune/FortuneLayout.tsx"),"utf8");

 for(const label of ["今天想學點什麼？","和老師練習","跟老師聊","教材陪讀","單字練習","情境課程","今天","學習紀錄"])assert.ok(teacher.includes(label));
 assert.ok(teacherTutor.includes("目前老師"));
 assert.ok(teacherNext.includes("今天下一步"));
 assert.ok(teacherNext.includes("buildDailyLearningPlan"));

 for(const label of ["今天想讀什麼故事？","和阿奇一起創作、閱讀，或拿起手邊的故事書。","最近讀到這本","創作故事","實體書陪讀","我的故事","探索故事"])assert.ok(story.includes(label));
 assert.ok(storyMy.includes("BUILT_IN_STORIES.length"),"Story included count must come from the actual catalog");
 assert.ok(!story.includes("和 APK 一樣"));
 assert.ok(!storyMy.includes("和 APK"));

 for(const label of ["從不同角度","看懂自己的節奏。","選一種方式","性格 · 工作 · 財運 · 大運","核心性格 · 人生主題","人生週期 · 行星 · Dasha","最近解讀"])assert.ok(fortune.includes(label));
 assert.ok(fortuneLayout.includes('to="/fortune/history"'));
 assert.ok(!fortuneLayout.includes("ProductTabs"),"Fortune history should be a header action like Android, not a primary tab");
});


test("Teacher Web mirrors app learning deck reports and reading library",()=>{
 const app=fs.readFileSync(path.join(root,"web-spa/src/App.tsx"),"utf8");
 const mine=fs.readFileSync(path.join(root,"web-spa/src/teacher/MyPage.tsx"),"utf8");
 const deck=fs.readFileSync(path.join(root,"web-spa/src/teacher/learningDeck.ts"),"utf8");
 const phrasebook=fs.readFileSync(path.join(root,"web-spa/src/teacher/PhrasebookPage.tsx"),"utf8");
 const reports=fs.readFileSync(path.join(root,"web-spa/src/teacher/ReportsPage.tsx"),"utf8");
 const library=fs.readFileSync(path.join(root,"web-spa/src/teacher/readingLibrary.ts"),"utf8");
 const pronunciation=fs.readFileSync(path.join(root,"web-spa/src/teacher/PronunciationPage.tsx"),"utf8");
 for(const route of ["phrasebook","reports","reading-library"])assert.ok(app.includes(route));
 for(const label of ["收藏片語","練習報告","閱讀素材庫"])assert.ok(mine.includes(label));
 assert.ok(deck.includes("saveReportLearning"));
 assert.ok(deck.includes("nextReviewAt"));
 assert.ok(phrasebook.includes("我複習過了"));
 assert.ok(reports.includes("道地修正"));
 assert.ok(reports.includes("帶走的表達"));
 assert.ok(library.includes("classic_aesop_north_wind"));
 assert.ok(library.includes("classic_twain_river"));
 assert.ok(pronunciation.includes("CLASSIC_READING_LIBRARY"));
});

test("Fortune Web mirrors app profile presets birth-place search and year highlights",()=>{
 const reading=fs.readFileSync(path.join(root,"web-spa/src/fortune/ReadingPage.tsx"),"utf8");
 const profile=fs.readFileSync(path.join(root,"web-spa/src/fortune/profileStore.ts"),"utf8");
 const place=fs.readFileSync(path.join(root,"web-spa/src/fortune/birthPlaceSearch.ts"),"utf8");
 const highlights=fs.readFileSync(path.join(root,"web-spa/src/fortune/yearHighlights.ts"),"utf8");
 const tools=fs.readFileSync(path.join(root,"web-spa/src/fortune/ProfileTools.tsx"),"utf8");
 assert.ok(reading.includes("FortuneProfileTools"));
 assert.ok(reading.includes("FortuneYearHighlights"));
 assert.ok(profile.includes("crew_fortune_presets_v1"));
 assert.ok(profile.includes("presetKey"));
 assert.ok(place.includes("https://geocoding-api.open-meteo.com/v1/search"));
 assert.ok(place.includes("utcOffsetForBirth"));
 assert.ok(tools.includes("儲存常用資料"));
 assert.ok(tools.includes("選擇常用資料"));
 for(const token of ["wealthProfile","careerProfile","relationshipProfile","personalYearTimeline","majorTransitTimeline","mahadashaTimeline"])assert.ok(highlights.includes(token));
});

test("Story Player keeps in-session interaction history like the app player",()=>{
 const player=fs.readFileSync(path.join(root,"web-spa/src/story/player/StoryPlayerView.tsx"),"utf8");
 assert.ok(player.includes("互動紀錄"));
 assert.ok(player.includes("live.turns"));
 assert.ok(player.includes("阿奇"));
});


test("Teacher Web mirrors Android authored course map and daily coordinator",()=>{
 const catalog=fs.readFileSync(path.join(root,"web-spa/src/teacher/courseCatalog.ts"),"utf8");
 const catalogData=["courseCatalogTravel.ts","courseCatalogBusiness.ts","courseCatalogDaily.ts"].map(file=>fs.readFileSync(path.join(root,"web-spa/src/teacher",file),"utf8")).join("\n");
 const course=fs.readFileSync(path.join(root,"web-spa/src/teacher/CoursePage.tsx"),"utf8");
 const live=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 const coordinator=fs.readFileSync(path.join(root,"web-spa/src/teacher/learningCoordinator.ts"),"utf8");
 const practice=fs.readFileSync(path.join(root,"web-spa/src/teacher/PracticePage.tsx"),"utf8");
 assert.equal((catalogData.match(/"id": "(?:travel|biz|daily)_u\d_l\d"/g)||[]).length,31);
 assert.ok(catalog.includes("TRAVEL_COURSE_LESSONS"));
 assert.ok(course.includes("COURSE_TRACKS"));
 assert.ok(course.includes("lessonUnlocked"));
 assert.ok(course.includes("31 堂課"));
 assert.ok(live.includes("scoreCourseSession"));
 assert.ok(live.includes("saveLessonProgress"));
 assert.ok(practice.includes("ContinueLearningCard"));
 assert.ok(!practice.includes("PracticeTutorStrip"));
 const textbookIndex=coordinator.indexOf('action:"textbook"');
 const vocabIndex=coordinator.indexOf('action:"vocabulary"');
 const courseIndex=coordinator.indexOf('action:"course"');
 const conversationIndex=coordinator.indexOf('action:"conversation"');
 assert.ok(textbookIndex>=0&&textbookIndex<vocabIndex&&vocabIndex<courseIndex&&courseIndex<conversationIndex);
});

test("Teacher vocabulary uses spaced review recovery and date-aware progress",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/teacher/VocabularyPage.tsx"),"utf8");
 const progress=fs.readFileSync(path.join(root,"web-spa/src/teacher/vocabularyProgress.ts"),"utf8");
 const queue=fs.readFileSync(path.join(root,"web-spa/src/teacher/vocabularyQueue.ts"),"utf8");
 assert.ok(page.includes("recordVocab"));
 assert.ok(page.includes("incrementTodayVocabulary"));
 assert.ok(progress.includes("nextReviewAt"));
 for(const days of ["return 7","return 14","return 30","return 60","return 120"])assert.ok(progress.includes(days));
 assert.ok(queue.includes("slot%10"));
 assert.ok(queue.includes("flowRecovery"));
});

test("Teacher Web keeps Android course progress alongside existing reports and phrasebook",()=>{
 const mine=fs.readFileSync(path.join(root,"web-spa/src/teacher/MyPage.tsx"),"utf8");
 const textbook=fs.readFileSync(path.join(root,"web-spa/src/teacher/TextbookPage.tsx"),"utf8");
 for(const token of ["completedLessons","totalStars","learningDeck","reading-library"])assert.ok(mine.includes(token));
 assert.ok(textbook.includes("completeMaterial"));
 assert.ok(textbook.includes("CrewTextbookStore?.remove"));
 assert.ok(textbook.includes("完成教材"));
});


test("Teacher Live follows latest Android tutor portrait hierarchy",()=>{
 const live=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 const strip=fs.readFileSync(path.join(root,"web-spa/src/teacher/PracticeTutorStrip.tsx"),"utf8");
 const picker=fs.readFileSync(path.join(root,"web-spa/src/teacher/TeacherProfilePicker.tsx"),"utf8");
 const styles=fs.readFileSync(path.join(root,"web-spa/src/styles.css"),"utf8");
 assert.ok(!live.includes("live-header-avatar"),"Live header should not duplicate the tutor portrait");
 assert.ok(live.includes("teacher-presence"));
 assert.ok(live.includes("presenceState"));
 assert.ok(strip.includes("profile.bestFor"));
 assert.ok(strip.includes("更換 ›"));
 assert.ok(picker.includes("profile.bestFor"));
 assert.ok(styles.includes("teacher-presence-speaking"));
 assert.ok(styles.includes(".teacher-profile-option img,.teacher-profile-image{width:68px;height:68px;object-fit:cover;border-radius:50%}"));
});


test("Story and Fortune reuse one Web Gemini setup flow while preserving Android semantics",()=>{
 const notice=fs.readFileSync(path.join(root,"web-spa/src/components/GeminiSetupNotice.tsx"),"utf8");
 const settings=fs.readFileSync(path.join(root,"web-spa/src/pages/SettingsPage.tsx"),"utf8");
 const story=fs.readFileSync(path.join(root,"web-spa/src/story/MyPage.tsx"),"utf8");
 const fortune=fs.readFileSync(path.join(root,"web-spa/src/fortune/HomePage.tsx"),"utf8");
 assert.ok(story.includes('GeminiSetupNotice product="story"'));
 assert.ok(fortune.includes('GeminiSetupNotice product="fortune"'));
 assert.ok(notice.includes("故事創作、實體書陪讀與 AI 功能需要 Key"));
 assert.ok(notice.includes("命盤計算與基本結果不需要 Key"));
 assert.ok(notice.includes("AI 解讀與老師對話才需要"));
 assert.ok(settings.includes("https://aistudio.google.com/apikey"));
 assert.ok(settings.includes("Google 專案管理"));
 assert.ok(!story.includes("aistudio.google.com"),"product pages should reuse the shared setup flow");
 assert.ok(!fortune.includes("aistudio.google.com"),"product pages should reuse the shared setup flow");
});


test("Teacher Web uses Android HQ portrait sprite through one shared avatar component",()=>{
 const avatar=fs.readFileSync(path.join(root,"web-spa/src/teacher/TeacherAvatar.tsx"),"utf8");
 const tutor=fs.readFileSync(path.join(root,"web-spa/src/teacher/TutorPage.tsx"),"utf8");
 const picker=fs.readFileSync(path.join(root,"web-spa/src/teacher/TeacherProfilePicker.tsx"),"utf8");
 const live=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 assert.ok(fs.existsSync(path.join(root,"assets/teacher/teacher-portraits-hq.webp")));
 assert.ok(avatar.includes("/assets/teacher/teacher-portraits-hq.webp"));
 for(const id of ["emma","alex","james","mia"])assert.ok(avatar.includes(id+':"'));
 for(const source of [tutor,picker,live])assert.ok(source.includes("TeacherAvatar"));
 assert.ok(tutor.includes("推薦聲音"));
 assert.ok(!tutor.includes("Callisto"));
 assert.ok(!tutor.includes("Europa"));
});


test("home page explains product value and guides Gemini setup",()=>{
 const home=fs.readFileSync(path.join(root,"web-spa/src/pages/HomePage.tsx"),"utf8");
 assert.ok(home.includes("語言陪讀、說故事、命盤解讀"));
 assert.ok(home.includes("用自己的 Gemini Key"));
 assert.ok(home.includes("先花 1 分鐘設定 Gemini Key"));
 assert.ok(home.includes("geminiKey()"));
 assert.ok(!home.includes("切換不再重新載入不同頁面"));
 assert.ok(home.includes("從第一件事開始"));
});

test("mobile chrome keeps key actions reachable and Fortune header actions grouped",()=>{
 const chrome=fs.readFileSync(path.join(root,"web-spa/src/components/AppChrome.tsx"),"utf8");
 const styles=fs.readFileSync(path.join(root,"web-spa/src/styles.css"),"utf8");
 assert.ok(chrome.includes("app-header-actions"));
 assert.ok(styles.includes("padding-bottom:calc(var(--nav-h) + 34px + env(safe-area-inset-bottom))"));
 assert.ok(styles.includes(".fortune-header-history"));
 assert.ok(styles.includes("min-height:44px"));
 assert.ok(styles.includes(".fortune-result-tabs button"));
 assert.ok(styles.includes(".btn.small"));
});

test("wide desktop layout uses a side rail instead of a stretched phone nav",()=>{
 const styles=fs.readFileSync(path.join(root,"web-spa/src/styles.css"),"utf8");
 assert.ok(styles.includes("@media(min-width:1100px)"));
 assert.ok(styles.includes("width:min(1040px,calc(100% - 200px))"));
 assert.ok(styles.includes(".global-nav{left:18px;right:auto;top:88px;bottom:auto"));
});

test("Crew source does not ship SOLVING debug markers",()=>{
 const sourceFiles=[
  ...files(path.join(root,"web-spa","src"),".ts"),
  ...files(path.join(root,"web-spa","src"),".tsx"),
  ...files(path.join(root,"features"),".js"),
  path.join(root,"crew-live.js")
 ];
 for(const file of sourceFiles){
  const source=fs.readFileSync(file,"utf8");
  assert.ok(!source.includes("SOLVING"),path.relative(root,file)+" should not contain SOLVING debug output");
 }
});


test("Crew Web hides implementation details from primary product UI",()=>{
 const settings=fs.readFileSync(path.join(root,"web-spa/src/pages/SettingsPage.tsx"),"utf8");
 const tutor=fs.readFileSync(path.join(root,"web-spa/src/teacher/TutorPage.tsx"),"utf8");
 const live=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 const textbook=fs.readFileSync(path.join(root,"web-spa/src/teacher/TextbookPage.tsx"),"utf8");
 const player=fs.readFileSync(path.join(root,"web-spa/src/story/player/StoryPlayerView.tsx"),"utf8");
 assert.ok(settings.includes("連線診斷"));
 assert.ok(settings.includes("只有語音連線異常時才需要查看"));
 assert.ok(!tutor.includes("VOICES"));
 assert.ok(!live.includes("VOICES"));
 assert.ok(!tutor.includes("老師音色"));
 assert.ok(!live.includes("老師音色"));
 assert.ok(textbook.includes("教材已準備好"));
 assert.ok(!player.includes("Live Story Player"));
 assert.ok(!player.includes("Gemini Live 阿奇負責"));
});

test("Crew home distinguishes Web entry from Android app availability",()=>{
 const home=fs.readFileSync(path.join(root,"web-spa/src/pages/HomePage.tsx"),"utf8");
 const play=fs.readFileSync(path.join(root,"web-spa/src/components/PlayStoreLink.tsx"),"utf8");
 assert.ok(home.includes("一個入口搞定"));
 assert.ok(!home.includes("一個 App 搞定"));
 assert.ok(home.includes('product="fortune"'));
 assert.ok(play.includes("Google Play 準備中"));
 assert.ok(play.includes("url:null"));
 assert.ok(!play.includes("com.crewpocket.fortune"));
});


test("Story Web mirrors Android playback state UX",()=>{
 const player=fs.readFileSync(path.join(root,"web-spa/src/story/player/StoryPlayerView.tsx"),"utf8");
 const narrator=fs.readFileSync(path.join(root,"web-spa/src/story/player/useStoryNarrator.ts"),"utf8");
 assert.ok(player.includes('if(finished)return"再聽一次"'));
 assert.ok(player.includes('if(paused)return"繼續"'));
 assert.ok(player.includes('if(state==="speaking"||state==="listening")return"暫停"'));
 assert.ok(player.includes("想插話時按一下，阿奇會停下來聽你說。"));
 assert.ok(player.includes("story-player-more-controls"));
 assert.ok(!player.includes("▶ 繼續本頁"));
 assert.ok(narrator.includes('if(live.state!=="listening"||pausedRef.current)return'));
 assert.ok(narrator.includes("pendingFinishRef"));
 assert.ok(narrator.includes("window.setTimeout"));
});


test("Crew Web recent activity resumes real product state and keeps secondary controls secondary",()=>{
 const home=fs.readFileSync(path.join(root,"web-spa/src/pages/HomePage.tsx"),"utf8");
 const chrome=fs.readFileSync(path.join(root,"web-spa/src/components/AppChrome.tsx"),"utf8");
 const player=fs.readFileSync(path.join(root,"web-spa/src/story/player/StoryPlayerView.tsx"),"utf8");
 const settings=fs.readFileSync(path.join(root,"web-spa/src/pages/SettingsPage.tsx"),"utf8");
 const fortune=fs.readFileSync(path.join(root,"web-spa/src/fortune/ReadingPage.tsx"),"utf8");
 assert.ok(home.includes("/teacher/live?history="));
 assert.ok(home.includes("?page="));
 assert.ok(home.indexOf("繼續上次")<home.indexOf("Android 版"));
 assert.ok(!chrome.includes('<span className="nav-icon"><Icon name="settings"/></span>'));
 assert.ok(player.includes("story-page-progress"));
 assert.ok(player.includes("<summary>更多</summary>"));
 assert.ok(!player.includes("story-page-slider"));
 assert.ok(settings.includes("儲存並測試"));
 assert.ok(settings.includes("進階與清除"));
 assert.ok(fortune.includes('surface:"reading"'));
});


test("Live product polish keeps one focal character and secondary tools collapsed",()=>{
 const teacher=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 const story=fs.readFileSync(path.join(root,"web-spa/src/story/LivePage.tsx"),"utf8");
 const controls=fs.readFileSync(path.join(root,"web-spa/src/live/LiveControls.tsx"),"utf8");
 const settings=fs.readFileSync(path.join(root,"web-spa/src/pages/SettingsPage.tsx"),"utf8");
 const shelf=fs.readFileSync(path.join(root,"web-spa/src/story/ShelfPage.tsx"),"utf8");
 const learn=fs.readFileSync(path.join(root,"web-spa/src/teacher/LearnPage.tsx"),"utf8");
 const vedic=fs.readFileSync(path.join(root,"web-spa/src/fortune/result/VedicTabs.tsx"),"utf8");
 assert.ok(teacher.includes("teacher-live-avatar"));
 assert.ok(teacher.includes("TeacherAvatar profile={profile}"));
 assert.ok(!teacher.includes('<section className="session-person">'));
 assert.ok(!teacher.includes('<div className="live-orb"><span>{profile.name.slice(0,1)}</span></div>'));
 assert.ok(story.includes("story-live-avatar"));
 assert.ok(!story.includes('<section className="session-person">'));
 assert.ok(teacher.includes("<summary>更多功能</summary>"));
 assert.ok(story.includes("<summary>更多功能</summary>"));
 assert.ok(controls.includes("live-audio-settings"));
 assert.ok(settings.includes("Gemini 已連線"));
 assert.ok(settings.includes("重新設定"));
 assert.ok(settings.includes("showSetup"));
 assert.ok(shelf.includes("story-book-open"));
 assert.ok(shelf.includes("story-book-menu"));
 assert.ok(!learn.includes("與 App 同步"));
 assert.ok(!learn.includes("3 個 Track"));
 assert.ok(vedic.includes("目前大章節"));
 assert.ok(vedic.includes("出生星宿、行星、宮位與完整週期都保留在"));
});
