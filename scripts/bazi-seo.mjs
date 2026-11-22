/**
 * Public educational BaZi pages only. Never serialize a visitor's birth chart
 * or expose /fortune/reading, /fortune/live or history as crawlable documents.
 */
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {diagramPath,writeBaziDiagrams,faqFor,relatedFor} from "./bazi-seo-extras.mjs";

export const BAZI_STEMS=[
 ["jia-wood","甲木","Yang Wood","參天大樹","upright tree","成長、原則與方向感","growth, principles and direction","常被比喻為向上生長的大樹，著重長期方向與承擔。","Often compared with a tall tree: steady growth, direction and responsibility.","木","Wood"],
 ["yi-wood","乙木","Yin Wood","柔韌花草","adaptable plants","彈性、連結與細節","flexibility, relationships and detail","常以藤蔓花草作比喻，重視適應環境與持續調整。","Compared with climbing vines and flowers: adaptability and attentive care.","木","Wood"],
 ["bing-fire","丙火","Yang Fire","明亮太陽","radiant sun","熱情、能見度與分享","warmth, visibility and sharing","像太陽向外散發光熱，象徵開放表達與帶動氣氛。","Compared with sunshine: expressive warmth, openness and energy.","火","Fire"],
 ["ding-fire","丁火","Yin Fire","細緻燈火","focused lamplight","觀察、專注與溫度","insight, focus and warmth","像燈火在適當位置照亮細節，象徵專注與細微理解。","Compared with lamplight: focused attention and noticing subtle details.","火","Fire"],
 ["wu-earth","戊土","Yang Earth","厚實高山","solid mountain","穩定、界線與承載","stability, boundaries and support","常以山岳比喻，重視可靠的基礎及清楚界線。","Compared with a mountain: steadiness, structure and dependable support.","土","Earth"],
 ["ji-earth","己土","Yin Earth","滋養田園","fertile garden soil","培育、整理與耐心","nurturing, organization and patience","像細心耕作的田土，重視照顧資源與日常累積。","Compared with cultivated soil: nurturing progress and practical care.","土","Earth"],
 ["geng-metal","庚金","Yang Metal","剛毅礦石","strong forged metal","行動、決斷與規範","action, decisiveness and standards","常與礦石、鍛鍊相關，象徵面對問題時的果斷。","Compared with forged metal: direct action, refinement and resolve.","金","Metal"],
 ["xin-metal","辛金","Yin Metal","精緻珠玉","polished jewel","精準、品質與審美","precision, quality and aesthetics","像打磨的珠玉，重視細節、判斷與適切表達。","Compared with a polished jewel: discernment, refinement and precision.","金","Metal"],
 ["ren-water","壬水","Yang Water","奔流江海","expansive river","視野、流動與探索","perspective, movement and exploration","常以江河大海為喻，象徵整合資訊與開拓視野。","Compared with a great river or sea: movement, breadth and exploration.","水","Water"],
 ["gui-water","癸水","Yin Water","細雨甘露","gentle rain","感受、洞察與滋養","sensitivity, insight and nourishment","像細雨或露水，象徵細膩感受與持續滋養。","Compared with gentle rain: sensitivity, subtle insight and renewal.","水","Water"]
];
const STEM_DETAILS={
 "jia-wood": [
  "甲木以陽木比喻直立的樹幹，和乙木偏重靈活延展的意象不同。討論甲木時，常會問：我是否把原則當成無法調整的規則？",
  "也可觀察自己如何兼顧長期計畫與團隊互動。命盤中的水、火、土、金和季節關係，仍比單一標籤更重要。",
  "Yang Wood is often pictured as an upright tree, unlike Yin Wood's flexible vines. A useful reflection is whether a strong sense of direction leaves room for adaptation.",
  "Explore how plans and responsibility interact with relationships. The chart's season and other elements matter more than the stem alone."
 ],
 "yi-wood": [
  "乙木以陰木比喻花草與藤蔓，重點是能隨環境調整生長方式，不代表一定柔弱。可以思考：什麼時候彈性是優點，什麼時候需要明確界線？",
  "與甲木的大樹比喻不同，乙木強調延伸與相互依靠；但仍須結合日主所在月份及其他干支閱讀。",
  "Yin Wood evokes vines and plants that adapt to their surroundings; it is not a label for weakness. Ask when adaptability helps and when firmer boundaries are useful.",
  "Unlike Yang Wood's upright-tree imagery, this stem emphasizes flexibility and connection. Seasonal context and the other pillars still shape any traditional reading."
 ],
 "bing-fire": [
  "丙火的太陽意象偏向公開、照亮與分享，並不是說丙火日主一定外向。可以觀察自己在表達熱情時，是否也留意別人的節奏。",
  "和丁火的集中燈火相比，丙火常用來討論向外的能量。實際命盤裡火是否得令，以及水、木等元素的作用，都要一起看。",
  "Yang Fire is likened to sunlight—visible and outward-facing—but does not prove that someone is extroverted. Reflect on how enthusiasm can support others without overwhelming them.",
  "Compared with Yin Fire's focused lamp, this imagery emphasizes broad illumination. Season and the relationship with Water and Wood still influence the full chart."
 ],
 "ding-fire": [
  "丁火的燈火意象側重在有限範圍內照明，常用來談細節、專心與穩定的熱度。可以思考：我在哪些情境能把注意力用得恰到好處？",
  "它和丙火的太陽不同，重點不是亮度大小，而是光的使用方式；其他八字元素仍可能帶來不同的傳統象徵。",
  "Yin Fire resembles a lamp that illuminates a focused area. Consider where careful attention makes the biggest difference, and when it may become overthinking.",
  "This contrasts with the broader sunlight image of Yang Fire. The full chart—not brightness alone—determines how that symbolism is traditionally framed."
 ],
 "wu-earth": [
  "戊土以山岳和厚土為意象，常用來討論承擔、規模與邊界。可以問自己：我重視的穩定，是讓事情能運作，還是讓改變變得困難？",
  "相對於己土的耕地意象，戊土更常談結構與支撐，但地支、月令及其他元素不應省略。",
  "Yang Earth uses mountain imagery to discuss structure and dependable boundaries. Ask whether your preference for stability supports progress or sometimes blocks change.",
  "Unlike Yin Earth's cultivated-soil metaphor, this image stresses scale and structure. Other pillars and seasonal influences still matter."
 ],
 "ji-earth": [
  "己土像田園土壤，重視整理、滋養與逐步累積的意象。可思考：照顧他人和管理資源時，是否也為自己保留空間？",
  "與戊土的山岳比喻相比，己土偏向日常培育；但「土」的象徵不能直接推導一個人的健康或收入。",
  "Yin Earth resembles cultivated soil: attentive growth, routines and nurturing resources. Reflect on how to support others without neglecting your own needs.",
  "This differs from Yang Earth's mountain metaphor. Earth symbolism cannot by itself predict health, earnings or personal outcomes."
 ],
 "geng-metal": [
  "庚金常以金屬鍛鍊和刀鋒為喻，著重直接處理問題與經過磨練後的成形。可以問：果斷之外，我是否保留調整判斷的餘地？",
  "與辛金的珠玉相比，庚金的傳統意象更偏向強度與加工過程；仍需要回到四柱整體解讀。",
  "Yang Metal is often pictured as ore or metal being forged: action, resilience and refinement through effort. Ask how decisiveness can coexist with a willingness to revise judgments.",
  "Unlike Yin Metal's polished-jewel image, the metaphor focuses on strength and shaping. It is only one piece of a Four Pillars reading."
 ],
 "xin-metal": [
  "辛金以珠玉和精工為喻，常談細節、品味與精準判斷。可思考：追求品質的同時，我是否容許事情先有不完美的版本？",
  "與庚金的鍛鍊意象相比，辛金更偏向細膩打磨；並不表示辛金日主一定從事藝術或精密工作。",
  "Yin Metal evokes a polished jewel and careful craftsmanship. Consider when high standards help and when a first imperfect draft is more useful.",
  "Compared with Yang Metal's forged-metal image, refinement takes center stage; this does not determine a person's profession or talents."
 ],
 "ren-water": [
  "壬水以江河與海洋比喻流動和廣闊視野，常被用來談多方向探索。可以問：資訊很多時，我如何找到真正重要的方向？",
  "與癸水的細雨意象不同，壬水著重流勢和規模；命盤仍須看季節與水如何和其他元素互動。",
  "Yang Water suggests rivers and seas, a metaphor for broad perspective and exploration. Reflect on how to prioritize when many paths or sources compete for attention.",
  "Unlike Yin Water's gentle-rain image, this symbol emphasizes scale and movement. Seasonal strength and other elements remain essential context."
 ],
 "gui-water": [
  "癸水以細雨和露水作比喻，著重細微觀察、耐心與循序累積。可以問：敏銳感受在哪些時刻幫助我理解別人，又何時讓我過度擔心？",
  "癸水與壬水同屬水，卻以不同尺度描述傳統意象；不能只靠日主就判斷人際關係或運勢。",
  "Yin Water is pictured as gentle rain or dew, suggesting patient observation and gradual renewal. Ask when sensitivity supports understanding and when it leads to unnecessary worry.",
  "It shares Water with Yang Water but operates as a different metaphor. A Day Master alone cannot establish relationship patterns or future luck."
 ]
};
const CONCEPTS=[
 {slug:"five-elements",zh:"八字五行怎麼看？木火土金水的生剋與平衡",en:"Five Elements in BaZi: Wood, Fire, Earth, Metal and Water",introZh:"五行不是五種固定性格標籤，而是傳統命理用來描述元素關係、季節力量與互動的語言。",introEn:"The Five Elements are a traditional framework for relationships, seasonality and interaction, not fixed personality labels.",bodyZh:["木、火、土、金、水之間有相生與相剋關係：木生火、火生土、土生金、金生水、水生木；木剋土、土剋水、水剋火、火剋金、金剋木。","八字五行判讀不能只數每個字出現幾次。月令、天干地支、藏干和整體組合都會影響傳統判讀。","所謂缺一種五行不等於一定要補一種元素；需要看整個命盤，不宜只靠單一數字下結論。"],bodyEn:["The generating cycle runs Wood → Fire → Earth → Metal → Water → Wood. The controlling cycle runs Wood → Earth → Water → Fire → Metal → Wood.","BaZi interpretation considers season, heavenly stems, earthly branches and hidden stems. Counting character occurrences alone is incomplete.","An apparently missing element is not automatically something to supplement. The whole chart matters more than a single tally."]},
 {slug:"ten-gods",zh:"八字十神是什麼？比肩、食傷、財官印入門",en:"The Ten Gods in BaZi: A Practical Introduction",introZh:"十神是以日主為基準，依五行生剋及陰陽關係建立的十種相對角色，不是十位神明。",introEn:"The Ten Gods are ten relational categories derived from the Day Master, element interactions and yin-yang polarity—not literal deities.",bodyZh:["十神包括比肩、劫財、食神、傷官、正財、偏財、正官、七殺、正印與偏印。","同一個天干對不同日主可能對應不同十神，因此必須先知道日主，再談十神分布。","十神可用來整理資源、表達、規範及同儕關係等傳統命理主題，但不能直接判定職業、婚姻或財富結果。"],bodyEn:["The ten categories are Friend, Rob Wealth, Eating God, Hurting Officer, Direct Wealth, Indirect Wealth, Direct Officer, Seven Killings, Direct Resource and Indirect Resource.","A stem maps to different Ten Gods depending on the Day Master. Identify the Day Master before interpreting those relationships.","These are symbolic lenses on expression, resources, structure and peers, not deterministic predictions about career, marriage or money."]},
 {slug:"luck-cycles",zh:"八字大運流年怎麼看？十年大運與每年變化",en:"BaZi Luck Pillars and Annual Cycles Explained",introZh:"大運通常分十年階段，流年則以每年的干支為觀察單位；解讀時要和出生四柱一起看。",introEn:"Luck pillars are traditionally read in roughly ten-year periods; annual cycles refer to each year's stem and branch in relation to the natal chart.",bodyZh:["起運時間和大運順逆的推算涉及出生日期、時間、節氣及所採用的計算規則，並非人人從整數年齡開始。","看流年時不能只以生肖或當年五行判斷，還會比對日主、原局四柱、大運與干支關係。","時間週期適合拿來整理人生規劃的提問，但不能作為保證發生事件的預言。"],bodyEn:["The starting age and direction of luck pillars depend on birth data, solar terms and the calculation convention. They do not necessarily begin at a round-number age.","Annual interpretation compares the year with the Day Master, natal four pillars and the active luck pillar—not just the zodiac animal.","Treat these cycles as prompts for reflection and planning, not guaranteed forecasts of future events."]}
];
export const BAZI_SEO_SLUGS=["bazi",...BAZI_STEMS.map(s=>"bazi/"+s[0]),...CONCEPTS.map(c=>"bazi/"+c.slug)];
const BAZI_ARTWORK={"jia-wood":"bazi-jia.webp","yi-wood":"bazi-yi.webp","bing-fire":"bazi-bing.webp","ding-fire":"bazi-ding.webp","wu-earth":"bazi-wu.webp","ji-earth":"bazi-ji.webp","geng-metal":"bazi-geng.webp","xin-metal":"bazi-xin.webp","ren-water":"bazi-ren.webp","gui-water":"bazi-gui.webp"};
const imageFor=slug=>{
 const stem=slug.startsWith("bazi/")?slug.slice(5):"";
 return BAZI_ARTWORK[stem]?"/fortune/identity/art/"+BAZI_ARTWORK[stem]:"/fortune/modes/fortune-bazi-cover.webp";
};
const ORIGIN="https://koolo.app";
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const url=(slug,lang)=>ORIGIN+"/"+(lang==="en"?"en/":"")+"fortune/"+slug+"/";
const localePath=(slug,lang)=>"/"+(lang==="en"?"en/":"")+"fortune/"+slug+"/";
const disclaimer=(lang)=>lang==="en"?"Traditional cultural interpretation for reflection only; not medical, legal or financial advice.":"內容屬傳統文化與自我探索，不應替代醫療、法律或財務專業建議。";
function pageData(slug,lang){
 const en=lang==="en";
 if(slug==="bazi")return {title:en?"Free BaZi Chart: Four Pillars and Day Master | Koolo":"免費八字排盤｜四柱、日主、五行與大運｜Koolo",description:en?"Learn what a BaZi Four Pillars chart contains, then use Koolo's birth-chart tool to explore Day Master, elements, Ten Gods and luck cycles.":"認識四柱八字、日主、五行、十神與大運，再到 Koolo 輸入出生資料免費排盤。提供十天干入門與傳統命理知識。",heading:en?"BaZi: understand your Four Pillars":"八字排盤：從四柱認識自己的命盤",intro:en?"BaZi uses birth year, month, day and hour to construct four stem-and-branch pillars. Start by identifying the Day Master, then explore relationships among elements, Ten Gods and time cycles.":"八字依出生年、月、日、時組成四柱。先認識日主，再從五行、十神與時間週期理解傳統命理的觀察方式。",body:en?["Each pillar combines a Heavenly Stem and an Earthly Branch. The day pillar's Heavenly Stem is called the Day Master.","Accurate chart calculations require a birth date and time as well as an applicable timezone and solar-term convention. An unknown hour can limit interpretation.","A single Day Master label is not a complete reading: month season, other pillars and their relationships provide important context."]:["每柱由天干與地支組成，共有年柱、月柱、日柱與時柱。日柱的天干稱為「日主」。","排盤需要出生年月日、時間及時區資訊，部分計算還涉及節氣。若出生時辰未知，解讀會受到限制。","日主只是起點，月令、其他干支與彼此關係也重要，不應只用單一命格標籤概括一個人。"]};
 const stem=BAZI_STEMS.find(s=>slug==="bazi/"+s[0]);
 if(stem){
  const extra=STEM_DETAILS[stem[0]];
  const name=en?stem[2]:stem[1];
  const element=en?stem[10]:stem[9];
  return {title:en?name+" Day Master Meaning and Traits | Koolo BaZi":stem[1]+"日主是什麼？"+stem[3]+"的命格解析｜Koolo 八字",
   description:en?"Explore the traditional meaning of the "+name+" Day Master ("+stem[4]+"), its "+element+" symbolism, and how to read it in a full Four Pillars chart.":stem[1]+"屬"+element+"，以「"+stem[3]+"」為常見意象。了解"+stem[1]+"日主的象徵、五行關係，以及為何需配合完整八字解讀。",
   heading:en?name+" Day Master":stem[1]+"日主："+stem[3],
   intro:en?stem[8]:stem[7],
   body:en?["This is the "+(stem[0].startsWith("jia")||stem[0].startsWith("bing")||stem[0].startsWith("wu")||stem[0].startsWith("geng")||stem[0].startsWith("ren")?"yang":"yin")+" expression of "+element+" within the Ten Heavenly Stems.","In traditional BaZi, the Day Master describes one symbolic reference point. Season, supporting elements, and all four pillars modify the interpretation.","The themes often associated with this stem include "+stem[6]+". They are prompts for self-reflection, not a test of a person's personality or fate."].concat(extra.slice(2)):["在十天干中，"+stem[1]+"屬"+element+"，以"+stem[3]+"描繪其傳統意象。","日主代表八字日柱的天干，並非獨立的性格測驗。月令、四柱與五行互動都會改變實際命盤的判讀。","此日主常被用來討論「"+stem[5]+"」等主題；這是文化象徵，不是對人格或人生結果的確定預測。"].concat(extra.slice(0,2))};
 }
 const concept=CONCEPTS.find(c=>slug==="bazi/"+c.slug);
 if(!concept)throw Error("Unknown BaZi SEO slug: "+slug);
 return {title:(en?concept.en:concept.zh)+"｜Koolo",description:en?concept.introEn+" Read a practical explanation and start a free BaZi chart.":concept.introZh+"附基本觀念、常見誤解與八字排盤入口。",heading:en?concept.en:concept.zh,intro:en?concept.introEn:concept.introZh,body:en?concept.bodyEn:concept.bodyZh};
}
function head(slug,lang,d){
 const en=lang==="en",canonical=url(slug,lang),image=ORIGIN+imageFor(slug);
 const structured={"@context":"https://schema.org","@graph":[{"@type":"WebPage","@id":canonical+"#webpage",url:canonical,name:d.title,description:d.description,inLanguage:en?"en":"zh-Hant",isPartOf:{"@id":ORIGIN+"/#website"}},{"@type":"BreadcrumbList",itemListElement:slug==="bazi"?[{"@type":"ListItem",position:1,name:en?"Home":"首頁",item:ORIGIN+(en?"/en/":"/")},{"@type":"ListItem",position:2,name:en?"BaZi":"八字",item:canonical}]:[{"@type":"ListItem",position:1,name:en?"Home":"首頁",item:ORIGIN+(en?"/en/":"/")},{"@type":"ListItem",position:2,name:en?"BaZi":"八字",item:url("bazi",lang)},{"@type":"ListItem",position:3,name:d.heading,item:canonical}]}]};
 return '<title>'+esc(d.title)+'</title>\n<meta name="description" content="'+esc(d.description)+'">\n<meta name="robots" content="index,follow">\n<link rel="canonical" href="'+canonical+'">\n<link rel="alternate" hreflang="zh-Hant" href="'+url(slug,"zh")+'">\n<link rel="alternate" hreflang="en" href="'+url(slug,"en")+'">\n<link rel="alternate" hreflang="x-default" href="'+url(slug,"zh")+'">\n<meta property="og:type" content="article">\n<meta property="og:title" content="'+esc(d.title)+'">\n<meta property="og:description" content="'+esc(d.description)+'">\n<meta property="og:url" content="'+canonical+'">\n<meta property="og:locale" content="'+(en?"en_US":"zh_TW")+'">\n<meta property="og:image" content="'+image+'">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="'+image+'">\n<script type="application/ld+json">'+JSON.stringify(structured).replaceAll("<","\\u003c")+'</script>';
}
function render(slug,lang){
 const d=pageData(slug,lang),en=lang==="en";
 const stem=BAZI_STEMS.find(row=>slug==="bazi/"+row[0]);
 const related=relatedFor(slug,BAZI_SEO_SLUGS);
 const links=related.map(other=>'<li><a href="'+localePath(other,lang)+'">'+esc(pageData(other,lang).heading)+'</a></li>').join("");
 const sections=d.body.map(p=>'<p>'+esc(p)+'</p>').join("");
 const extraFaq=faqFor(slug,lang,stem).map(({q,a})=>'<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join("");
 const label=en?"Start your free BaZi chart":"開始免費八字排盤";
 const readingHref="/fortune/reading?mode=bazi";
 const enLocale=en?' onclick="try{localStorage.setItem(\'crew_ui_locale_v1\',\'en\')}catch(e){}"':"";
 const cta=(location)=>'<a class="cta" href="'+readingHref+'" data-seo-cta="'+location+'"'+enLocale+'>'+label+' →</a>';
 const diagram=diagramPath(slug),image=diagram||imageFor(slug),heroLabel=en?d.heading+" explanatory illustration":d.heading+"主題示意圖";
 const lead=en?"Learn the basics, then explore your own chart.":"先了解命理觀念，再探索自己的命盤。";
 const htmlCss=':root{font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;color:#1d2841;background:#f8f9fd}*{box-sizing:border-box}body{margin:0;line-height:1.75}a{color:#344fa5}header,main,footer{max-width:940px;margin:auto;padding:20px}header{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border-bottom:1px solid #e3e7f0}header a{text-decoration:none;font-weight:650}.brand{font-size:24px;font-weight:850}.lang{display:flex;gap:12px}article{background:white;border:1px solid #e3e7f0;border-radius:22px;padding:clamp(22px,5vw,54px);margin:24px 0}h1{font-size:clamp(28px,5vw,42px);line-height:1.28;letter-spacing:-.025em}h2{font-size:22px;margin-top:32px}.bazi-hero{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:contain;border-radius:16px;background:#f1f4fb;margin:20px 0}p{color:#4c5770}.lead{font-size:18px;color:#303d59}.cta-box{background:#eef3fc;border:1px solid #dae4f5;border-radius:16px;padding:18px 22px;margin:20px 0}.cta-box p{margin:2px 0 10px;font-size:14px}.cta{display:inline-block;background:#253a77;color:white;border-radius:12px;padding:12px 24px;min-height:48px;text-decoration:none;font-weight:750}.cta:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #647ecc;outline-offset:3px}.related ul{columns:1;padding-left:22px}.related li{margin:8px 0}.notice{font-size:13px;background:#f1f4fb;border-radius:12px;padding:12px 16px}.faq details{border-bottom:1px solid #e1e6f1;padding:12px 0}.faq summary{cursor:pointer;font-weight:650}.faq details p{margin:8px 0 0}.reading-steps{padding-left:24px}.reading-steps li{margin:7px 0}footer{font-size:13px;color:#606d81}@media(min-width:750px){.related ul{columns:2}}@media(max-width:600px){header,main,footer{padding:14px}article{padding:20px}h1{font-size:28px}.cta{width:100%;text-align:center}.cta-box{padding:16px}}';
 return '<!doctype html>\n<html lang="'+(en?"en":"zh-Hant")+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+head(slug,lang,d)+
 '<style>'+htmlCss+'</style></head><body>'+
 '<header><a class="brand" href="'+(en?"/en/":"/")+'">Koolo</a><div class="lang"><a href="'+url(slug,"zh")+'" lang="zh-Hant" '+(!en?'aria-current="page"':"")+'>中文</a><a href="'+url(slug,"en")+'" lang="en" '+(en?'aria-current="page"':"")+'>EN</a></div></header>'+
 '<main><article><a href="'+localePath("bazi",lang)+'">'+(en?"BaZi guide":"八字入門")+'</a><h1>'+esc(d.heading)+'</h1><p class="lead">'+esc(d.intro)+'</p>'+
 '<div class="cta-box"><p>'+lead+'</p>'+cta("top")+'</div>'+
 '<img class="bazi-hero" src="'+image+'" width="1200" height="675" alt="'+esc(heroLabel)+'" loading="eager" decoding="async">'+
 '<h2>'+(en?"Meaning and context":"傳統含義與判讀重點")+'</h2>'+sections+
 '<h2>'+(en?"How to start your chart":"如何開始排出自己的八字")+'</h2><ol class="reading-steps">'+
 (en?'<li>Open the free BaZi chart and enter your birth date and local time.</li><li>Review the Day Master and the four pillars, noting any uncertainty in birth time.</li><li>Explore the five elements and related concepts in context; use AI follow-up questions for reflection.</li>':'<li>開啟免費八字排盤，填入出生年月日、時間與出生地相關資訊。</li><li>查看四柱及日主；若出生時辰不確定，應留意解讀限制。</li><li>從五行與十神關係理解整體命盤，也可以接續向 AI 提問。</li>')+
 '</ol><section class="faq"><h2>'+(en?"Frequently asked questions":"常見問題")+'</h2>'+extraFaq+'</section>'+
 '<p class="notice">'+disclaimer(lang)+'</p><div class="cta-box"><p>'+lead+'</p>'+cta("bottom")+'</div>'+
 '<p>'+(en?"Personal birth details are entered only in the separate chart experience; this public page does not include your chart.":"個人出生資料只在另外的排盤流程輸入；本公開知識頁不包含你的命盤。")+'</p></article>'+
 '<nav class="related" aria-label="'+(en?"Related BaZi topics":"相關八字主題")+'"><h2>'+(en?"Related reading":"延伸閱讀")+'</h2><ul>'+links+'</ul><a href="'+localePath("bazi",lang)+'">'+(en?"Explore the full BaZi guide":"查看完整八字主題目錄")+'</a></nav></main>'+
 '<footer>© Koolo · '+(en?"BaZi cultural learning":"八字文化知識")+'</footer>'+
 '<script>(function(){var c=document.querySelectorAll("[data-seo-cta]");for(var i=0;i<c.length;i++){c[i].addEventListener("click",function(){if(typeof window.gtag==="function")window.gtag("event","fortune_seo_chart_click",{article_slug:"'+slug+'",placement:this.getAttribute("data-seo-cta")});});}})();</script></body></html>';
}
export function writeBaziSeoPages(out){
 writeBaziDiagrams(out);
 for(const slug of BAZI_SEO_SLUGS)for(const lang of ["zh","en"]){
  const target=join(out,(lang==="en"?"en/":"")+"fortune/"+slug+"/index.html");
  mkdirSync(join(target,".."),{recursive:true});
  writeFileSync(target,render(slug,lang),"utf8");
 }
}
export function baziSitemapEntries(lastmod){
 return BAZI_SEO_SLUGS.flatMap(slug=>["zh","en"].map(lang=>
  '  <url><loc>'+url(slug,lang)+'</loc><lastmod>'+lastmod("fortune/"+slug)+'</lastmod>'+
  '<xhtml:link rel="alternate" hreflang="zh-Hant" href="'+url(slug,"zh")+'"/>'+
  '<xhtml:link rel="alternate" hreflang="en" href="'+url(slug,"en")+'"/>'+
  '<xhtml:link rel="alternate" hreflang="x-default" href="'+url(slug,"zh")+'"/></url>'
 )).join("\n");
}
