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
 assert.match(html,/\.sheet\.is-active\{display:flex!important;position:relative!important/);
 assert.equal((html.match(/<article class="sheet(?: dark)?"/g)||[]).length,10);
 assert.doesNotMatch(html,/留給自己的一題|建議：每週做一件/);
 assert.match(html,/v=20261124-pageflip4/);
 assert.match(html,/touch-action:pan-y pinch-zoom/);
 assert.match(html,/overscroll-behavior-x:none/);
 assert.match(html,/overflow-x:clip/);
 assert.match(html,/#report\.reader-open \.sheet\{display:none;width:100%;max-width:100%;min-width:0/);
 assert.doesNotMatch(html,/paper-turn-left|paper-settle|rotateY\(-155deg\)/);
 assert.match(html,/id="flipBook" hidden/);
 assert.match(html,/\/assets\/vendor\/page-flip-2\.0\.7\/page-flip\.browser\.js/);
 assert.match(html,/#report\.reader-open\.flip-enhanced #bookPages\{display:none\}/);
 assert.match(source,/new window\.St\.PageFlip\(host/);
 assert.match(source,/readerFlip\.loadFromHTML\(leaves\)/);
 assert.match(source,/showCover:true,drawShadow:true/);
 assert.match(source,/flippingTime:850/);
 assert.match(source,/readerFlip\.flipNext\("bottom"\)/);
 assert.match(source,/readerFlip\.flipPrev\("bottom"\)/);
 assert.doesNotMatch(source,/readerFlip\.turnToPage\(spread.first-1\)/);
 assert.match(source,/useMouseEvents:true,swipeDistance:45/);
 assert.match(source,/disableFlipByClick:false,showPageCorners:true/);
 assert.match(source,/bindReaderSwipe\(node\("bookPages"\)\)/);
 assert.doesNotMatch(source,/bindReaderSwipe\(node\("flipBook"\)\)/);
 assert.match(source,/copy\.querySelectorAll\("\[id\]"\)/);
 assert.match(source,/prefers-reduced-motion: reduce/);
 assert.match(readFileSync("scripts/prepare-cloudflare.mjs","utf8"),/page-flip-2\.0\.7/);
 assert.equal(JSON.parse(readFileSync("package.json","utf8")).dependencies["page-flip"],"2.0.7");
 assert.doesNotMatch(html,/page-turn-in|rotateY\(-3deg\)/);
});

test("mock preview instantly renders 10 pages without POST, Gemini, D1 writes or stored chart",async()=>{
 const listeners=new Map();
 let desktop=false,postCount=0,nonListReads=0,printed=0;
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
 new Function("document","localStorage","location","window","fetch","crypto","console",source)(
  document,{getItem(){return null}},
  {pathname:"/fortune/report-lab",hash:""},window,fetch,
  {randomUUID:()=>"11111111-2222-4333-8444-555555555555"},{error(){}}
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
 assert.equal(els.get("prevPage").disabled,false);
 const finger=els.get("bookPages").listeners;
 finger.touchstart({touches:[{clientX:240,clientY:220}]});
 finger.touchend({changedTouches:[{clientX:120,clientY:229}]});
 assert.equal(els.get("pageCounter").textContent,"3 / 10","left swipe turns forward");
 finger.touchstart({touches:[{clientX:110,clientY:220}]});
 finger.touchend({changedTouches:[{clientX:240,clientY:222}]});
 assert.equal(els.get("pageCounter").textContent,"2 / 10","right swipe turns backward");
 finger.touchstart({touches:[{clientX:130,clientY:80}]});
 finger.touchend({changedTouches:[{clientX:170,clientY:260}]});
 assert.equal(els.get("pageCounter").textContent,"2 / 10","vertical swipe must not turn pages");
 finger.touchstart({touches:[{clientX:240,clientY:180}]});
 finger.touchcancel();
 finger.touchend({changedTouches:[{clientX:30,clientY:180}]});
 assert.equal(els.get("pageCounter").textContent,"2 / 10","canceled touch must not flip");
 assert.equal(els.get("report").dataset.direction,"prev");
 let prevented=false;
 listeners.get("keydown")({key:"ArrowRight",preventDefault(){prevented=true},target:{tagName:"BODY"}});
 assert.equal(prevented,true);
 assert.equal(els.get("pageCounter").textContent,"3 / 10");
 assert.equal(els.get("report").dataset.direction,"next");
 desktop=true;listeners.get("resize")();
 assert.equal(els.get("pageCounter").textContent,"3–4 / 10");
 assert.equal(pages.filter(p=>p.className.includes("is-active")).length,2);
 els.get("nextPage").listeners.click();
 assert.equal(els.get("pageCounter").textContent,"5–6 / 10");
 assert.equal(pages[4].className.includes("is-active"),true);
 els.get("prevPage").listeners.click();
 assert.equal(els.get("pageCounter").textContent,"3–4 / 10");
 assert.equal(pages[2].className.includes("is-active"),true);
 els.get("print").listeners.click();assert.equal(printed,1);
 assert.equal(postCount,0);
 for(const name of ["preface","personality","career","relationships","timing","letter","plan"]){
  assert.doesNotMatch(els.get(name).textContent,/[？?]/,"example "+name+" should not ask the reader questions");
 }
});


test("StPageFlip adapter delegates real page turns and preserves canonical report pages",()=>{
 const events=new Map(),calls=[];
 let index=0,orientation="portrait",state="read",instances=0;
 const make=(cls="")=>({className:cls,dataset:{},children:[],hidden:false,
  cloneNode(){return make(this.className)},removeAttribute(){},querySelectorAll(){return []},
  appendChild(child){this.children.push(child)}});
 const originals=Array.from({length:10},(_,i)=>make(i===0||i===9?"sheet dark":"sheet"));
 const nodes=new Map(),flags=new Set();
 const reportEl={hidden:false,classList:{add:x=>flags.add(x),remove:x=>flags.delete(x),contains:x=>flags.has(x)}};
 const node=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id)};
 const text=(id,value)=>{node(id).textContent=value};
 class PageFlip{
  constructor(host,settings){instances++;assert.equal(settings.flippingTime,850);assert.equal(settings.showCover,true);assert.equal(settings.mobileScrollSupport,true);assert.equal(settings.useMouseEvents,true);assert.equal(settings.showPageCorners,true);assert.equal(settings.disableFlipByClick,false)}
  on(name,fn){events.set(name,fn)}
  loadFromHTML(items){calls.push(["load",items]);events.get("init")()}
  updateFromHtml(items){calls.push(["update",items]);events.get("update")()}
  update(){}
  turnToPage(page){calls.push(["jump",page]);index=orientation==="landscape"&&page>0&&page<9?1+2*Math.floor((page-1)/2):page;events.get("flip")()}
  getCurrentPageIndex(){return index}
  getOrientation(){return orientation}
  getState(){return state}
  flipNext(){calls.push(["next"]);index+=orientation==="portrait"?1:index===0?1:2;events.get("flip")()}
  flipPrev(){calls.push(["prev"]);index-=orientation==="portrait"?1:index===1?1:2;events.get("flip")()}
 }
 const window={St:{PageFlip},matchMedia:()=>({matches:false})};
 const document={createElement:()=>make()};
 const section=source.slice(source.indexOf("var readerFlip=null"),source.indexOf("function showBook(x)"));
 const adapter=new Function("window","document","reportEl","node","text","readerPages","readerTitles","readerGo","readerSpread",
  "var readerIndex=0;"+section+";return {openFlip,readerStep,syncFlip}")(window,document,reportEl,node,text,()=>originals,Array(10).fill("頁"),()=>calls.push(["fallback"]),()=>false);
 assert.equal(adapter.openFlip(),true);
 assert.equal(instances,1);
 assert.equal(calls[0][1].length,10);
 assert.equal(calls[0][1][0].dataset.density,"hard");
 assert.equal(calls[0][1][9].dataset.density,"hard");
 assert.equal(calls[0][1][1].dataset.density,undefined);
 assert.notEqual(calls[0][1][0].children[0],originals[0]);
 assert.equal(node("pageCounter").textContent,"1 / 10");
 adapter.readerStep(1);assert.equal(node("pageCounter").textContent,"2 / 10");
 state="flipping";adapter.readerStep(1);adapter.readerStep(-1);assert.equal(index,1);
 state="user_fold";adapter.readerStep(-1);assert.equal(index,1);
 state="read";adapter.readerStep(-1);assert.equal(node("pageCounter").textContent,"1 / 10");assert.equal(calls.at(-1)[0],"prev");
 orientation="landscape";adapter.readerStep(1);assert.equal(node("pageCounter").textContent,"2–3 / 10");
 adapter.readerStep(1);assert.equal(node("pageCounter").textContent,"4–5 / 10");
 adapter.readerStep(-1);assert.equal(node("pageCounter").textContent,"2–3 / 10");
 adapter.readerStep(-1);assert.equal(node("pageCounter").textContent,"1 / 10");
 const callCount=calls.length;adapter.readerStep(-1);assert.equal(calls.length,callCount);
 index=9;adapter.syncFlip();assert.equal(node("nextPage").disabled,true);
 adapter.readerStep(1);assert.equal(index,9);
 adapter.readerStep(-1);assert.equal(node("pageCounter").textContent,"8–9 / 10");
 assert.equal(adapter.openFlip(),true);assert.equal(instances,1);assert.equal(node("pageCounter").textContent,"1 / 10");
 assert.equal(calls.filter(x=>x[0]==="update").length,1);
 window.matchMedia=()=>({matches:true});flags.clear();
 assert.equal(adapter.openFlip(),false);adapter.readerStep(1);assert.equal(calls.at(-1)[0],"fallback");
});


test("real StPageFlip 2.0.7 portrait previous works via button, right swipe and slow drag",()=>{
 // Run the pinned production browser bundle, not a stub of flipPrev. The
 // synthetic DOM supplies layout geometry and events without a browser.
 const vendor=readFileSync("node_modules/page-flip/dist/js/page-flip.browser.js","utf8");
 const config=source.match(/new window\.St\.PageFlip\(host,(\{[\s\S]*?\})\);/);
 assert.ok(config,"extract actual reader settings");
 const settings=new Function("return ("+config[1]+");")();
 runVendorRegression(vendor,settings,assert);
});
function runVendorRegression(vendor,settings,assert){
 const width=372,height=width*settings.height/settings.width;
 const raf=[],timers=[],windowEvents=new Map();
 let clock=0;
 class Element{
  constructor(cls=""){this.children=[];this.dataset={};this.style={};this.parentElement=null;this.tagName="DIV";this.events=new Map();const names=new Set(cls.split(" "));this.classList={add:(...x)=>x.forEach(k=>names.add(k)),remove:(...x)=>x.forEach(k=>names.delete(k)),contains:k=>names.has(k)}}
  get offsetWidth(){return width}
  get offsetHeight(){return Math.ceil(height)}
  appendChild(el){this.children.push(el);el.parentElement=this;return el}
  insertAdjacentHTML(where,html){for(const m of html.matchAll(/class="([^"]+)"/g))this.appendChild(new Element(m[1]))}
  querySelector(sel){for(const child of this.children){if(child.classList.contains(sel.slice(1)))return child;const found=child.querySelector(sel);if(found)return found}return null}
  cloneNode(){const copy=new Element();copy.dataset={...this.dataset};return copy}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
  addEventListener(name,fn){this.events.set(name,fn)}
  removeEventListener(name){this.events.delete(name)}
  getBoundingClientRect(){return {left:0,top:0}}
 }
 const window={navigator:{userAgent:"Chromium"},addEventListener:(n,f)=>windowEvents.set(n,f),removeEventListener:n=>windowEvents.delete(n)};
 const St=new Function("window","requestAnimationFrame","setTimeout","document","Date","exports","module","define",vendor+"\nreturn this.St;").call({},window,fn=>raf.push(fn),fn=>timers.push(fn),undefined,{now:()=>clock},undefined,undefined,undefined);
 function setup(opts){
  const host=new Element(),book=new St.PageFlip(host,opts),pages=Array.from({length:10},()=>new Element());
  pages[0].dataset.density=pages[9].dataset.density="hard";
  book.loadFromHTML(pages);while(timers.length)timers.shift()();
  return {book,block:host.querySelector(".stf__block")};
 }
 function finish(book){book.getRender().finishAnimation();assert.equal(book.getState(),"read")}
 const broken=setup({...settings,disableFlipByClick:true}).book;
 broken.turnToPage(3);broken.flipPrev("bottom");
 assert.equal(broken.getState(),"read","reproduce upstream corner guard");
 assert.equal(broken.getCurrentPageIndex(),3);
 const {book,block}=setup(settings);
 assert.equal(book.getOrientation(),"portrait");
 book.turnToPage(3);
 book.flipPrev("bottom");assert.equal(book.getState(),"flipping");finish(book);assert.equal(book.getCurrentPageIndex(),2);
 book.flipNext("bottom");assert.equal(book.getState(),"flipping");finish(book);assert.equal(book.getCurrentPageIndex(),3);
 const touch=(x,y)=>({target:block,changedTouches:[{clientX:x,clientY:y}],cancelable:true,preventDefault(){}});
 block.events.get("touchstart")(touch(15,90));clock+=100;windowEvents.get("touchend")(touch(200,94));
 assert.equal(book.getState(),"flipping","right swipe starts real reverse curl");finish(book);assert.equal(book.getCurrentPageIndex(),2);
 while(timers.length)timers.shift()();
 // Advance past native swipeTimeout: this case must be a real slow drag,
 // not another fast swipe that invokes flipPrev automatically.
 block.events.get("touchstart")(touch(12,90));clock+=300;while(timers.length)timers.shift()();
 windowEvents.get("touchmove")(touch(30,95));
 assert.equal(book.getState(),"user_fold");assert.ok(book.getFlipController().getCalculation());
 windowEvents.get("touchmove")(touch(290,95));
 clock+=300;windowEvents.get("touchend")(touch(290,95));
 finish(book);assert.equal(book.getCurrentPageIndex(),1);
 book.flipPrev("bottom");finish(book);assert.equal(book.getCurrentPageIndex(),0);
 book.flipPrev("bottom");assert.equal(book.getState(),"read");assert.equal(book.getCurrentPageIndex(),0);
}

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
