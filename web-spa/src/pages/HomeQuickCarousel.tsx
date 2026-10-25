import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";

type Action={id:string;to:string;icon:IconName;title:string;description:string};

export function HomeQuickCarousel(){
 const {t,i18n}=useTranslation("home");
 const {t:tCommon}=useTranslation("common");
 const trackRef=useRef<HTMLDivElement>(null);
 const [position,setPosition]=useState({index:0,canPrevious:false,canNext:true});
 const actions:Action[]=[
  {id:"chat",to:"/chat",icon:"chat",title:tCommon("nav.chat"),description:t("world.modes.chat.cta")},
  {id:"learn",to:"/learn",icon:"teacher",title:tCommon("nav.learn"),description:t("world.modes.learn.cta")},
  {id:"play",to:"/games",icon:"play",title:t("product.play"),description:t("world.modes.play.cta")},
  {id:"explore",to:"/explore",icon:"sparkles",title:tCommon("nav.explore"),description:t("world.explore")}
 ];
 const syncPosition=()=>{
  const track=trackRef.current;
  if(!track)return;
  const cards=Array.from(track.children) as HTMLElement[];
  if(!cards.length)return;
  const first=cards[0].offsetLeft;
  let closest=0,nearest=Infinity;
  cards.forEach((card,index)=>{
   const distance=Math.abs(track.scrollLeft-(card.offsetLeft-first));
   if(distance<nearest){nearest=distance;closest=index}
  });
  const canPrevious=track.scrollLeft>2;
  const canNext=track.scrollLeft<track.scrollWidth-track.clientWidth-2;
  setPosition(previous=>previous.index===closest&&previous.canPrevious===canPrevious&&previous.canNext===canNext
   ?previous:{index:closest,canPrevious,canNext});
 };
 useEffect(()=>{
  syncPosition();
  const track=trackRef.current;
  if(!track||typeof ResizeObserver==="undefined")return;
  const observer=new ResizeObserver(syncPosition);
  observer.observe(track);
  return()=>observer.disconnect();
 },[]);
 const move=(direction:number)=>{
  const track=trackRef.current;
  if(!track)return;
  const cards=Array.from(track.children) as HTMLElement[];
  if(!cards.length)return;
  const index=Math.min(cards.length-1,Math.max(0,position.index+direction));
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  track.scrollTo({left:cards[index].offsetLeft-cards[0].offsetLeft,behavior:reduced?"auto":"smooth"});
 };
 const chinese=i18n.language.startsWith("zh");
 return <section className="crew-home-carousel" aria-label={t("actions.label")}>
  <div className="crew-home-carousel-head">
   <h2>{t("actions.label")}</h2>
   <div className="crew-home-carousel-controls">
    <span className="crew-home-carousel-progress" aria-hidden="true">{String(position.index+1).padStart(2,"0")} / 04</span>
    <button type="button" aria-label={chinese?"上一個功能":"Previous action"} disabled={!position.canPrevious} onClick={()=>move(-1)}><span aria-hidden="true">‹</span></button>
    <button type="button" aria-label={chinese?"下一個功能":"Next action"} disabled={!position.canNext} onClick={()=>move(1)}><span aria-hidden="true">›</span></button>
   </div>
  </div>
  <div className="crew-home-quick-actions" ref={trackRef} onScroll={syncPosition} role="region"
   aria-roledescription="carousel" aria-label={t("actions.label")} tabIndex={0}>
   {actions.map((item,index)=><Link key={item.id} to={item.to} className={"crew-home-action crew-home-action-"+item.id}
    aria-label={item.title+" · "+item.description+" ("+(index+1)+"/"+actions.length+")"}>
    <span className="crew-home-action-icon" aria-hidden="true"><Icon name={item.icon}/></span>
    <span><strong>{item.title}</strong><small>{item.description}</small></span>
    <span className="crew-home-action-arrow" aria-hidden="true">↗</span>
   </Link>)}
  </div>
 </section>;
}
