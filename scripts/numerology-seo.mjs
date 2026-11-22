/**
 * Public Tarot Numerology educational SSG only. Results are still calculated by
 * features/fortune/tarot/calculator.js in the private reading flow.
 * Keep the 11/22/33 master numbers: they are NOT collapsed into the 1–9 pages.
 */
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";

export const NUMEROLOGY_NUMBERS=[
 ["1","開創與自主","Initiative and independence","探索開始行動、設定方向與獨立決策的象徵。","Explore the themes of initiative, direction and individual agency.","留意過度急於證明自己時，是否忽略團隊意見。","Reflect on balancing personal drive with listening to others.","魔術師","The Magician"],
 ["2","協調與連結","Cooperation and connection","探索傾聽、合作與關係界線的象徵。","Explore listening, cooperation and boundaries in relationships.","尊重他人的同時，也需要清楚表達自己的立場。","Supporting others matters, but so does communicating your own needs.","女祭司","The High Priestess"],
 ["3","表達與創造","Expression and creativity","探索溝通、創意與把想法化為作品的象徵。","Explore communication, creativity and turning ideas into projects.","靈感再多，也值得練習聚焦與完成。","New ideas are valuable; focus and finishing are valuable too.","皇后","The Empress"],
 ["4","結構與耐心","Structure and patience","探索建立基礎、持續實踐與承擔責任的象徵。","Explore foundations, consistency and responsibility.","規劃可以帶來安定，也要為變化保留彈性。","Plans provide stability, but leaving room for change helps too.","皇帝","The Emperor"],
 ["5","彈性與探索","Adaptability and exploration","探索學習、改變與嘗試不同選項的象徵。","Explore learning, change and trying unfamiliar possibilities.","好奇能帶來機會，持續投入能讓探索轉成成果。","Curiosity opens possibilities; commitment helps make them real.","教皇","The Hierophant"],
 ["6","照顧與選擇","Care and choice","探索關係、承諾以及平衡個人與他人需求的象徵。","Explore relationships, commitment and balancing shared needs.","承諾不代表必須承擔所有責任。","Commitment need not mean carrying every responsibility yourself.","戀人","The Lovers"],
 ["7","觀察與理解","Reflection and understanding","探索研究、沉澱與從不同角度尋找意義的象徵。","Explore reflection, research and finding meaning through inquiry.","深入思考的同時，也可以適度驗證想法。","Deep reflection can be paired with practical testing.","戰車","The Chariot"],
 ["8","資源與行動","Resources and agency","探索組織資源、做決定與衡量責任的象徵。","Explore organizing resources, deciding and taking responsibility.","衡量成果時，別忘記自己真正重視的價值。","When measuring results, consider what matters beyond metrics.","力量","Strength"],
 ["9","完成與整理","Completion and perspective","探索收尾、回顧與為下一段旅程騰出空間的象徵。","Explore closure, review and preparing for what comes next.","放下舊階段不等於否定過去累積的成果。","Closing a chapter does not erase what you learned.","隱者","The Hermit"]
];
export const NUMEROLOGY_SEO_SLUGS=["numerology",...NUMEROLOGY_NUMBERS.map(r=>"numerology/"+r[0])];
const ORIGIN="https://koolo.app";
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const url=(slug,en)=>ORIGIN+"/"+(en?"en/":"")+"fortune/"+slug+"/";
const rel=(slug,en)=>"/"+(en?"en/":"")+"fortune/"+slug+"/";
const cover="/fortune/modes/fortune-tarot-cover.webp";
const textDisclaimer=(en)=>en?"Tarot numerology is a traditional symbolic practice for entertainment and reflection—not a scientifically validated prediction or professional advice.":"塔羅生命靈數是文化象徵與自我探索，不是經科學驗證的命運預測，也不能替代專業建議。";
function data(slug,en){
 if(slug==="numerology")return {
 title:en?"Life Path Number Calculator and Tarot Birth Cards | Koolo":"生命靈數計算｜生日數字、生命道路與塔羅出生牌｜Koolo",
 description:en?"Learn how Koolo calculates life path numbers from birth dates, preserves master numbers 11/22/33, and combines numerology with Tarot birth cards.":"了解 Koolo 如何從生日計算生命道路、保留 11／22／33 主數，以及塔羅人格牌、靈魂牌與個人年；進入工具探索自己的數字。",
 heading:en?"Understand your life path number":"生命靈數計算：認識你的生命道路",
 intro:en?"Koolo's Tarot Numerology tool uses the sum of the birth date's digits for a life path number. It also calculates Tarot birth cards and other reflective themes.":"Koolo 的塔羅生命靈數以出生年月日的各位數字加總，得到生命道路，並另外計算塔羅出生牌、態度數及個人年。",
 paragraphs:en?[
 "Add the individual digits of your birth year, month and day. Repeatedly sum the digits until the result is 1–9 or a master number 11, 22 or 33. This reflects the existing Koolo calculator.",
 "The life path number is not the same as a Tarot personality card. Koolo derives a separate 1–22 card number from the total and also determines a soul card.",
 "A master number such as 11/2, 22/4 or 33/6 retains both its master-number form and its reduced reference number. These values are not silently classified as 2, 4 or 6.",
 "For example, the date 1985-07-06 yields a raw digit sum of 36 and a life path number of 9. Different births can produce different combinations of Tarot cards and life path values."
 ]:[
 "將出生年、月、日的每個數字相加；若超過 9，繼續相加，直到得到 1～9，或保留主數 11、22、33。這與 Koolo 現有計算器的生命道路規則一致。",
 "生命道路不等於塔羅人格牌。Koolo 還會從生日數字總和另外計算 1～22 的人格牌，並推導靈魂牌。",
 "當生命道路出現 11／2、22／4、33／6 時，保留主數與縮減後的參考數字，不直接歸類成 2、4、6。",
 "例如 1985-07-06 的數字總和是 36，縮減後生命道路為 9；其他出生日期可能得到不同的出生牌及生命道路組合。"
 ]};
 const n=NUMEROLOGY_NUMBERS.find(row=>slug==="numerology/"+row[0]);
 if(!n)throw Error("Unrecognized numerology slug "+slug);
 return {
 title:en?"Life Path "+n[0]+" Meaning: "+n[3]+" | Koolo Numerology":"生命靈數 "+n[0]+" 是什麼？"+n[1]+"的意義｜Koolo",
 description:en?"Learn the traditional life path "+n[0]+" meaning: "+n[3]+" Understand the difference between your life path number and Tarot birth cards.":"生命靈數 "+n[0]+" 的傳統象徵是「"+n[1]+"」。了解生命道路 "+n[0]+" 的含義、反思主題與塔羅出生牌的差異，並免費查自己的數字。",
 heading:en?"Life path number "+n[0]+": "+n[3]:"生命靈數 "+n[0]+"："+n[1],
 intro:en?n[4]:n[3],
 paragraphs:en?[
 "In Koolo, a life path number of "+n[0]+" arises when the sum of birth-date digits reduces to "+n[0]+", while retaining master numbers 11, 22 and 33 as separate outcomes.",
 "The symbolic themes associated with "+n[0]+" include "+n[3]+". They provide a reflective lens, not evidence that every person with this number shares the same personality.",
 n[6],
 "The Tarot card numbered "+n[0]+" is "+n[8]+", but a life path of "+n[0]+" does not guarantee that "+n[8]+" is your birth card. The calculator derives the card separately from the original digit total.",
 "To interpret your own result, compare the life path with the personality card, soul card and current personal year within the chart."
 ]:[
 "在 Koolo 的規則中，生日數字總和反覆縮減至 "+n[0]+" 時，生命道路為 "+n[0]+"；若先得到 11、22、33 主數則保留，不直接歸入 "+n[0]+"。",
 "生命靈數 "+n[0]+" 常用「"+n[1]+"」作為傳統象徵。這是用來整理生活提問的框架，不代表所有同號碼的人都具有相同個性。",
 n[5],
 "塔羅編號 "+n[0]+" 的牌名為「"+n[7]+"」，但生命道路為 "+n[0]+" 不代表你的出生人格牌必然是「"+n[7]+"」。Koolo 會從生日數字原始總和另外計算人格牌。",
 "如果想理解自己的結果，應同時參考出生人格牌、靈魂牌與目前個人年，而不是單看一個數字。"
 ]};
}
function faq(slug,en){
 if(slug==="numerology")return en?[
 ["How is my life path calculated?","Koolo sums the individual digits of your birth date and reduces the result, retaining 11, 22 and 33 as master numbers."],
 ["Is this the same as my Tarot birth card?","No. Koolo derives the birth card separately, using the unreduced birth-date digit total."],
 ["Is numerology scientifically predictive?","No. Use it as a cultural and reflective exercise, not a forecast."]
 ]:[
 ["生命靈數怎麼算？","Koolo 將出生年月日的各個數字加總、縮減，遇到 11、22、33 主數時保留。"],
 ["生命道路和塔羅出生牌一樣嗎？","不一樣。塔羅出生牌由生日數字原始總和另外推算。"],
 ["生命靈數能預測未來嗎？","沒有科學證據能證明其可預測個人命運，適合作為文化與自我反思。"]
 ];
 const n=slug.split("/").at(-1);
 return en?[
 ["How do I know if my life path is "+n+"?","Enter your birth date in Koolo. The calculation preserves master numbers rather than collapsing them into one of the nine pages."],
 ["Does life path "+n+" determine my Tarot birth card?","No. The Tarot personality card and the life path are calculated from related but distinct reductions."],
 ["Can number "+n+" predict my personality or future?","No. This page is a cultural interpretation, not a diagnostic or predictive test."]
 ]:[
 ["如何知道生命道路是不是 "+n+"？","在 Koolo 輸入生日即可計算；遇到 11、22、33 主數會保留，不會誤歸入 1～9。"],
 ["生命道路 "+n+" 就代表塔羅出生牌 "+n+" 嗎？","不是。Koolo 的塔羅人格牌和生命道路有不同的縮減規則。"],
 ["數字 "+n+" 可以預測個性或未來嗎？","不可以。這裡是文化象徵解說，不能當成科學測驗或命運預言。"]
 ];
}
function image(slug){const n=slug.split("/").at(-1);return /^[1-9]$/.test(n)?"/fortune/identity/art/tarot-"+n+".webp":cover}
function head(slug,en,d){
 const canonical=url(slug,en),img=ORIGIN+image(slug);
 const crumbs=[{"@type":"ListItem",position:1,name:en?"Home":"首頁",item:ORIGIN+(en?"/en/":"/")},{"@type":"ListItem",position:2,name:en?"Numerology":"生命靈數",item:url("numerology",en)}];
 if(slug!=="numerology")crumbs.push({"@type":"ListItem",position:3,name:d.heading,item:canonical});
 const json={"@context":"https://schema.org","@graph":[{"@type":"WebPage",url:canonical,name:d.title,description:d.description,inLanguage:en?"en":"zh-Hant",isPartOf:{"@id":ORIGIN+"/#website"}},{"@type":"BreadcrumbList",itemListElement:crumbs}]};
 return '<title>'+esc(d.title)+'</title><meta name="description" content="'+esc(d.description)+'"><meta name="robots" content="index,follow">'+
 '<link rel="canonical" href="'+canonical+'">'+
 '<link rel="alternate" hreflang="zh-Hant" href="'+url(slug,false)+'">'+
 '<link rel="alternate" hreflang="en" href="'+url(slug,true)+'">'+
 '<link rel="alternate" hreflang="x-default" href="'+url(slug,false)+'">'+
 '<meta property="og:type" content="article"><meta property="og:title" content="'+esc(d.title)+'"><meta property="og:description" content="'+esc(d.description)+'">'+
 '<meta property="og:url" content="'+canonical+'"><meta property="og:image" content="'+img+'">'+
 '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="'+img+'">'+
 '<script type="application/ld+json">'+JSON.stringify(json).replaceAll("<","\\u003c")+'</script>';
}
function render(slug,en){
 const d=data(slug,en),ctaLabel=en?"Calculate my birth numbers":"計算我的出生數字";
 const track=en?' onclick="try{localStorage.setItem(\'crew_ui_locale_v1\',\'en\')}catch(e){}"':"";
 const cta=place=>'<a class="cta" data-seo-cta="'+place+'" href="/fortune/reading?mode=tarot"'+track+'>'+ctaLabel+' →</a>';
 const paragraphs=d.paragraphs.map(t=>'<p>'+esc(t)+'</p>').join("");
 const qa=faq(slug,en).map(([q,a])=>'<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join("");
 const n=slug.split("/").at(-1);
 const siblings=slug==="numerology"?NUMEROLOGY_SEO_SLUGS.slice(1):[
 "numerology",...NUMEROLOGY_SEO_SLUGS.filter(s=>s!==slug&&s!=="numerology").sort((a,b)=>Math.abs(Number(a.slice(11))-Number(n))-Math.abs(Number(b.slice(11))-Number(n))).slice(0,4)
 ];
 const links=siblings.map(s=>'<li><a href="'+rel(s,en)+'">'+esc(data(s,en).heading)+'</a></li>').join("");
 const css=':root{font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;color:#252d46;background:#f7f8fc}*{box-sizing:border-box}body{margin:0;line-height:1.8}a{color:#4f4da2}header,main,footer{max-width:940px;margin:auto;padding:20px}header{display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap;border-bottom:1px solid #e2e5ef}header a{text-decoration:none;font-weight:700}.brand{font-size:25px}article{background:white;border:1px solid #e4e7f0;border-radius:24px;padding:clamp(20px,5vw,50px);margin:20px 0}h1{font-size:clamp(29px,5vw,43px);line-height:1.24}h2{font-size:22px;margin-top:30px}p{color:#515c77}.lead{font-size:18px}.hero{display:block;width:100%;max-height:420px;object-fit:contain;border-radius:16px;background:#f4f2fc;aspect-ratio:16/9}.cta-box{background:#f2f0fb;border-radius:16px;padding:17px 22px;margin:20px 0}.cta{display:inline-block;padding:12px 24px;background:#3f3a83;color:white;border-radius:12px;min-height:48px;text-decoration:none;font-weight:700}.qa details{border-bottom:1px solid #e4e7f0;padding:12px 0}.qa summary{font-weight:650;cursor:pointer}.notice{font-size:13px;background:#f4f4f9;padding:15px;border-radius:14px}.related ul{padding-left:22px;columns:2}.related li{break-inside:avoid;margin:8px 0}@media(max-width:600px){header,main,footer{padding:14px}.cta{display:block;text-align:center}.related ul{columns:1}}';
 return '<!doctype html><html lang="'+(en?"en":"zh-Hant")+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+head(slug,en,d)+
 '<style>'+css+'</style></head><body>'+
 '<header><a class="brand" href="'+(en?"/en/":"/")+'">Koolo</a><div><a href="'+url(slug,false)+'" lang="zh-Hant">中文</a> · <a href="'+url(slug,true)+'" lang="en">EN</a></div></header>'+
 '<main><article><a href="'+rel("numerology",en)+'">'+(en?"Tarot Numerology":"塔羅生命靈數")+'</a><h1>'+esc(d.heading)+'</h1><p class="lead">'+esc(d.intro)+'</p>'+
 '<div class="cta-box">'+cta("top")+'</div><img class="hero" src="'+image(slug)+'" width="1536" height="864" alt="'+esc(d.heading+(en?" Tarot Numerology illustration":"塔羅生命靈數主題插畫"))+'" loading="eager" decoding="async">'+
 '<h2>'+(en?"How this number is understood":"這個數字怎麼理解")+'</h2>'+paragraphs+
 '<h2>'+(en?"How to check your own birth numbers":"如何查詢自己的生命靈數")+'</h2><ol>'+(en?"<li>Enter your birth date in Koolo's Tarot Numerology tool.</li><li>Compare life path, personality card and soul card: they are not interchangeable.</li><li>Reflect on the result rather than treating it as a forecast.</li>":"<li>進入 Koolo 塔羅生命靈數，輸入出生年月日。</li><li>分開看生命道路、人格牌、靈魂牌，不要混用結果。</li><li>用結果整理自己的問題，而不是視為確定預測。</li>")+'</ol>'+
 '<section class="qa"><h2>'+(en?"Frequently asked questions":"常見問題")+'</h2>'+qa+'</section>'+
 '<p class="notice">'+textDisclaimer(en)+'</p><div class="cta-box">'+cta("bottom")+'</div>'+
 '</article><nav class="related"><h2>'+(en?"Explore related numbers":"探索其他數字")+'</h2><ul>'+links+'</ul></nav></main><footer>© Koolo · '+(en?"Cultural numerology guide":"生命靈數文化知識")+'</footer>'+
 '<script>(function(){document.querySelectorAll("[data-seo-cta]").forEach(function(a){a.addEventListener("click",function(){if(typeof window.gtag==="function")window.gtag("event","fortune_seo_chart_click",{article_slug:"'+slug+'",placement:a.getAttribute("data-seo-cta")});});});})();</script></body></html>';
}
export function writeNumerologySeoPages(out){
 for(const slug of NUMEROLOGY_SEO_SLUGS)for(const en of [false,true]){
  const dest=join(out,(en?"en/":"")+"fortune/"+slug+"/index.html");
  mkdirSync(join(dest,".."),{recursive:true});
  writeFileSync(dest,render(slug,en),"utf8");
 }
}
export function numerologySitemapEntries(lastmod){
 return NUMEROLOGY_SEO_SLUGS.flatMap(slug=>[false,true].map(en=>
 '  <url><loc>'+url(slug,en)+'</loc><lastmod>'+lastmod("fortune/"+slug)+'</lastmod>'+
 '<xhtml:link rel="alternate" hreflang="zh-Hant" href="'+url(slug,false)+'"/>'+
 '<xhtml:link rel="alternate" hreflang="en" href="'+url(slug,true)+'"/>'+
 '<xhtml:link rel="alternate" hreflang="x-default" href="'+url(slug,false)+'"/></url>')).join("\n");
}
