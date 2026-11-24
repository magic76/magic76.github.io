import {useLayoutEffect,useEffect,useRef} from "react";
import {Link,useLocation,useSearchParams,useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {FortuneBaziWebsiteReading} from "./FortuneBaziWebsiteReading";
import {hasPremiumTrial,readPremiumChart,readPremiumTrials,premiumHref} from "./premiumStore";
import "./fortunePremium.css";

export function FortunePremiumPage(){
 const {i18n}=useTranslation(),locale=i18n.resolvedLanguage||i18n.language,zh=/^zh(?:-|$)/i.test(locale),c=(z:string,e:string)=>zh?z:e;
 const [params]=useSearchParams(),location=useLocation(),navigate=useNavigate();
 const id=params.get("history")||"",chapter=params.get("chapter"),reading=id?readPremiumChart(id):null,allowed=!!reading&&hasPremiumTrial(id);
 const justUnlocked=allowed&&location.state?.justUnlocked===true;
 const first=useRef(true);
 useLayoutEffect(()=>{
  window.scrollTo({top:0,behavior:"instant"});
  document.querySelector<HTMLElement>("[data-premium-focus]")?.focus({preventScroll:true});
 },[id,chapter]);
 useEffect(()=>{
  if(!justUnlocked||!first.current)return;
  first.current=false;
  // Visual reveal is non-blocking; no artificial loading or payment claim.
  if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){try{navigator.vibrate?.(18)}catch{}}
  const timer=window.setTimeout(()=>navigate(location.pathname+location.search,{replace:true,state:null,preventScrollReset:true}),850);
  return()=>window.clearTimeout(timer);
 },[justUnlocked,location.pathname,location.search,navigate]);
 if(allowed&&reading)return <FortuneBaziWebsiteReading reading={reading} locale={locale} chapter={chapter} justUnlocked={justUnlocked}/>;
 const trials=readPremiumTrials();
 return <div className="fortune-premium"><nav className="fortune-premium-breadcrumb"><Link to="/fortune/history">← {c("命盤歷史","Chart history")}</Link><Link to="/fortune">{c("命理首頁","Fortune home")}</Link></nav>
 <header className="fortune-premium-cover fortune-premium-library-head"><div className="fortune-premium-cover-copy"><span className="fortune-premium-kicker">KOOLO FORTUNE · PREMIUM</span><h1 tabIndex={-1} data-premium-focus>{c("我的人生解析","My life readings")}</h1><p>{c("你已解鎖的專屬報告，隨時回來閱讀。","Return to the personal readings you have unlocked.")}</p></div></header>
 {id&&<section className="fortune-premium-panel" role="status"><h2>{reading?c("這份命盤尚未解鎖","This chart is not unlocked"):c("找不到這份命盤","This chart is unavailable")}</h2><p>{reading?c("請先回到原命盤，免費解鎖完整人生解析。","Return to your chart to unlock the free trial."):c("這份命盤可能已刪除，或保存在其他瀏覽器。","It may have been deleted or saved in another browser.")}</p><Link className="fortune-premium-primary" to={reading?"/fortune/reading?history="+encodeURIComponent(id):"/fortune/history"}>{c("返回命盤紀錄","Return to charts")} →</Link></section>}
 {trials.length?<div className="fortune-premium-library">{trials.map(x=><Link key={x.id} className="fortune-premium-panel fortune-premium-library-card" to={premiumHref(x.id)}><div><span className="fortune-premium-label">{c("已解鎖 · 免費體驗","Unlocked · Free trial")}</span><h2>{x.dayMaster} · {c("完整人生解析","Full life reading")}</h2><small>{x.summary}{x.createdAt?" · "+x.createdAt.slice(0,10):""}</small></div><span aria-hidden="true">→</span></Link>)}</div>:<section className="fortune-premium-panel"><h2>{c("你的第一份人生解析","Your first life reading")}</h2><p>{c("先建立八字命盤，再免費解鎖完整的人生解析。","Create a BaZi chart, then unlock your full reading free.")}</p><Link className="fortune-premium-primary" to="/fortune/reading?mode=bazi">{c("建立命盤","Create chart")} →</Link></section>}
 <p className="fortune-premium-note">{c("這些免費體驗紀錄僅保存在目前瀏覽器，並非正式購買紀錄。","These free trial records are saved only in this browser, not paid purchases.")}</p></div>
}
