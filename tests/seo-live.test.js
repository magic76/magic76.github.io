const {test}=require('node:test');
const assert=require('node:assert/strict');

const ORIGIN='https://koolo.app';
async function load(){return import('../scripts/check-live-seo.mjs');}
function html(url,{noindex=false,canonical=url,alternate=true,ssg=true}={}){
 const p=new URL(url).pathname;
 const path=p.startsWith('/en/')?p.slice(3):p;
 return `<html><head><meta name="robots" content="${noindex?'noindex,follow':'index,follow'}">${canonical?`<link rel="canonical" href="${canonical}">`:''}${alternate?`<link rel="alternate" hreflang="zh-Hant" href="${ORIGIN+path}"><link rel="alternate" hreflang="en" href="${ORIGIN+'/en'+path}">`:''}<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script></head><body><div ${ssg?'data-crew-ssg-path="'+p.slice(0,-1)+'"':''}><h1>Test</h1></div></body></html>`;
}
test('sitemap parsing enforces unique, canonical same-origin URLs',async()=>{
 const {sitemapUrls}=await load();
 assert.deepEqual(sitemapUrls(`<urlset><url><loc>${ORIGIN}/</loc></url><url><loc>${ORIGIN}/en/</loc></url></urlset>`),[ORIGIN+'/',ORIGIN+'/en/']);
 assert.throws(()=>sitemapUrls(`<urlset><loc>${ORIGIN}/</loc><loc>${ORIGIN}/</loc></urlset>`),/duplicate/i);
 assert.throws(()=>sitemapUrls(`<urlset><loc>https://bad.example/</loc></urlset>`),/off-site/i);
 assert.throws(()=>sitemapUrls(`<urlset><loc>${ORIGIN}/games/connect4</loc></urlset>`),/trailing-slash/i);
});
test('public SSG requires canonical, indexable head, SSR content, JSON-LD and alternates',async()=>{
 const {inspectPublicPage}=await load();
 const url=ORIGIN+'/games/connect4/';
 assert.doesNotThrow(()=>inspectPublicPage(html(url),url));
 assert.throws(()=>inspectPublicPage(html(url,{canonical:ORIGIN+'/'}),url),/canonical/);
 assert.throws(()=>inspectPublicPage(html(url,{noindex:true}),url),/index directive|noindex/);
 assert.throws(()=>inspectPublicPage(html(url,{alternate:false}),url),/hreflang/);
 assert.throws(()=>inspectPublicPage(html(url,{ssg:false}),url),/SSR/);
 assert.throws(()=>inspectPublicPage(html(url),url,{'x-robots-tag':'noindex'}),/HTTP header/);
});
test('private pages must be noindex without homepage canonical',async()=>{
 const {inspectNoindexPage}=await load();
 assert.doesNotThrow(()=>inspectNoindexPage(html(ORIGIN+'/magic',{noindex:true,canonical:null})));
 assert.throws(()=>inspectNoindexPage(html(ORIGIN+'/magic',{noindex:false,canonical:null})),/noindex/);
 assert.throws(()=>inspectNoindexPage(html(ORIGIN+'/magic',{noindex:true,canonical:ORIGIN+'/'})),/canonical/);
});
