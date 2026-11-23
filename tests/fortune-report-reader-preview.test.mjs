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
 assert.match(html,/\.sheet\.is-active\{display:flex!important;animation:none!important/);
 assert.equal((html.match(/<article class="sheet(?: dark)?"/g)||[]).length,10);
 assert.doesNotMatch(html,/留給自己的一題|建議：每週做一件/);
 assert.match(html,/v=20261123-reader1/);
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
 let prevented=false;
 listeners.get("keydown")({key:"ArrowRight",preventDefault(){prevented=true},target:{tagName:"BODY"}});
 assert.equal(prevented,true);
 assert.equal(els.get("pageCounter").textContent,"3 / 10");
 desktop=true;listeners.get("resize")();
 assert.equal(els.get("pageCounter").textContent,"3–4 / 10");
 assert.equal(pages.filter(p=>p.className.includes("is-active")).length,2);
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
