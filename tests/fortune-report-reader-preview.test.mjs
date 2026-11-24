import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {reportLabHtml} from "../server/koolo-fortune-lab-html.mjs";
import {labPartPrompt,normalizeLabFacts} from "../server/koolo-fortune-lab-core.mjs";

const source=readFileSync("assets/js/fortune-report-lab.js","utf8");
const html=reportLabHtml("nonce-for-test");

test("page-turn reader has 10 print-safe pages, controls, and a no-AI preview entry",()=>{
 assert.match(html,/id="preview"[^>]*>預覽新版命書（免 AI）/);
 assert.match(html,/id="readerNav"/);
 assert.match(html,/id="prevPage"/);
 assert.match(html,/id="nextPage"/);
 assert.match(html,/#report\.reader-open \.sheet\.is-active/);
 assert.match(html,/@media print\{/);
 assert.match(html,/\.sheet\.is-active,#report\.reader-open \.sheet\.is-leaving\{display:flex!important;position:relative!important/);
 assert.equal((html.match(/<article class="sheet(?: dark)?"/g)||[]).length,10);
 assert.doesNotMatch(html,/留給自己的一題|建議：每週做一件/);
 assert.match(html,/v=20261124-pageflip1/);
 assert.match(html,/touch-action:pan-y pinch-zoom/);
 assert.match(html,/overscroll-behavior-x:none/);
 assert.match(html,/overflow-x:clip/);
 assert.match(html,/#report\.reader-open \.sheet\{display:none;width:100%;max-width:100%;min-width:0/);
 assert.match(html,/backface-visibility:hidden/);
 assert.match(html,/transform-origin:left center/);
 assert.match(html,/\.sheet\.is-leaving\{[^}]*transform-origin:left center[^}]*animation:paper-turn-left/);
 assert.match(html,/@keyframes paper-turn-left/);
 assert.match(html,/rotateY\(-155deg\)/);
 assert.doesNotMatch(html,/transform-origin:right center|paper-turn-backward|paper-turn-forward|rotateY\(155deg\)/);
 assert.doesNotMatch(html,/data-direction="prev"[^}]*\.sheet\.is-leaving/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/id="flipBook" hidden/);
 assert.match(html,/\/assets\/vendor\/page-flip-2\.0\.7\/page-flip\.browser\.js/);
 assert.match(html,/#report\.reader-open\.flip-enhanced #bookPages\{display:none\}/);
 assert.match(source,/new window\.St\.PageFlip\(host/);
 assert.match(source,/readerFlip\.loadFromHTML\(leaves\)/);
 assert.match(source,/showCover:true,drawShadow:true/);
 assert.match(source,/flippingTime:850/);
 assert.match(source,/readerFlip\.flipNext\("bottom"\)/);
 assert.match(source,/readerFlip\.flipPrev\("bottom"\)/);
 assert.match(source,/copy\.querySelectorAll\("\[id\]"\)/);
 assert.match(source,/prefers-reduced-motion: reduce/);
 assert.match(readFileSync("scripts/prepare-cloudflare.mjs","utf8"),/page-flip-2\.0\.7/);
 assert.equal(JSON.parse(readFileSync("package.json","utf8")).dependencies["page-flip"],"2.0.7");
 assert.doesNotMatch(html,/page-turn-in|rotateY\(-3deg\)/);
});

test("mock preview instantly renders 10 pages without POST, Gemini, D1 writes or stored chart",async()=>{
 const listeners=new Map();
 let desktop=false,postCount=0,nonListReads=0,printed=0;
 const flipTasks=new Map();
 let nextTaskId=1;
 const startFlipTimer=(fn,ms)=>{assert.equal(ms,600);const id=nextTaskId++;flipTasks.set(id,fn);return id};
 const clearFlipTimer=id=>flipTasks.delete(id);
 const finishFlips=()=>{for(const [id,fn] of flipTasks){flipTasks.delete(id);fn()}};
 const make=(id="")=>({id,value:"",textContent:"",className:"",disabled:false,hidden:false,
  dataset:{},children:[],listeners:{},style:{setProperty(){}},
  addEventListener(type,fn){this.listeners[type]=fn},
  appendChild(item){this.children.push(item)},
  replaceChildren(...items){this.children=items},
  append(...items){this.children.push(...items)},
  setAttribute(key,value){this[key]=value}
 });
 const els=new Map();
 const pages=Array.from({length:10},(_,i)=>make("sheet-"+i));
 pages.forEach((p,i)=>{p.className=i===0||i===9?"sheet dark":"sheet"});
 const document={
  getElementById(id){if(!els.has(id))els.set(id,make(id));return els.get(id)},
  createElement(){return make()},
  querySelectorAll(selector){assert.equal(selector,"#bookPages .sheet");return pages}
 };
 const window={
  matchMedia:()=>({matches:desktop}),
  addEventListener(name,fn){listeners.set(name,fn)},
  scrollTo(){},print(){printed++},
  history:{replaceState(){}}
 };
 const fetch=async(path,options={})=>{
  if(options.method==="POST")postCount++;
  if(!path.includes("?list=1"))nonListReads++;
  return new Response(JSON.stringify({items:[]}),{status:200,headers:{"content-type":"application/json"}});
 };
 new Function("document","localStorage","location","window","fetch","crypto","console","setTimeout","clearTimeout",source)(
  document,{getItem(){return null}},
  {pathname:"/fortune/report-lab",hash:""},window,fetch,
  {randomUUID:()=>"11111111-2222-4333-8444-555555555555"},{error(){}},
  startFlipTimer,clearFlipTimer
 );
 els.get("preview").listeners.click();
 assert.equal(postCount,0,"preview must not call Gemini or create a D1 report");
 assert.equal(nonListReads,0,"preview must not load any private report");
 assert.equal(els.get("report").hidden,false);
 assert.match(els.get("meta").textContent,/示範預覽.*未呼叫 AI/);
 assert.match(els.get("preface").textContent,/你給人的第一印象/);
 assert.match(els.get("career").textContent,/你比較容易在/);
 assert.ok(els.get("letter").textContent.length>=150);
 assert.equal(els.get("pageCounter").textContent,"1 / 10");
 assert.equal(pages.filter(p=>p.className.includes("is-active")).length,1);
 assert.equal(pages[0].className.includes("is-active"),true);
 assert.equal(els.get("prevPage").disabled,true);
 els.get("nextPage").listeners.click();
 assert.equal(els.get("pageCounter").textContent,"2 / 10");
 assert.equal(pages[1].className.includes("is-active"),true);
 assert.equal(pages[0].className.includes("is-active"),false);
 assert.equal(pages[0].className.includes("is-leaving"),true,"old page hinges over incoming page");
 assert.equal(flipTasks.size,1);
 assert.equal(els.get("prevPage").disabled,false);
 const finger=els.get("bookPages").listeners;
 finger.touchstart({touches:[{clientX:240,clientY:220}]});
 finger.touchend({changedTouches:[{clientX:120,clientY:229}]});
 assert.equal(els.get("pageCounter").textContent,"3 / 10","left swipe turns forward");
 assert.equal(flipTasks.size,1,"rapid swipe cancels previous leaf cleanup");
 finger.touchstart({touches:[{clientX:110,clientY:220}]});
 finger.touchend({changedTouches:[{clientX:240,clientY:222}]});
 assert.equal(els.get("pageCounter").textContent,"2 / 10","right swipe turns backward");
 assert.equal(pages[2].className.includes("is-leaving"),true,"backward mobile navigation also animates the outgoing page");
 finger.touchstart({touches:[{clientX:130,clientY:80}]});
 finger.touchend({changedTouches:[{clientX:170,clientY:260}]});
 assert.equal(els.get("pageCounter").textContent,"2 / 10","vertical swipe must not turn pages");
 finger.touchstart({touches:[{clientX:240,clientY:180}]});
 finger.touchcancel();
 finger.touchend({changedTouches:[{clientX:30,clientY:180}]});
 assert.equal(els.get("pageCounter").textContent,"2 / 10","canceled touch must not flip");
 assert.equal(els.get("report").dataset.direction,"prev");
 finishFlips();
 assert.equal(pages.some(p=>p.className.includes("is-leaving")),false,"turn completes with no ghost page");
 let prevented=false;
 listeners.get("keydown")({key:"ArrowRight",preventDefault(){prevented=true},target:{tagName:"BODY"}});
 assert.equal(prevented,true);
 assert.equal(els.get("pageCounter").textContent,"3 / 10");
 assert.equal(els.get("report").dataset.direction,"next");
 desktop=true;listeners.get("resize")();
 assert.equal(els.get("pageCounter").textContent,"3–4 / 10");
 assert.equal(pages.filter(p=>p.className.includes("is-active")).length,2);
 finishFlips();
 els.get("nextPage").listeners.click();
 assert.equal(els.get("pageCounter").textContent,"5–6 / 10");
 assert.equal(pages[3].className.includes("is-leaving"),true,"desktop forward turns right-hand leaf");
 assert.equal(pages[2].className.includes("is-leaving"),false,"desktop left-hand leaf does not flip");
 finishFlips();
 els.get("prevPage").listeners.click();
 assert.equal(els.get("pageCounter").textContent,"3–4 / 10");
 assert.equal(pages[4].className.includes("is-leaving"),false,"desktop backward leaves the left-hand leaf in place");
 assert.equal(pages[5].className.includes("is-leaving"),true,"desktop backward also turns the right-hand leaf left");
 finishFlips();
 assert.equal(pages.some(p=>p.className.includes("is-leaving")),false);
 els.get("print").listeners.click();assert.equal(printed,1);
 assert.equal(postCount,0);
 for(const name of ["preface","personality","career","relationships","timing","letter","plan"]){
  assert.doesNotMatch(els.get(name).textContent,/[？?]/,"example "+name+" should not ask the reader questions");
 }
});

test("new Gemini prompt asks for character analysis, fewer terms, and no questions",()=>{
 const year=new Date(Date.now()+28800000).getUTCFullYear();
 const f=normalizeLabFacts({
  fourPillars:"甲子 乙丑 丙寅 丁卯",dayMaster:"丙",dayMasterElement:"火",strength:"中和",
  weighted:{"木":4,"火":3,"土":2,"金":1,"水":2},
  counts:{resource:3,output:1,officer:2,directWealth:1,indirectWealth:2},
  luck:{ganZhi:"庚午"},
  annual:[0,1,2].map((n)=>({year:year+n,ganZhi:["丙午","丁未","戊申"][n],themes:["學習"]})),
  relations:["子午 六沖"]
 });
 assert.ok(f);
 for(const part of ["preface","personality","career","relationships","timing","letter","plan"]){
  const p=labPartPrompt(f,part);
  assert.match(p,/日常白話/);
  assert.match(p,/直接以「你」描述/);
  assert.match(p,/不要羅列四柱、十神、五行權重/);
  assert.match(p,/不可寫讀者提問、反問句、問號/);
  assert.match(p,/不虛構|不要虛構/);
  assert.ok(p.length<1450);
 }
});
