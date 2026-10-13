/**
 * Cloudflare Pages smoke test against the actual production dist, in Chromium.
 * CI installs Playwright without adding it to the deployed application bundle.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright";

const origin="http://127.0.0.1:4179";
const routes=["/","/teacher/","/story/","/fortune/","/research/","/en/","/en/teacher/","/en/story/","/en/fortune/","/en/research/"];

async function waitForPreview(child){
 for(let n=0;n<120;n++){
  if(child.exitCode!==null)throw Error("Vite preview exited before startup: "+child.exitCode);
  try{
   const response=await fetch(origin+"/",{signal:AbortSignal.timeout(1000)});
   if(response.ok)return;
  }catch{/* Wait for Vite to bind its port. */}
  await sleep(200);
 }
 throw Error("Timed out waiting for Cloudflare preview");
}

function checkConsole(page,errors){
 page.on("pageerror",error=>errors.push("Uncaught: "+error.message));
 page.on("console",message=>{
  if(message.type()==="error"&&/hydration|hydrating|server rendered|content does not match|error occurred during hydration/i.test(message.text())){
   errors.push("Hydration: "+message.text());
  }
 });
}

async function run(){
 const vite=spawn(process.execPath,["node_modules/vite/bin/vite.js","preview","--config","vite.web.config.ts","--host","127.0.0.1","--port","4179","--strictPort"],{
  cwd:process.cwd(),
  env:{...process.env,CREW_DEPLOY_TARGET:"cloudflare"},
  stdio:["ignore","pipe","pipe"]
 });
 let viteErrors="";
 vite.stderr.on("data",chunk=>{viteErrors+=chunk.toString()});
 let browser;
 try{
  await waitForPreview(vite);
  browser=await chromium.launch({
   channel:process.env.CREW_CHROME_CHANNEL||"chrome",
   headless:true,
   args:["--no-sandbox"]
  });
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  for(const route of routes){
   const errors=[];
   const page=await context.newPage();
   checkConsole(page,errors);
   const response=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:30000});
   assert.equal(response?.status(),200,"route should return 200: "+route);
   await page.locator("header.app-header").waitFor({state:"visible",timeout:15000});
   await page.locator("nav.global-nav").waitFor({state:"visible",timeout:15000});
   assert.ok(await page.locator("main h1").count(),"Missing SSG heading: "+route);
   const computed=await page.locator("header.app-header").evaluate(el=>{
    const css=getComputedStyle(el);
    return {height:el.getBoundingClientRect().height,display:css.display};
   });
   assert.ok(computed.height>20&&computed.display!=="none","Crew CSS missing: "+route);
   const bodyStart=await page.locator("body").evaluate(el=>el.textContent?.trim().slice(0,5)||"");
   assert.ok(!bodyStart.startsWith("\\n"),"literal escaped newline visible: "+route);
   await page.waitForTimeout(120);
   assert.deepEqual(errors,[],"Browser hydration error on "+route);
   await page.close();
   process.stdout.write("PASS prerender + hydrate "+route+"\n");
  }
  // A real SPA soft navigation must not turn a page into a second marketing site.
  const home=await context.newPage();
  await home.goto(origin+"/",{waitUntil:"domcontentloaded"});
  await home.locator('.global-nav a[href="/teacher"]').click();
  await home.waitForURL(url=>url.pathname.replace(/\/$/,"")==="/teacher");
  await home.locator("header.app-header").waitFor({state:"visible"});
  assert.ok(await home.locator(".hero").count(),"Navigation did not render Teacher");
  await home.close();
  process.stdout.write("PASS React client navigation\n");
  // BrowserRouter deep-link refresh uses root SPA fallback rather than SSG hydration.
  const deep=await context.newPage();
  const deepErrors=[];
  checkConsole(deep,deepErrors);
  await deep.goto(origin+"/teacher/roles?mode=friends",{waitUntil:"domcontentloaded"});
  await deep.waitForFunction(()=>!document.documentElement.classList.contains("crew-dynamic-route"),null,{timeout:15000});
  await deep.locator("header.app-header").waitFor({state:"visible",timeout:15000});
  assert.equal(new URL(deep.url()).pathname,"/teacher/roles");
  await deep.reload({waitUntil:"domcontentloaded"});
  await deep.waitForFunction(()=>!document.documentElement.classList.contains("crew-dynamic-route"),null,{timeout:15000});
  assert.deepEqual(deepErrors,[],"Deep route should render without hydration mismatch");
  await deep.close();
  process.stdout.write("PASS deep-link refresh\n");
  await context.close();
 }finally{
  if(browser)await browser.close();
  vite.kill("SIGTERM");
  await sleep(200);
  if(viteErrors&&vite.exitCode&&vite.exitCode!==0)process.stderr.write(viteErrors);
 }
}

run().catch(error=>{console.error(error);process.exitCode=1});
