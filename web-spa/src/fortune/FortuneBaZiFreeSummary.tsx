import"./fortuneBaZiFree.css";
import{useTranslation}from"react-i18next";
import{buildLocalReport}from"./report";
import{formatFortuneProse}from"./displayNumber";
import{useRouteNamespace}from"../i18n/useRouteNamespace";
export function FortuneBaZiFreeSummary({result}:{result:any}){
 const{t,i18n}=useTranslation("fortune");
 const{t:reportT}=useTranslation("fortuneReport");
 const ready=useRouteNamespace("fortuneReport");
 const chapters=buildLocalReport("bazi",result,ready&&i18n.resolvedLanguage!=="zh-TW"?(key,options)=>String(reportT(key,options)):undefined);
 const ids=["personality","career","wealth","relationships","currentCycle"];
 const items=ids.map(id=>chapters.find(chapter=>chapter.id===id)).filter((x):x is NonNullable<typeof x>=>Boolean(x));
 const summarize=(value:string)=>{const first=value.split(/[。！？]/)[0]?.trim()||value;return formatFortuneProse(first.length>90?first.slice(0,90).trimEnd()+"…":first+"。");};
 return <section className="fortune-bazi-free" aria-label={t("reading.reportTitle")}>
  <header><span className="kicker">KOOLO FORTUNE · FREE</span><h3>{t("reading.reportTitle")}</h3><p>免費查看命格核心與人生主題摘要；完整分析仍在規劃中。</p></header>
  <div className="fortune-bazi-free-grid">{items.map(item=><article key={item.id} className="fortune-bazi-free-topic"><h4>{t("reading.topic."+item.id)}</h4><p>{summarize(item.text)}</p></article>)}</div>
  <small>{t("reading.disclaimer")}</small>
 </section>;
}
