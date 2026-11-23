/** Build-only editorial SEO pages. Drafts and candidates never reach the public build. */
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {dirname,join} from "node:path";
const BASE="https://koolo.app";
const CAT={tools:{zh:"AI 工具與實作",en:"AI tools"},learning:{zh:"語言學習",en:"Language learning"},explore:{zh:"趣味探索",en:"Explore"}};
const L={zh:{hub:"探索文章",intro:"AI 熱點、實用教學與真正能試玩的體驗。從問題出發，讀懂之後就動手試試。",home:"首頁",read:"閱讀文章",back:"返回文章中心",sources:"參考資料",faq:"常見問題",try:"開始體驗",related:"延伸閱讀",updated:"更新日期",search:"搜尋文章"},en:{hub:"Articles & ideas",intro:"Useful AI explainers, practical guides and experiences you can try.",home:"Home",read:"Read article",back:"Back to articles",sources:"Sources",faq:"Questions",try:"Try it",related:"Related articles",updated:"Updated",search:"Search articles"}};
const E=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const J=x=>JSON.stringify(x).replaceAll("<","\\u003c").replaceAll(">","\\u003e").replaceAll("&","\\u0026");
const safe=s=>typeof s==="string"&&( /^\/(?!\/)(?!.*\.\.)[^\s]*$/.test(s)||/^https:\/\/[a-z0-9.-]+(?:[/?#][^\s]*)?$/i.test(s));
const url=(slug,en)=>BASE+"/"+(en?"en/":"")+"articles/"+(slug?slug+"/":"");
const href=(slug,en)=>"/"+(en?"en/":"")+"articles/"+(slug?slug+"/":"");
const category=(item,en)=>CAT[item.category][en?"en":"zh"];
const css=':root{font-family:system-ui,-apple-system,sans-serif;color:#1b2e46;background:#f6f8fb}*{box-sizing:border-box}body{margin:0;line-height:1.8}a{color:#254b92}header{background:#fff;border-bottom:1px solid #e2e8f0}.wrap{max-width:1100px;margin:auto;padding:18px 20px}.top{display:flex;align-items:center;justify-content:space-between;gap:14px}.top nav{display:flex;gap:15px;align-items:center}.top a{text-decoration:none}.brand{font-size:23px;font-weight:900;color:#243c6b}.hero{padding:30px;border-radius:24px;background:linear-gradient(120deg,#e5f5f6,#efebfa);margin:14px 0 25px}.hero h1{margin:8px 0;font-size:clamp(30px,5vw,45px)}h1{font-size:clamp(29px,5vw,42px);line-height:1.3}h2{line-height:1.4}p{color:#47546d}input{width:100%;padding:13px 17px;border:1px solid #cbd5e1;border-radius:13px;font:inherit;margin-bottom:20px}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px}.card{background:#fff;border:1px solid #dce3eb;border-radius:18px;overflow:hidden;display:flex;flex-direction:column}.card img{width:100%;height:155px;object-fit:cover}.card div{padding:17px;flex:1;display:flex;flex-direction:column}.card h3{font-size:19px;margin:10px 0 4px;line-height:1.45}.card p{font-size:14px}.card a:last-child{margin-top:auto;font-weight:700}.tag{display:inline-block;background:#e4eefb;color:#304d8e;border-radius:100px;padding:2px 12px;font-size:12px;font-weight:700}.group{margin:26px 0}.article{max-width:820px;margin:15px auto 60px}.paper{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:clamp(20px,5vw,42px)}.lead{font-size:19px}.cover{width:100%;height:auto;aspect-ratio:1200/630;object-fit:cover;border-radius:17px;margin:18px 0}.paper section{margin-top:27px;padding-top:18px;border-top:1px solid #edf0f5}.paper section h2{font-size:23px}.date{font-size:13px}.cta{background:#223b73;color:white;border-radius:15px;padding:21px;margin-top:25px}.cta h2,.cta p{color:white}.cta a{display:inline-block;color:#233969;background:#fff;padding:10px 22px;border-radius:10px;text-decoration:none;font-weight:700}.related{padding:20px 0}.related a{display:block;margin:9px 0}footer{text-align:center;padding:35px 12px;color:#66778f;font-size:13px}[hidden]{display:none!important}@media(max-width:850px){.cards{grid-template-columns:repeat(2,1fr)}}@media(max-width:580px){.cards{grid-template-columns:1fr}.card img{height:200px}.top nav{gap:8px;font-size:14px}.hero{padding:23px}.paper{border-radius:16px}}';
function validate(item){
 if(!item||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)||!["published","draft","review","scheduled","archived"].includes(item.status)||!CAT[item.category]||!["teacher","research","fortune"].includes(item.image)||!/^\d{4}-\d{2}-\d{2}$/.test(item.published)||!safe(item.source))throw Error("Invalid editorial entry");
 for(const k of ["zh","en"]){
  const x=item[k];
  if(!x||[x.title,x.description,x.lead].some((v,i)=>typeof v!=="string"||v.length<[12,24,20][i])||!Array.isArray(x.sections)||x.sections.length<3||!Array.isArray(x.faq)||!x.faq.length||!safe(x.cta?.[1]))throw Error("Incomplete editorial locale "+item.slug+"/"+k);
  if(x.sections.some(s=>!Array.isArray(s)||s.length<3||s.some((v,i)=>typeof v!=="string"||v.length<(i===0?4:15))))throw Error("Thin editorial section: "+item.slug);
 }
}
export function readEditorial(root){
 const all=JSON.parse(readFileSync(join(root,"content/editorial/articles.json"),"utf8"));
 if(all.schema!==1||!Array.isArray(all.articles)||!Array.isArray(all.candidates))throw Error("Invalid editorial catalog");
 const ids=new Set();
 for(const a of all.articles){validate(a);if(ids.has(a.slug))throw Error("Duplicate article slug");ids.add(a.slug);}
 for(const a of all.candidates){if(ids.has(a.slug)||!/^[a-z0-9-]+$/.test(a.slug)||!["draft","review","scheduled"].includes(a.status))throw Error("Unsafe candidate");ids.add(a.slug);}
 return all.articles.filter(a=>a.status==="published").sort((a,b)=>b.published.localeCompare(a.published)||a.slug.localeCompare(b.slug));
}
function header(en){return '<header><div class="wrap top"><a class="brand" href="'+(en?"/en/":"/")+'">Koolo</a><nav><a href="'+href("",en)+'">'+L[en?"en":"zh"].hub+'</a><a href="'+url("",false)+'" lang="zh-Hant">中文</a><a href="'+url("",true)+'" lang="en">EN</a></nav></div></header>';}
function image(item){return BASE+"/social/og/"+item.image+"-koolo-v1.png";}
function head(title,description,slug,en,img,ld){
 const canonical=url(slug,en),zh=url(slug,false),english=url(slug,true);
 return '<!doctype html><html lang="'+(en?"en":"zh-Hant")+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+E(title)+' | Koolo</title><meta name="description" content="'+E(description)+'"><meta name="robots" content="index,follow"><link rel="canonical" href="'+canonical+'"><link rel="alternate" hreflang="zh-Hant" href="'+zh+'"><link rel="alternate" hreflang="en" href="'+english+'"><link rel="alternate" hreflang="x-default" href="'+zh+'"><meta property="og:type" content="'+(slug?"article":"website")+'"><meta property="og:title" content="'+E(title)+'"><meta property="og:description" content="'+E(description)+'"><meta property="og:url" content="'+canonical+'"><meta property="og:image" content="'+img+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="'+img+'"><script type="application/ld+json">'+J(ld)+'</script><style>'+css+'</style></head>';
}
function card(item,en){
 const x=item[en?"en":"zh"],to=href(item.slug,en);
 return '<article class="card" data-search="'+E((x.title+" "+x.description+" "+category(item,en)).toLowerCase())+'"><img src="'+image(item).slice(BASE.length)+'" width="1200" height="630" loading="lazy" alt=""><div><span class="tag">'+category(item,en)+'</span><h3><a href="'+to+'">'+E(x.title)+'</a></h3><p>'+E(x.description)+'</p><a href="'+to+'">'+L[en?"en":"zh"].read+' →</a></div></article>';
}
export function renderEditorialHub(items,en=false){
 const d=L[en?"en":"zh"],title=en?"AI ideas, tutorials and experiences":"AI 熱點、實用教學與趣味探索",origin=url("",en);
 const ld={"@context":"https://schema.org","@graph":[{"@type":"CollectionPage",url:origin,name:title,description:d.intro,inLanguage:en?"en":"zh-Hant"},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:d.home,item:BASE+(en?"/en/":"/")},{"@type":"ListItem",position:2,name:d.hub,item:origin}]}]};
 const groups=Object.keys(CAT).map(k=>'<section class="group"><h2>'+CAT[k][en?"en":"zh"]+'</h2><div class="cards">'+items.filter(x=>x.category===k).map(x=>card(x,en)).join("")+'</div></section>').join("");
 const filter='<script>(function(){var input=document.getElementById("article-filter");input.addEventListener("input",function(){var q=this.value.toLowerCase().trim();document.querySelectorAll(".group").forEach(function(group){var visible=0;group.querySelectorAll(".card").forEach(function(card){var show=card.getAttribute("data-search").includes(q);card.hidden=!show;if(show)visible++;});group.hidden=!visible;});});})();</script>';
 return head(title,d.intro,"",en,BASE+"/social/koolo-shared-v1.png",ld)+'<body>'+header(en)+'<main class="wrap" data-editorial-ssg-path="'+href("",en)+'"><div class="hero"><small>KOOLO EXPLORE</small><h1>'+E(title)+'</h1><p>'+E(d.intro)+'</p></div><label for="article-filter">'+d.search+'</label><input id="article-filter" type="search" placeholder="'+d.search+'…" autocomplete="off">'+groups+'</main><footer>© Koolo</footer>'+filter+'</body></html>';
}
export function renderEditorialArticle(item,items,en=false){
 const d=L[en?"en":"zh"],x=item[en?"en":"zh"],canonical=url(item.slug,en),img=image(item);
 const ld={"@context":"https://schema.org","@graph":[{"@type":"Article",headline:x.title,description:x.description,image:[img],datePublished:item.published,dateModified:item.published,inLanguage:en?"en":"zh-Hant",mainEntityOfPage:canonical,author:{"@type":"Organization",name:"Koolo"},publisher:{"@type":"Organization",name:"Koolo",url:BASE}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:d.home,item:BASE+(en?"/en/":"/")},{"@type":"ListItem",position:2,name:d.hub,item:url("",en)},{"@type":"ListItem",position:3,name:x.title,item:canonical}]}]};
 const sections=x.sections.map(([h,...ps])=>'<section><h2>'+E(h)+'</h2>'+ps.map(p=>'<p>'+E(p)+'</p>').join("")+'</section>').join("");
 const faq='<section><h2>'+d.faq+'</h2>'+x.faq.map(([q,a])=>'<h3>'+E(q)+'</h3><p>'+E(a)+'</p>').join("")+'</section>';
 const sources='<section><h2>'+d.sources+'</h2><a href="'+E(item.source)+'" rel="noopener noreferrer" target="_blank">'+E(new URL(item.source).hostname)+'</a></section>';
 const related=items.filter(a=>a.slug!==item.slug).slice(0,4).map(a=>'<a href="'+href(a.slug,en)+'">'+E(a[en?"en":"zh"].title)+' →</a>').join("");
 return head(x.title,x.description,item.slug,en,img,ld)+'<body>'+header(en)+'<main class="wrap" data-editorial-ssg-path="'+href(item.slug,en)+'"><article class="article"><a href="'+href("",en)+'">← '+d.back+'</a><div class="paper"><span class="tag">'+category(item,en)+'</span><h1>'+E(x.title)+'</h1><p class="lead">'+E(x.lead)+'</p><p class="date">'+d.updated+'：'+item.published+'</p><img class="cover" src="'+img.slice(BASE.length)+'" alt="" width="1200" height="630">'+sections+faq+sources+'<div class="cta"><h2>'+d.try+'</h2><p>'+E(x.cta[0])+'</p><a data-editorial-cta="'+E(item.slug)+'" href="'+E(x.cta[1])+'">'+d.try+' →</a></div></div><div class="related"><h2>'+d.related+'</h2>'+related+'</div></article></main><footer>© Koolo · <a href="'+href("",en)+'">'+d.hub+'</a></footer><script>document.querySelector("[data-editorial-cta]").addEventListener("click",function(){if(typeof window.gtag==="function")window.gtag("event","editorial_cta_click",{article_slug:this.dataset.editorialCta});});</script></body></html>';
}
export function writeEditorialPages(root,out){
 const entries=readEditorial(root);
 for(const en of [false,true]){
  const pages=[["",renderEditorialHub(entries,en)],...entries.map(a=>[a.slug,renderEditorialArticle(a,entries,en)])];
  for(const [slug,html] of pages){const file=join(out,(en?"en/":"")+"articles/"+(slug?slug+"/":"")+"index.html");mkdirSync(dirname(file),{recursive:true});writeFileSync(file,html,"utf8");}
 }
 return entries.length;
}
export function editorialSitemapEntries(items){
 const latest=items.reduce((d,a)=>a.published>d?a.published:d,"2026-11-24");
 return [...items.map(a=>[a.slug,a.published]),["",latest]].flatMap(([slug,day])=>[false,true].map(en=>'<url><loc>'+url(slug,en)+'</loc><lastmod>'+day+'</lastmod><xhtml:link rel="alternate" hreflang="zh-Hant" href="'+url(slug,false)+'"/><xhtml:link rel="alternate" hreflang="en" href="'+url(slug,true)+'"/><xhtml:link rel="alternate" hreflang="x-default" href="'+url(slug,false)+'"/></url>')).join("\n");
}
