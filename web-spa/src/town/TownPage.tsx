import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import {TownIllustration} from "./TownIllustration";
import "./town.css";

type ActorId="zoe"|"yuna"|"theo"|"hugo"|"bella"|"noah";
type PlaceId="cafe"|"studio"|"play"|"garden";
type Selection={type:"person";id:ActorId}|{type:"place";id:PlaceId}|null;

const PEOPLE:{id:ActorId;x:number;y:number;clothes:string;hair:string;activityZh:string;activityEn:string}[]=[
 {id:"zoe",x:28,y:60,clothes:"#da887f",hair:"#704c51",activityZh:"在咖啡館發現了新甜點",activityEn:"Found a new dessert at the café"},
 {id:"yuna",x:37,y:66,clothes:"#8baf9e",hair:"#423d47",activityZh:"正和 Zoe 分享日常",activityEn:"Sharing a quiet moment with Zoe"},
 {id:"theo",x:68,y:58,clothes:"#7c9bbb",hair:"#5a473e",activityZh:"在工作室研究新玩意",activityEn:"Tinkering at the studio"},
 {id:"hugo",x:51,y:34,clothes:"#d6ab6f",hair:"#795b42",activityZh:"準備探索下一間小店",activityEn:"Looking for another little café"},
 {id:"bella",x:57,y:80,clothes:"#c58da5",hair:"#68464b",activityZh:"邀請大家玩新遊戲",activityEn:"Inviting everyone to play"},
 {id:"noah",x:79,y:81,clothes:"#8798a6",hair:"#594c47",activityZh:"在池塘邊放空",activityEn:"Enjoying a quiet moment by the pond"}
];
const PROFILES=new Map(CREW_FRIENDS.map(friend=>[friend.id,friend]));
const PLACES:{id:PlaceId;x:number;y:number;zh:string;en:string;introZh:string;introEn:string;to:string;ctaZh:string;ctaEn:string}[]=[
 {id:"cafe",x:19,y:72,zh:"日常咖啡館",en:"The Café",introZh:"Zoe 和 Yuna 常在這裡聊今天的趣事。點選角色可以進入真正的語音聊天。",introEn:"Zoe and Yuna share the little stories of their day here. Choose a friend to start a real voice chat.",to:"/friend/live?id=zoe",ctaZh:"跟 Zoe 聊聊",ctaEn:"Chat with Zoe"},
 {id:"studio",x:74,y:41,zh:"靈感工作室",en:"The Studio",introZh:"Theo 喜歡在這裡交換點子。現在先以小鎮情境示範，語音仍使用既有聊天頁。",introEn:"Theo loves new ideas. The town scene is a prototype; voice conversations use the existing chat page.",to:"/friend/live?id=theo",ctaZh:"跟 Theo 聊聊",ctaEn:"Chat with Theo"},
 {id:"play",x:45,y:84,zh:"遊戲屋",en:"Play House",introZh:"這裡是 Crew Play 的遊戲入口，未來可以把遊戲事件帶回小鎮。",introEn:"Find Crew Play games here. In the future, game events can unfold across town.",to:"/games",ctaZh:"前往 Crew Play",ctaEn:"Go to Crew Play"},
 {id:"garden",x:86,y:68,zh:"湖畔花園",en:"Lakeside Garden",introZh:"適合慢慢聊生活，先從 Noah 的單人對話開始。",introEn:"A quiet place to talk about life. Start with a one-on-one conversation with Noah.",to:"/friend/live?id=noah",ctaZh:"跟 Noah 聊聊",ctaEn:"Chat with Noah"}
];
const MOMENTS:{id:ActorId;partner:ActorId;zh:string;en:string}[]=[
 {id:"zoe",partner:"yuna",zh:"Yuna，你知道這家店有新的草莓塔嗎？",en:"Yuna, did you know they have a new strawberry tart?"},
 {id:"yuna",partner:"zoe",zh:"那我們可以一起分一塊，慢慢吃。",en:"Then let's share a slice and take our time."},
 {id:"theo",partner:"hugo",zh:"我想做一個會講故事的地圖。",en:"What if we built a map that could tell stories?"},
 {id:"bella",partner:"noah",zh:"等等要不要一起玩個新遊戲？",en:"Want to try a new game later?"}
];

export function TownPage(){
 const {i18n}=useTranslation();
 const zh=i18n.language.startsWith("zh");
 const viewport=useRef<HTMLDivElement|null>(null);
 const [night,setNight]=useState(false);
 const [selected,setSelected]=useState<Selection>(null);
 const [moment,setMoment]=useState(0);
 const [motionOK,setMotionOK]=useState(false);
 const [ambient,setAmbient]=useState(true);

 useEffect(()=>{
  const query=window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync=()=>setMotionOK(!query.matches);
  sync();query.addEventListener("change",sync);
  return()=>query.removeEventListener("change",sync);
 },[]);
 useEffect(()=>{
  const el=viewport.current;
  if(el)el.scrollLeft=Math.max(0,(el.scrollWidth-el.clientWidth)*.20);
 },[]);
 useEffect(()=>{
  if(!motionOK||!ambient||selected)return;
  const tick=window.setInterval(()=>{if(!document.hidden)setMoment(previous=>(previous+1)%MOMENTS.length)},8500);
  return()=>window.clearInterval(tick);
 },[motionOK,ambient,selected]);

 const focus=(x:number)=>{
  const el=viewport.current;
  if(!el)return;
  const left=x/100*960-el.clientWidth/2;
  el.scrollTo({left:Math.max(0,left),behavior:motionOK?"smooth":"instant"});
 };
 const pickPerson=(id:ActorId)=>{
  const person=PEOPLE.find(item=>item.id===id);
  if(person)focus(person.x);
  setSelected({type:"person",id});
 };
 const pickPlace=(id:PlaceId)=>{
  const place=PLACES.find(item=>item.id===id);
  if(place)focus(place.x);
  setSelected({type:"place",id});
 };
 const pickedPerson=selected?.type==="person"?PROFILES.get(selected.id):null;
 const pickedPlace=selected?.type==="place"?PLACES.find(place=>place.id===selected.id):null;
 const current=MOMENTS[moment];
 const speaker=PROFILES.get(current.id);
 const listener=PROFILES.get(current.partner);

 return <div className="crew-town">
  <header className="crew-town-heading">
   <div><span className="crew-town-kicker">CREW TOWN <span>· VISUAL PROTOTYPE</span></span>
    <h1>{zh?"朋友們的小小世界":"A little world of friends"}</h1>
    <p>{zh?"他們在這裡散步、相遇、分享每天的故事。點擊一位朋友，加入他們的生活。":"They stroll, meet, and share the small stories of everyday life. Tap a friend to say hello."}</p></div>
   <Link className="crew-town-back" to="/explore">← {zh?"回到探索":"Explore"}</Link>
  </header>

  <section className="crew-town-shell" aria-label={zh?"Crew 小鎮互動地圖":"Interactive Crew Town map"}>
   <div className={"crew-town-stage"+(night?" is-night":"")}>
    <div className="crew-town-stage-top">
     <span className="crew-town-world-status"><span className="crew-town-status-light"/>{zh?"小鎮日常 · 情境預覽":"Town moments · scripted preview"}</span>
     <div className="crew-town-stage-actions">
      <button type="button" onClick={()=>{setAmbient(v=>!v);setSelected(null)}} aria-pressed={ambient}>{ambient?(zh?"暫停對話":"Pause moments"):(zh?"播放對話":"Play moments")}</button>
      <button type="button" onClick={()=>setNight(v=>!v)} aria-pressed={night}>{night?(zh?"☀ 白天":"☀ Day"):(zh?"☾ 夜晚":"☾ Night")}</button>
     </div>
    </div>
    <div className="crew-town-viewport" ref={viewport} tabIndex={0} role="region" aria-label={zh?"可左右捲動的小鎮地圖":"Horizontally scrollable town map"}>
     <div className="crew-town-canvas">
      <TownIllustration/>
      {PEOPLE.map((person,index)=>{
       const profile=PROFILES.get(person.id);
       if(!profile)return null;
       return <button type="button" key={person.id}
         className={"crew-town-person crew-town-person-"+person.id+(selected?.type==="person"&&selected.id===person.id?" is-selected":"")}
         style={{left:person.x+"%",top:person.y+"%",animationDelay:index*.24+"s"}}
         aria-label={(zh?"與 ":"Meet ")+profile.name+(zh?" 對話":"")}
         onClick={()=>pickPerson(person.id)}>
        <span className="crew-town-person-shadow"/>
        <span className="crew-town-person-figure" style={{"--town-clothes":person.clothes,"--town-hair":person.hair} as React.CSSProperties}>
         <span className="crew-town-person-hair"/><span className="crew-town-person-face"/><span className="crew-town-person-body"/>
        </span>
        <span className="crew-town-person-tag">{profile.name}</span>
       </button>;
      })}
      {PLACES.map(place=><button type="button" key={place.id} className={"crew-town-place crew-town-place-"+place.id}
       style={{left:place.x+"%",top:place.y+"%"}} onClick={()=>pickPlace(place.id)}
       aria-label={(zh?"探索 ":"Explore ")+(zh?place.zh:place.en)}>
       <span className="crew-town-place-dot" aria-hidden="true">↗</span><span>{zh?place.zh:place.en}</span>
      </button>)}
      {!selected&&ambient&&<button type="button" className={"crew-town-moment crew-town-moment-"+current.id}
       onClick={()=>pickPerson(current.id)} aria-label={(speaker?.name||"")+(zh?"：":" says: ")+(zh?current.zh:current.en)}>
       <strong>{speaker?.name} <span>→ {listener?.name}</span></strong>
       <span>{zh?current.zh:current.en}</span>
      </button>}
     </div>
    </div>
    <div className="crew-town-stage-hint">{zh?"← 左右探索小鎮 · 點人物互動 →":"← Scroll to explore · Tap a character →"}</div>
    {selected&&<div className="crew-town-sheet" role="group" aria-label={zh?"小鎮互動資訊":"Town interaction details"}>
     <button type="button" className="crew-town-sheet-close" onClick={()=>setSelected(null)} aria-label={zh?"關閉資訊":"Close details"}>×</button>
     {pickedPerson&&<div className="crew-town-sheet-person">
      <img src={pickedPerson.avatar} alt=""/>
      <div><small>{zh?"遇見 Crew Friend":"MEET A CREW FRIEND"}</small><strong>{pickedPerson.name}</strong>
       <p>{zh?PEOPLE.find(p=>p.id===pickedPerson.id)?.activityZh:PEOPLE.find(p=>p.id===pickedPerson.id)?.activityEn}</p>
      </div>
     </div>}
     {pickedPlace&&<div className="crew-town-sheet-place">
      <small>{zh?"探索地點":"EXPLORE A PLACE"}</small><strong>{zh?pickedPlace.zh:pickedPlace.en}</strong>
      <p>{zh?pickedPlace.introZh:pickedPlace.introEn}</p>
     </div>}
     <Link className="crew-town-join" to={pickedPerson?"/friend/live?id="+encodeURIComponent(pickedPerson.id):pickedPlace?.to||"/chat"}>
      {pickedPerson?(zh?"開始與 "+pickedPerson.name+" 語音聊天":"Start voice chat with "+pickedPerson.name):pickedPlace?(zh?pickedPlace.ctaZh:pickedPlace.ctaEn):""} <span>↗</span>
     </Link>
    </div>}
   </div>
   <div className="crew-town-foot">
    <span>{zh?"這是互動視覺原型：小鎮對話為預設情境，點人物會進入現有的單人 Gemini Live 頁面。":"Interactive art prototype: town speech bubbles are scripted, while character links open the existing one-on-one Gemini Live experience."}</span>
    <span className="crew-town-foot-mark">CREW · P0</span>
   </div>
  </section>
  <section className="crew-town-next" aria-label={zh?"如何探索":"How to explore"}>
   <div><span>01 / {zh?"觀察":"Watch"}</span><strong>{zh?"看看朋友的日常":"See everyday moments"}</strong></div>
   <div><span>02 / {zh?"探索":"Explore"}</span><strong>{zh?"點擊人物或地點":"Tap a friend or a place"}</strong></div>
   <div><span>03 / {zh?"交談":"Talk"}</span><strong>{zh?"進入既有語音聊天":"Open the real voice chat"}</strong></div>
  </section>
 </div>;
}
