import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import "./homeMysteryGift.css";

type GiftKind="friend"|"play"|"souls"|"learn";
type Gift={id:string;kind:GiftKind;name:string;to:string};

/** All outcomes open real Crew experiences; no purchase, points or prizes. */
const GIFTS:readonly Gift[]=[
 {id:"zoe",kind:"friend",name:"Zoe",to:"/friend/live?id=zoe"},
 {id:"iris",kind:"friend",name:"Iris",to:"/friend/live?id=iris"},
 {id:"noah",kind:"friend",name:"Noah",to:"/friend/live?id=noah"},
 {id:"yuna",kind:"friend",name:"Yuna",to:"/friend/live?id=yuna"},
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

export function HomeMysteryGift(){
 const {t}=useTranslation("home");
 const [gift,setGift]=useState<Gift|null>(null);
 const [open,setOpen]=useState(false);
 const [minimized,setMinimized]=useState(false);
 const closeRef=useRef<HTMLButtonElement>(null);
 const triggerRef=useRef<HTMLButtonElement>(null);
 const panelRef=useRef<HTMLElement>(null);

 useEffect(()=>{trackUsageEvent("home_gift_view")},[]);
 useEffect(()=>{
  if(!open)return;
  closeRef.current?.focus();
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();setOpen(false)}
   if(event.key!=="Tab"||!panelRef.current)return;
   const items=panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
   const first=items[0],last=items[items.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  };
  window.addEventListener("keydown",onKeyDown);
  return()=>window.removeEventListener("keydown",onKeyDown);
 },[open]);
 useEffect(()=>{if(!open&&gift)triggerRef.current?.focus()},[open,gift]);

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
 return <div className={"crew-mystery-gift"+(minimized?" is-minimized":"")}>
  {minimized?<button type="button" className="crew-gift-minimized" onClick={()=>setMinimized(false)} aria-label={t("gift.restore")} title={t("gift.restore")}>
   <GiftBoxArt/>
  </button>:<button ref={triggerRef} type="button" className={"crew-gift-fab"+(gift?" has-result":"")} onClick={()=>gift?setOpen(true):unwrap()} aria-label={gift?t("gift.reopen"):t("gift.open")} aria-expanded={open} aria-controls="crew-gift-result" title={gift?t("gift.reopen"):t("gift.title")}>
   {gift?<span className="crew-gift-result-mark" aria-hidden="true">{gift.kind==="friend"?gift.name[0]:gift.kind==="play"?"★":gift.kind==="souls"?"✦":"Aa"}</span>:<GiftBoxArt/>}
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
     <GiftBoxArt opened/>
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
 </div>;
}
