import {Link,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./fortuneReportSample.css";

export function FortuneReportSamplePage(){
 const {i18n}=useTranslation();
 const zh=/^zh(?:-|$)/i.test(i18n.resolvedLanguage||i18n.language);
 const copy=(z:string,e:string)=>zh?z:e;
 const [searchParams]=useSearchParams();
 const historyId=searchParams.get("history");
 const backTo=historyId&&/^reading_\d+$/.test(historyId)?"/fortune/reading?history="+encodeURIComponent(historyId):"/fortune/reading?mode=bazi";
 const chapters=[
  [copy("01 · 命格底色","01 · Your core pattern"),copy("從命盤理解你的特質、優勢，以及在壓力下容易重複的選擇。","Understand your strengths, tendencies, and recurring patterns under stress.")],
  [copy("02 · 五行與人生節奏","02 · The five elements"),copy("用清楚的視覺圖解，帶你看懂五行之間的互動與平衡。","A clear visual guide to the interaction and balance of the five elements.")],
  [copy("03 · 事業與財運","03 · Work and money"),copy("把命理脈絡連回現實，整理適合思考的職涯方向與金錢習慣。","Connect chart themes to practical career decisions and financial habits.")],
  [copy("04 · 感情與人際","04 · Relationships"),copy("回顧你重視的關係模式，探索溝通與相處的可能性。","Explore how you connect, communicate, and navigate relationships.")],
  [copy("05 · 大運與流年","05 · Longer-term cycles"),copy("以時間軸整理接下來值得關注的主題，而不是保證事件會發生。","A timeline of themes to reflect on, not guaranteed future events.")],
  [copy("06 · 老師給你的話","06 · A closing letter"),copy("回到你親自提出的問題，留下一段值得反覆閱讀的個人指引。","A thoughtful closing letter addressing the questions you submitted.")]
 ];
 return <main className="fortune-sample">
  <nav className="fortune-sample-nav" aria-label={copy("命書導覽","Report navigation")}>
   <Link to={backTo}>{copy("‹ 返回命理","‹ Back to fortune")}</Link>
   <span>{copy("專屬命書 · 示範樣本","Personal destiny book · Sample")}</span>
  </nav>
  <header className="fortune-sample-intro">
   <span className="fortune-sample-eyebrow">KOOLO FORTUNE / PERSONAL EDITION</span>
   <h1>{copy("一本只為你整理的命書","A destiny book made for you")}</h1>
   <p>{copy("NT$379 專屬命書的排版與內容方向。以下是虛構示範，並非根據你的命盤計算，也不是已購買的報告。","A preview of the NT$379 book's layout and content. The example is fictional, not calculated from your birth chart or a purchased report.")}</p>
  </header>
  <div className="fortune-sample-spread">
   <section className="fortune-sample-cover" aria-label={copy("示範封面","Sample cover")}>
    <div className="fortune-sample-cover-top"><span>KOOLO</span><span>FORTUNE ATELIER</span></div>
    <div className="fortune-sample-sigil" aria-hidden="true"><span>命</span><i/></div>
    <div className="fortune-sample-cover-title"><small>PERSONAL DESTINY BOOK</small><h2>{copy("專屬命書","Destiny Book")}</h2><p>{copy("認識自己 · 理解人生的節奏","Know yourself · Find your rhythm")}</p></div>
    <div className="fortune-sample-cover-bottom"><span>{copy("示範版本","SAMPLE EDITION")}</span><span>2026</span></div>
   </section>
   <section className="fortune-sample-paper" aria-label={copy("內頁示範","Sample inside page")}>
    <div className="fortune-sample-page-head"><span>{copy("第 02 章","CHAPTER 02")}</span><span>THE FIVE ELEMENTS</span></div>
    <h2>{copy("五行，不只是五種個性","Five elements, many dimensions")}</h2>
    <p className="fortune-sample-lede">{copy("每個人都有自己的節奏。命盤提供的是一個觀察角度，真正的選擇仍在你手中。","Each person has a unique rhythm. A birth chart offers a lens for reflection; your choices remain your own.")}</p>
    <div className="fortune-sample-elements" aria-label={copy("五行示意圖，非真實命盤","Illustrative five-element chart, not an actual reading")}>
     <div className="fortune-sample-element e-wood"><b>{copy("木","WOOD")}</b><span>{copy("生長","Growth")}</span></div>
     <div className="fortune-sample-element e-fire"><b>{copy("火","FIRE")}</b><span>{copy("行動","Action")}</span></div>
     <div className="fortune-sample-element e-earth"><b>{copy("土","EARTH")}</b><span>{copy("穩定","Balance")}</span></div>
     <div className="fortune-sample-element e-metal"><b>{copy("金","METAL")}</b><span>{copy("界線","Clarity")}</span></div>
     <div className="fortune-sample-element e-water"><b>{copy("水","WATER")}</b><span>{copy("思考","Insight")}</span></div>
    </div>
    <div className="fortune-sample-quote"><span>✦</span><p>{copy("真正值得理解的，從來不是命好不好，而是你如何運用自己的特質。","What matters is not whether a chart is good or bad, but how you use your strengths.")}</p></div>
    <div className="fortune-sample-page-foot"><span>{copy("內容示意 · 非個人判讀","Illustrative content · Not a personal reading")}</span><span>02</span></div>
   </section>
  </div>
  <section className="fortune-sample-letter" aria-label={copy("個人提問示範","Personal-question sample")}>
   <div className="fortune-sample-letter-heading"><span>{copy("內頁選摘 / 第 06 章","SELECTED PAGE / CHAPTER 06")}</span><h2>{copy("老師給你的話","A letter for your journey")}</h2></div>
   <blockquote>
    {copy("「我最近想轉換工作方向，該怎麼思考？」","“I'm thinking about changing careers. How should I approach it?”")}
   </blockquote>
   <p>{copy("一份好的解讀，不該替你決定去留，而是幫你看清：你最重視的工作方式是什麼、目前欠缺哪些資訊，以及接下來能採取哪個小步驟。正式報告會結合購買時提供的命盤與個人問題撰寫。","A thoughtful reading shouldn't decide for you. It should help clarify your values, what information is missing, and the next useful step. The actual report will be written using your submitted chart and personal questions.")}</p>
   <p className="fortune-sample-handwriting">{copy("願你帶著清楚與從容，走向下一段人生。","May you find clarity and move forward at your own pace.")}</p>
  </section>
  <section className="fortune-sample-chapters" aria-label={copy("完整報告規劃","Planned report chapters")}>
   <h2>{copy("正式命書預計包含","Planned chapters in the full book")}</h2>
   <div className="fortune-sample-chapter-grid">
    {chapters.map(([title,description])=><article key={title}><h3>{title}</h3><p>{description}</p></article>)}
   </div>
  </section>
  <footer className="fortune-sample-footer">
   <strong>{copy("NT$379 · 專屬命書","NT$379 · Personal destiny book")}</strong>
   <p>{copy("目前為樣本展示，尚未開放購買。正式推出時會說明內容、交付時間與 PDF 下載方式。所有解讀皆由 AI 生成，供自我探索與娛樂參考。","Preview only; purchasing is not available. Final scope, delivery time and PDF availability will be confirmed before launch. Readings are AI-generated for reflection and entertainment.")}</p>
   <Link className="fortune-sample-back" to={backTo}>{copy("回到命盤與方案介紹","Back to your chart and plans")}</Link>
  </footer>
 </main>;
}
