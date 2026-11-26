const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const locales=['de','en','es','fr','id','ja','ko','pt-BR','th','vi','zh-TW'];
const originalSubtitles={
 de:'Sag einfach Hallo.',en:'Say hello to begin.',es:'Empieza con un hola.',
 fr:'Commence par bonjour.',id:'Mulai dengan halo.',ja:'まずはあいさつから。',
 ko:'인사부터 시작해요.', 'pt-BR':'Comece com um oi.',th:'เริ่มด้วยคำทักทาย',
 vi:'Chào một câu là đủ.','zh-TW':'打個招呼就開始。'
};
// Approximate the actual 23px/22px bold, tightly tracked hero text budget.
// Combining accents (including Thai upper/lower marks) occupy no extra advance.
function estimateEm(str){
 return [...str.normalize('NFC')].reduce((sum,char)=>{
  const code=char.codePointAt(0);
  if(/\p{Mark}/u.test(char))return sum;
  if(/\s/u.test(char))return sum+.26;
  if(/[\p{P}\p{S}]/u.test(char))return sum+.34;
  if((code>=0x3400&&code<=0x9fff)||(code>=0x3040&&code<=0x30ff)||(code>=0xac00&&code<=0xd7af))return sum+1;
  if(code>=0x0e00&&code<=0x0e7f)return sum+.58;
  if(char==='W'||char==='M'||/\p{Lu}/u.test(char))return sum+.72;
  if(/[iljtfr]/u.test(char))return sum+.34;
  return sum+.58;
 },0);
}

test('all 11 mobile hero headlines fit one line and retain each subtitle',()=>{
 for(const locale of locales){
  const dict=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/home.json`));
  const {title,subtitle}=dict.mobileHero;
  assert.equal(typeof title,'string',`${locale} title must be a string`);
  assert.ok(title.trim(),`${locale} title must not be empty`);
  assert.ok(estimateEm(title)<=7.2+1e-9,`${locale}: ${title} estimates ${estimateEm(title).toFixed(2)}em (>7.2em)`);
  assert.equal(subtitle,originalSubtitles[locale],`${locale} subtitle changed unexpectedly`);
 }
 const zh=JSON.parse(read('web-spa/src/i18n/locales/zh-TW/home.json'));
 assert.equal(zh.mobileHero.title,'一起玩著學語言');
});

test('mobile hero defines responsive headline styling without pinning exact CSS formatting',()=>{
 const css=read('web-spa/src/pages/mobileHomeHeroV3.css');
 const headings=[...css.matchAll(/\\.cmh-slide(?:\\s+\\.cmh-slide-copy)?\\s+h1\\s*\\{([^}]*)\\}/g)];
 assert.ok(headings.length,'hero heading selector must exist');
 const finalHeading=headings.at(-1)[1];
 const font=finalHeading.match(/font-size:\\s*(\\d+)px/);
 assert.ok(font,'hero heading must set a concrete mobile font size');
 assert.ok(Number(font[1])>=12&&Number(font[1])<=26,'effective phone heading must remain legible without overflowing');
 assert.match(css,/@media\\s*\\(max-width:\\s*380px\\)/,'small phone override must exist');
 const zh=JSON.parse(read('web-spa/src/i18n/locales/zh-TW/home.json'));
 assert.equal(typeof zh.layout2?.resumeTitle,'string');
});

test('section hub main headings are 24px on phones; chat remains 24px',()=>{
 const css=read('web-spa/src/pages/crewSections.css');
 assert.match(css,/@media\(max-width:430px\)\{\s*\.crew-section-hub\{[^}]+\}\s*\.crew-section-heading h1\{font-size:24px\}/);
 assert.doesNotMatch(css,/\.crew-section-heading h1\{font-size:30px\}/);
 assert.match(css,/@media\(max-width:700px\)\{\s*\.crew-section-chat\{[^}]+\}\s*\.crew-section-chat \.crew-section-heading h1\{font-size:24px\}/);
});

test('shared hero title is 24px for 360/390 and desktop clamp is preserved',()=>{
 const css=read('features/shared/design-system.css');
 assert.match(css,/\.hero h1\{font-size:clamp\(30px,7vw,44px\)/);
 const match=css.match(/@media\(max-width:(\d+)px\)\{\.hero h1\{font-size:(\d+)px;/);
 assert.ok(match,'must have a mobile hero h1 override');
 const breakpoint=Number(match[1]),value=Number(match[2]);
 assert.ok(breakpoint>=390&&breakpoint<=700,'phone rule must cover 390px and preserve >=768px');
 for(const width of [360,390])assert.ok(width<=breakpoint&&value<=26,`${width}px title exceeds 26px`);
 assert.equal(value,24);
});

test('explore and SEO guide headings shrink on phones only',()=>{
 const explore=read('web-spa/src/pages/crewExplore.css');
 const guide=read('web-spa/src/guides/guides.css');
 const m=explore.match(/\.crew-section-explore \.crew-section-heading h1\{font-size:clamp\((\d+)px,4\.5vw,40px\)\}/);
 assert.ok(m,'explore headline keeps the original desktop clamp ceiling');
 assert.equal(Number(m[1]),26);
 for(const width of [360,390])assert.ok(Math.max(Number(m[1]),Math.min(width*.045,40))<=26);
 assert.match(guide,/\.crew-guide-hero h1\{font-size:clamp\(29px,4\.2vw,49px\)/);
 const mobile=guide.match(/@media\(max-width:560px\)\{[\s\S]*?\.crew-guide-hero h1\{font-size:(\d+)px;line-height:([\d.]+)\}/);
 assert.ok(mobile,'mobile-specific guide title is required');
 assert.ok(Number(mobile[1])>=24&&Number(mobile[1])<=26);
 assert.ok(Number(mobile[2])>=1.2&&Number(mobile[2])<=1.25);
});

test('course track chips retain 44px targets, horizontal scroll and full common labels',()=>{
 const css=read('web-spa/src/teacher/learningFlow.css');
 assert.match(css,/\.crew-course-track-tabs\{display:flex;[^}]*overflow-x:auto/);
 assert.match(css,/\.crew-course-track-tabs button\{[^}]*min-height:44px/);
 assert.match(css,/@media\(max-width:480px\)\{[\s\S]*?\.crew-course-track-tabs button\{max-width:220px\}/);
 assert.doesNotMatch(css,/\.crew-course-track-tabs strong\{max-width:99px\}/);
 assert.match(css,/\.crew-course-track-tabs strong\{font-size:12px;/);
});

test('all edited CSS files keep font-size declarations at least 12px',()=>{
 for(const file of [
  'features/shared/design-system.css',
  'web-spa/src/pages/crewSections.css',
  'web-spa/src/pages/crewExplore.css',
  'web-spa/src/guides/guides.css',
  'web-spa/src/teacher/learningFlow.css'
 ]){
  const css=read(file);
  for(const match of css.matchAll(/font-size\s*:\s*(?:clamp\()?\s*(\d+(?:\.\d+)?)px/g)){
   assert.ok(Number(match[1])>=12,`${file} has font-size ${match[1]}px below the 12px floor`);
  }
 }
});
