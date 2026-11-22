import {Arrow} from "../../components/Arrow";
import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {trackUsageEvent} from "../../analytics/usage";
import {CREW_FRIENDS} from "../../friends/friendProfiles";
import {PEOPLE,PLACES,type FriendId,type PlaceId,type Selection} from "./world";
export function TownOverlay({selected,zh,onClose,onFriend,onPlace}:{
 selected:Selection;zh:boolean;onClose:()=>void;onFriend:(id:FriendId)=>void;onPlace:(id:PlaceId)=>void;
}){
 const [friendsOpen,setFriendsOpen]=useState(false);
 useEffect(()=>{if(selected)setFriendsOpen(false)},[selected]);
 const friend=selected?.type==="person"?CREW_FRIENDS.find(p=>p.id===selected.id):null;
 const actor=selected?.type==="person"?PEOPLE.find(p=>p.id===selected.id):null;
 const place=selected?.type==="place"?PLACES.find(p=>p.id===selected.id):null;
 const entries=selected?.type==="person"?PEOPLE:PLACES;
 const activeIndex=selected?entries.findIndex(p=>p.id===selected.id):-1;
 const navigate=(direction:number)=>{
  if(activeIndex<0)return;
  const next=entries[(activeIndex+direction+entries.length)%entries.length];
  if(selected?.type==="person")onFriend(next.id as FriendId);
  else onPlace(next.id as PlaceId);
 };
 const placeIcons:Record<PlaceId,string>={cafe:"☕",studio:"✦",play:"◆",garden:"❀"};
 return <>
  {!selected&&<div className="crew-town-3d-dock" aria-label={zh?"小鎮導覽":"Town navigation"}>
   <div className="crew-town-3d-destinations">{PLACES.map(p=><button type="button" key={p.id}
    onClick={()=>{setFriendsOpen(false);onPlace(p.id)}} aria-label={(zh?"探索 ":"Explore ")+(zh?p.zh:p.en)}>
     <span className="crew-town-3d-destination-symbol" aria-hidden="true">{placeIcons[p.id]}</span><span>{zh?p.zh:p.en}</span>
    </button>)}</div>
   <button type="button" className="crew-town-3d-friends-toggle" onClick={()=>setFriendsOpen(v=>!v)}
     aria-expanded={friendsOpen} aria-controls="crew-town-3d-friend-menu">{(zh?"朋友 · ":"Friends · ")+PEOPLE.length}</button>
   {friendsOpen&&<div id="crew-town-3d-friend-menu" className="crew-town-3d-friend-menu" role="group"
     aria-label={zh?"選擇小鎮朋友":"Choose a friend"}>
    {PEOPLE.map(p=>{const profile=CREW_FRIENDS.find(f=>f.id===p.id);return <button type="button" key={p.id}
      onClick={()=>{setFriendsOpen(false);onFriend(p.id)}}>
      {profile&&<img src={profile.avatar} alt=""/>}<span>{profile?.name??p.id}</span></button>})}
   </div>}
  </div>}
  {selected&&<div className="crew-town-3d-sheet" role="group" aria-label={zh?"小鎮互動資訊":"Town interaction details"}>
   <button type="button" className="crew-town-3d-close" onClick={onClose} aria-label={zh?"關閉資訊":"Close details"}>×</button>
   {friend&&<div className="crew-town-3d-selected">
    <img src={friend.avatar} alt=""/>
    <div><small>CREW FRIEND · {zh?"角色":"CHARACTER"}</small><strong>{friend.name}</strong>
     <p>{zh?actor?.activityZh:actor?.activityEn}</p></div>
   </div>}
   {place&&<div className="crew-town-3d-place">
    <small>CREW TOWN · {zh?"地點":"PLACE"}</small><strong>{zh?place.zh:place.en}</strong>
    <p>{zh?place.introZh:place.introEn}</p>
   </div>}
   <div className="crew-town-3d-roster-nav" aria-label={zh?"切換朋友或地點":"Browse friends or places"}>
    <button type="button" onClick={()=>navigate(-1)} aria-label={zh?"上一個":"Previous"}><Arrow direction="left"/> {zh?"上一個":"Previous"}</button>
    <span>{activeIndex+1} / {entries.length}</span>
    <button type="button" onClick={()=>navigate(1)} aria-label={zh?"下一個":"Next"}>{zh?"下一個":"Next"} <Arrow/></button>
   </div>
   <Link className="crew-town-3d-action" to={friend?"/friend/live?id="+encodeURIComponent(friend.id):place?.to||"/explore"}
    onClick={()=>{if(friend||place?.to.startsWith("/friend/live"))trackUsageEvent("town_chat_click")}}>
    {friend?(zh?"加入與 "+friend.name+" 的語音聊天":"Join "+friend.name+" in voice chat"):place?(zh?place.ctaZh:place.ctaEn):""}
    <Arrow direction="right"/>
   </Link>
   <small className="crew-town-3d-note">{zh?"小鎮互動為預設情境；語音聊天將進入單人 Gemini Live。":"Town activity is scripted; voice chat opens the existing one-on-one Gemini Live."}</small>
  </div>}
 </>;
}
