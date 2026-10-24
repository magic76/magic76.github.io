const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
function read(file){return fs.readFileSync(path.join(root,file),"utf8")}

test("Mandarin pinyin dictionary is pinned in both manifests",()=>{
 const manifest=JSON.parse(read("package.json"));
 const lock=JSON.parse(read("package-lock.json"));
 assert.equal(manifest.dependencies["pinyin-pro"],"3.29.5");
 assert.equal(lock.packages[""].dependencies["pinyin-pro"],"3.29.5");
 assert.equal(lock.packages["node_modules/pinyin-pro"].version,"3.29.5");
});

test("Mandarin pinyin includes tone marks, with simplified and traditional input",async()=>{
 const {pinyin}=await import("pinyin-pro");
 const opt={type:"string",toneType:"symbol",nonZh:"removed"};
 assert.equal(pinyin("你好",opt),"nǐ hǎo");
 assert.equal(pinyin("中文",opt),"zhōng wén");
 assert.equal(pinyin("學習",opt),"xué xí");
});

test("Mandarin aid is only attached to teacher reply displays",()=>{
 const files=[
  "web-spa/src/teacher/LivePage.tsx",
  "web-spa/src/live/TextChatPanel.tsx",
  "web-spa/src/components/DesktopLivePanel.tsx",
  "web-spa/src/teacher/BoardTutorPanel.tsx"
 ];
 for(const file of files)assert.match(read(file),/PinyinHint/,file);
 assert.match(read("web-spa/src/teacher/TutorPage.tsx"),/setPronunciationAidMode/);
 assert.match(read("web-spa/src/teacher/TeacherLiveTools.tsx"),/setPronunciationAidMode/);
 assert.match(read("web-spa/src/store/teacherStore.ts"),/pronunciationAidMode:normalizePinyinAidMode/);
 assert.match(read("web-spa/src/teacher/PinyinHint.tsx"),/isMandarinTarget\(targetLanguage\)/);
});
