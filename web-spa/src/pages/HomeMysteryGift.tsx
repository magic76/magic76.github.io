import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {createPortal} from "react-dom";
import zoePortrait from "../../../assets/friends/crew_friend_zoe.webp";
import irisPortrait from "../../../assets/friends/crew_friend_iris.webp";
import noahPortrait from "../../../assets/friends/crew_friend_noah.webp";
import yunaPortrait from "../../../assets/friends/crew_friend_yuna.webp";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import "./homeMysteryGift.css";

type GiftKind="friend"|"play"|"souls"|"learn";
type Gift={id:string;kind:GiftKind;name:string;to:string;portrait?:string};

/** All outcomes open real Crew experiences; no purchase, points or prizes. */
const GIFTS:readonly Gift[]=[
 {id:"zoe",kind:"friend",name:"Zoe",to:"/friend/live?id=zoe",portrait:zoePortrait},
 {id:"iris",kind:"friend",name:"Iris",to:"/friend/live?id=iris",portrait:irisPortrait},
 {id:"noah",kind:"friend",name:"Noah",to:"/friend/live?id=noah",portrait:noahPortrait},
 {id:"yuna",kind:"friend",name:"Yuna",to:"/friend/live?id=yuna",portrait:yunaPortrait},
 {id:"1a2b",kind:"play",name:"1A2B",to:"/games/1a2b"},
 {id:"connect4",kind:"play",name:"Connect 4",to:"/games/connect4"},
 {id:"reversi",kind:"play",name:"Reversi",to:"/games/reversi"},
 {id:"souls",kind:"souls",name:"Souls",to:"/souls"},
 {id:"travel",kind:"learn",name:"Crew Teacher",to:"/teacher/course/travel"}
];

function drawGift(previous:string|undefined):Gift{
 const choices=GIFTS.filter(item=>item.id!==previous);
 return choices[Math.floor(Math.random()*choices.length)]!;
}

function GiftBoxArt({opened=false}:{opened?:boolean}){
 return <svg className={"crew-gift-art"+(opened?" is-open":"")} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
  <ellipse cx="36" cy="65" rx="24" ry="4" fill="#bd6c1a" opacity=".18"/>
  <g className="crew-gift-base">
   <rect x="14" y="33" width="44" height="29" rx="5" fill="#FF9A00"/>
   <path d="M36 33h22v24a5 5 0 0 1-5 5H36z" fill="#F38516"/>
   <rect x="32" y="33" width="8" height="29" fill="#FFF2C8"/>
  </g>
  <g className="crew-gift-lid">
   <rect x="10" y="25" width="52" height="15" rx="5" fill="#FFC65B"/>
   <path d="M32 25C17 23 18 11 26 11c7 0 10 8 10 14 5-12 13-16 18-11 7 7-4 12-14 11" fill="none" stroke="#F58F20" strokeWidth="5" strokeLinecap="round"/>
   <path d="M32 25h8v15h-8z" fill="#FFF2C8"/>
  </g>
  <path className="crew-gift-glint" d="m9 15-3-5m57 7 4-5M36 6V2" fill="none" stroke="#FFB432" strokeWidth="3" strokeLinecap="round"/>
 </svg>;
}

/** Crew Dot: orange cloud, right-biased capsule eyes, and a little carried box.
 * Inline vector artwork keeps the floating entry sharp without fetching an asset.
 */
function CrewDotArt({celebrate=false}:{celebrate?:boolean}){
 return <svg className={"crew-gift-dot"+(celebrate?" is-celebrating":"")} viewBox="0 0 112 98" focusable="false" aria-hidden="true">
  <path className="crew-gift-dot-arm" d="M25 63Q12 54 14 42" fill="none" stroke="#F58B00" strokeWidth="9" strokeLinecap="round"/>
  <path className="crew-gift-dot-cloud" d="M29 79C16 79 9 70 9 60c0-11 8-20 19-21 0-15 11-26 25-26 12 0 22 7 26 18 15-1 25 9 25 23 0 14-10 25-26 25Z" fill="#FF9A00"/>
  <g className="crew-gift-dot-eyes" fill="#272127">
   <rect x="59" y="39" width="7" height="17" rx="3.5"/>
   <rect x="77" y="39" width="7" height="17" rx="3.5"/>
  </g>
  <circle className="crew-gift-dot-mouth" cx="73" cy="63" r="4" fill="#272127"/>
  <g className="crew-gift-dot-present">
   <rect x="38" y="64" width="32" height="24" rx="4" fill="#FFCF67"/>
   <rect x="34" y="59" width="40" height="11" rx="3" fill="#FFF0BE"/>
   <path d="M51 60v28" stroke="#E57B26" strokeWidth="5"/>
   <path d="M52 59c-16-2-13-15-6-12 4 2 6 8 6 12 3-8 9-14 14-10 5 5-2 10-14 10" fill="none" stroke="#E57B26" strokeWidth="4" strokeLinecap="round"/>
  </g>
  <path className="crew-gift-dot-spark" d="M18 18v10m-5-5h10M95 12v8m-4-4h8" stroke="#FFC04B" strokeWidth="3" strokeLinecap="round"/>
 </svg>;
}

/** A small destination diorama, not another navigation level. Every card links
 * straight to the existing Crew route supplied by GIFTS.
 */
function GiftWorld({gift}:{gift:Gift}){
 return <div className={"crew-gift-world crew-gift-world-"+gift.kind} aria-hidden="true">
  <span className="crew-gift-world-orbit"/>
  <span className="crew-gift-world-star is-first">✦</span>
  <span className="crew-gift-world-star is-second">✧</span>
  <span className="crew-gift-world-floor"/>
  {gift.kind==="friend"&&gift.portrait&&<img className="crew-gift-world-friend" src={gift.portrait} alt="" loading="eager"/>}
  {gift.kind==="play"&&<div className="crew-gift-world-game"><span>1</span><span>2</span><span>?</span><span>4</span></div>}
  {gift.kind==="souls"&&<div className="crew-gift-world-soul"><i/><i/><b/></div>}
  {gift.kind==="learn"&&<div className="crew-gift-world-book"><i/><i/><b>✦</b></div>}
  <span className="crew-gift-world-guide"><CrewDotArt celebrate/></span>
  <span className="crew-gift-opening-box"><GiftBoxArt opened/></span>
 </div>;
}

export function HomeMysteryGift(){
 const {t}=useTranslation("home");
 const [portalHost,setPortalHost]=useState<HTMLElement|null>(null);
 const [gift,setGift]=useState<Gift|null>(null);
 const [open,setOpen]=useState(false);
 const [minimized,setMinimized]=useState(false);
 const closeRef=useRef<HTMLButtonElement>(null);
 const triggerRef=useRef<HTMLButtonElement>(null);
 const minimizedRef=useRef<HTMLButtonElement>(null);
 const panelRef=useRef<HTMLElement>(null);
 const rootRef=useRef<HTMLDivElement>(null);

 // The animated page shell keeps a transform after entrance; portal outside it
 // so position:fixed is relative to the viewport, not the tall home document.
 useEffect(()=>{setPortalHost(document.body)},[]);
 useEffect(()=>{
  const node=rootRef.current;
  if(!node)return;
  if(!("IntersectionObserver" in window)){
   if(getComputedStyle(node).display!=="none")trackUsageEvent("home_gift_view");
   return;
  }
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)&&getComputedStyle(node).display!=="none"){
    trackUsageEvent("home_gift_view");
    observer.disconnect();
   }
  },{threshold:.5});
  observer.observe(node);
  return()=>observer.disconnect();
 },[portalHost]);
 useEffect(()=>{
  if(!open)return;
  closeRef.current?.focus();
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();setOpen(false)}
   if(event.key!=="Tab"||!panelRef.current)return;
   const items=panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
   const first=items[0],last=items[items.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  };
  window.addEventListener("keydown",onKeyDown);
  return()=>{window.removeEventListener("keydown",onKeyDown);document.body.style.overflow=previousOverflow};
 },[open]);
 useEffect(()=>{if(!open&&gift)(minimized?minimizedRef:triggerRef).current?.focus()},[open,gift,minimized]);

 function unwrap(){
  const next=drawGift(gift?.id);
  setGift(next);
  setOpen(true);
  setMinimized(false);
  trackUsageEvent("home_gift_open");
  trackUsageEvent("home_gift_result",next.kind);
 }
 function minimize(){
  setOpen(false);
  setMinimized(true);
  trackUsageEvent("home_gift_minimize");
 }
 function visit(){
  if(!gift)return;
  trackUsageEvent("home_gift_go",gift.kind);
  trackUsageEvent("home_entry_click",gift.kind);
 }
 const resultName=gift?.kind==="play"?t("playHub.games."+gift.id+".title"):gift?.kind==="learn"?t("product.teacher"):gift?.name;
 const description=gift?.kind?t("gift."+gift.kind+"Description",{name:gift.name}):"";
 return portalHost?createPortal(<div ref={rootRef} className={"crew-mystery-gift"+(minimized?" is-minimized":"")}>
  {minimized?<button ref={minimizedRef} type="button" className="crew-gift-minimized" onClick={()=>setMinimized(false)} aria-label={t("gift.restore")} title={t("gift.restore")}>
   <CrewDotArt/>
  </button>:<button ref={triggerRef} type="button" className={"crew-gift-fab"+(gift?" has-result":"")} onClick={()=>gift?setOpen(true):unwrap()} aria-label={gift?t("gift.reopen"):t("gift.open")} aria-expanded={open} aria-controls={open?"crew-gift-result":undefined} title={gift?t("gift.reopen"):t("gift.title")}>
   <CrewDotArt/>
  </button>}
  {open&&gift&&<>
   <div className="crew-gift-scrim" onClick={()=>setOpen(false)} aria-hidden="true"/>
   <section ref={panelRef} id="crew-gift-result" className={"crew-gift-panel crew-gift-panel-"+gift.kind} role="dialog" aria-modal="true" aria-labelledby="crew-gift-heading" aria-describedby="crew-gift-description">
    <div className="crew-gift-topline">
     <span>{t("gift.title")}</span>
     <button ref={closeRef} type="button" className="crew-gift-close" onClick={()=>setOpen(false)} aria-label={t("gift.close")}>×</button>
    </div>
    <div key={gift.id} className="crew-gift-reveal" aria-live="polite">
     <span className="crew-gift-sparks" aria-hidden="true">✦ <span>✧</span> ✦</span>
     <GiftWorld gift={gift}/>
     <span className="crew-gift-overline">{t("gift.reveal")}</span>
     <h2 id="crew-gift-heading">{resultName}</h2>
     <p id="crew-gift-description">{description}</p>
    </div>
    <Link className="crew-gift-visit" to={gift.to} onClick={visit}>{t("gift.start")} <span aria-hidden="true">→</span></Link>
    <div className="crew-gift-actions">
     <button type="button" onClick={unwrap}>{t("gift.again")}</button>
     <button type="button" onClick={minimize}>{t("gift.minimize")}</button>
    </div>
   </section>
  </>}
  {!gift&&!minimized&&<span className="crew-gift-hint" aria-hidden="true">{t("gift.teaser")}</span>}
 </div>,portalHost):null;
}
