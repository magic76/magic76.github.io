import {Arrow} from "../components/Arrow";
import {useRef,type KeyboardEvent} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import "./homeLayout2.css";

export type HomeMode="chat"|"learn"|"fortune"|"play";
export const HOME_MODES:readonly {id:HomeMode;icon:IconName;label:string;to:string;entry:"friend"|"learn"|"fortune"|"play"}[]=[
 {id:"chat",icon:"chat",label:"chat",to:"/friend/live?id=zoe&from=home&chat=text",entry:"friend"},
 {id:"learn",icon:"teacher",label:"teacher",to:"/teacher/live?lesson=daily_u1_l1",entry:"learn"},
 {id:"fortune",icon:"fortune",label:"fortune",to:"/fortune/reading?mode=tarot",entry:"fortune"},
 {id:"play",icon:"play",label:"play",to:"/games/1a2b",entry:"play"}
];

type Props={mode:HomeMode;onChange:(next:HomeMode)=>void;prefix:string;
 destinations:Record<HomeMode,string>;onNavigate:(next:HomeMode)=>void;
 chatName:string;chatAction?:string};
export function HomeModeRail({mode,onChange,prefix,destinations,onNavigate,chatName,chatAction}:Props){
 const {t}=useTranslation("home");
 const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const active=HOME_MODES.find(item=>item.id===mode)||HOME_MODES[0];
 const keyMode=(event:KeyboardEvent<HTMLButtonElement>,at:number)=>{
  let next=at;
  if(event.key==="ArrowDown"||event.key==="ArrowRight")next=(at+1)%HOME_MODES.length;
  else if(event.key==="ArrowUp"||event.key==="ArrowLeft")next=(at+HOME_MODES.length-1)%HOME_MODES.length;
  else if(event.key==="Home")next=0;
  else if(event.key==="End")next=HOME_MODES.length-1;
  else return;
  event.preventDefault();onChange(HOME_MODES[next].id);buttons.current[next]?.focus();
 };
 const title=mode==="chat"?t("layout2.chatTitle"):t("world.tiles."+active.label+".sub");
 const description=mode==="chat"?t("layout2.chatDescription"):t("world.modes."+mode+".description");
 const action=mode==="chat"?(chatAction||t("world.chatWithFriend",{name:chatName})):t("world.modes."+mode+".cta");
 return <div className="home-mode-rail">
  <div className="home-mode-rail-tabs" role="tablist" aria-orientation="vertical" aria-label={t("world.tilesLabel")}>
   {HOME_MODES.map((item,i)=><button type="button" role="tab" key={item.id} id={prefix+"-tab-"+item.id}
    aria-controls={prefix+"-panel"} aria-selected={mode===item.id} tabIndex={mode===item.id?0:-1}
    ref={node=>{buttons.current[i]=node}} data-mode={item.id} onClick={()=>onChange(item.id)} onKeyDown={event=>keyMode(event,i)}>
    <Icon name={item.icon}/><span>{t("world.tiles."+item.label+".name")}</span>
   </button>)}
  </div>
  <div id={prefix+"-panel"} className="home-mode-rail-panel" role="tabpanel" aria-labelledby={prefix+"-tab-"+mode} tabIndex={0}>
   <span className="home-mode-rail-overline">{t("world.tiles."+active.label+".name")}</span>
   <strong>{title}</strong><p>{description}</p>
   <Link to={destinations[mode]} onClick={()=>onNavigate(mode)}>{action} <Arrow direction="right"/></Link>
  </div>
 </div>;
}
