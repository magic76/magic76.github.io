import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Production HTTP audit, not an index-coverage claim: only Google Search Console
// can report Google's actual crawl/index state.
export const ORIGIN='https://koolo.app';
const games=['friend-gomoku','connect4','twenty-questions','reversi','mystery','1a2b','taboo'];
const guides=['ai-english-speaking','ai-conversation-partner','travel-english-dialogues','english-pronunciation','gemini-key-for-ai-practice'];
const hubs=['','teacher','story','fortune','research','games'];
const privatePaths=['/magic','/chat','/teacher/live','/games/nonsense','/en/teacher/roles','/en/magic'];
const previewPaths=['/ja/','/fr/'];
const requiredPaths=['','en/'].flatMap(prefix=>[
 ...hubs.map(slug=>'/'+prefix+slug+(slug?'/':'')),
 ...games.map(slug=>'/'+prefix+'games/'+slug+'/'),
 ...guides.map(slug=>'/'+prefix+'guides/'+slug+'/')
]);
export function assertThat(ok,message){if(!ok)throw Error(message);}
export function canonicalOf(html){return html.split('</head>')[0].match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1]??null;}
export function robotsOf(html){return html.split('</head>')[0].match(/<meta\b[^>]*name="robots"[^>]*content="([^"]+)"/i)?.[1]?.toLowerCase()??null;}
export function sitemapUrls(xml,origin=ORIGIN){
 assertThat(xml.includes('<urlset')&&xml.includes('</urlset>'),'Invalid sitemap XML structure');
 const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1].replaceAll('&amp;','&'));
 assertThat(urls.length>0,'Sitemap has no URLs');
 assertThat(urls.length===new Set(urls).size,'Sitemap contains duplicate URLs');
 for(const url of urls){
  const parsed=new URL(url);
  assertThat(parsed.origin===origin,'Sitemap contains an off-site URL: '+url);
  assertThat(parsed.href===url&&parsed.pathname.endsWith('/')&&!parsed.search&&!parsed.hash,'Sitemap URL is not a canonical trailing-slash path: '+url);
 }
 return urls;
}
export function inspectPublicPage(html,url,headers={}){
 assertThat(/<head(?:\s[^>]*)?>/i.test(html)&&/<\/head>/i.test(html),'Missing HTML head');
 assertThat(canonicalOf(html)===url,'Wrong canonical: '+canonicalOf(html)+' (expected '+url+')');
 const robots=robotsOf(html);
 assertThat(robots!==null&&robots.split(',').map(x=>x.trim()).includes('index'),'Missing explicit index directive');
 assertThat(!robots.includes('noindex'),'Public page contains noindex');
 assertThat(!String(headers['x-robots-tag']||'').toLowerCase().includes('noindex'),'Public page has noindex HTTP header');
 assertThat(/<h1(?:\s[^>]*)?>/i.test(html),'No server-rendered h1');
 assertThat(html.includes('data-crew-ssg-path="'),'Missing React SSR/SSG markup');
 const json=html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
 assertThat(json,'Missing structured data');
 try{JSON.parse(json[1]);}catch(e){throw Error('Malformed JSON-LD: '+e.message);}
 const current=new URL(url),path=current.pathname;
 if(!path.startsWith('/research/')&&!path.startsWith('/en/research/')){
  const base=path.startsWith('/en/')?path.slice(3):path;
  assertThat(html.includes('hreflang="zh-Hant" href="'+current.origin+base+'"'),'Missing Chinese hreflang');
  assertThat(html.includes('hreflang="en" href="'+current.origin+'/en'+base+'"'),'Missing English hreflang');
 }
}
export function inspectNoindexPage(html){
 assertThat(robotsOf(html)?.includes('noindex'),'Private/preview route is missing noindex');
 assertThat(!canonicalOf(html),'Private/preview route must not copy the homepage canonical');
}
async function retrieve(path,{origin,fetchImpl}){
 const url=origin+path;
 const res=await fetchImpl(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(20000),
  headers:{Accept:'text/html,application/xml,text/plain','User-Agent':'Crew-Production-SEO-Smoke/1.0'}});
 assertThat(res.status===200,'HTTP '+res.status+' for '+url+'; expected 200 without redirect');
 const text=await res.text();
 assertThat(text.length>0,'Empty response for '+url);
 return {text,headers:{'x-robots-tag':res.headers?.get?.('x-robots-tag')}};
}
export async function auditSite({origin=ORIGIN,fetchImpl=fetch,log=console.log}={}){
 const errors=[],checks=[];
 async function check(label,action){
  try{await action();checks.push(label);log('PASS '+label);}
  catch(e){errors.push(label+': '+e.message);log('FAIL '+label+': '+e.message);}
 }
 let urls=[];
 await check('robots.txt and sitemap discovery',async()=>{
  const robots=(await retrieve('/robots.txt',{origin,fetchImpl})).text;
  assertThat(/User-agent:\s*\*/i.test(robots),'robots.txt missing wildcard user-agent');
  assertThat(robots.includes('Sitemap: '+origin+'/sitemap.xml'),'robots.txt references the wrong sitemap');
  assertThat(!/^Disallow:\s*\/\s*$/im.test(robots),'robots.txt blocks the whole site');
  urls=sitemapUrls((await retrieve('/sitemap.xml',{origin,fetchImpl})).text,origin);
  for(const path of requiredPaths)assertThat(urls.includes(origin+path),'Missing public SSG path in live sitemap: '+path);
  for(const url of urls)assertThat(!privatePaths.some(p=>url===origin+p||url===origin+'/en'+p),'Private page leaked into live sitemap: '+url);
 });
 if(urls.length){
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,urls.length)},async()=>{
   while(cursor<urls.length){
    const url=urls[cursor++];
    await check('indexable '+new URL(url).pathname,async()=>{
     const {text,headers}=await retrieve(new URL(url).pathname,{origin,fetchImpl});
     inspectPublicPage(text,url,headers);
    });
   }
  }));
 }
 for(const path of [...privatePaths,...previewPaths]){
  await check('noindex '+path,async()=>{
   inspectNoindexPage((await retrieve(path,{origin,fetchImpl})).text);
  });
 }
 const result={passed:checks.length,failed:errors.length,urls:urls.length,errors};
 log('SEO LIVE: '+result.passed+' passed, '+result.failed+' failed, '+result.urls+' sitemap URLs');
 if(process.env.GITHUB_STEP_SUMMARY){
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,[
   '## Crew production SEO smoke',
   '- Origin: '+origin,
   '- Sitemap URLs checked: '+result.urls,
   '- Passed: '+result.passed+'; failed: '+result.failed,
   ...(errors.length?['','### Failures',...errors.map(e=>'- '+e.replaceAll('|','\\|'))]:[]),''
  ].join('\n'));
 }
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await auditSite();
 if(result.failed)process.exitCode=1;
}
