import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import i18n from "../i18n";
import {Link,useNavigate} from "react-router-dom";
import {useTeacherStore,type FriendChatLanguageMode} from "../store/teacherStore";
import {CREW_FRIENDS,FRIEND_CATEGORIES,FRIEND_CATEGORY_LABELS,type FriendProfile} from "./friendProfiles";
import {characterLifeView,lifeBookLabels} from "../characters/lifeBookLocale";
import {FriendAvatar} from "./FriendAvatar";
import {Icon} from "../components/Icon";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {clearFriendRecent,clearFriendTopics,deleteFriendTopic,editFriendTopic,friendMemoryEnabled,getFriendLastChat,
 getFriendTopics,getFriendCaptureStatus,pinFriendTopic,allowFriendTopicAutoUpdate,recentFriends,saveFriendTopic} from "./friendMemory";
import "./friends.css";

function relativeDate(timestamp:number) {
 if(!timestamp)return "";
 const days=Math.floor((Date.now()-timestamp)/86400000);
 if(days<1)return i18n.t("friends:today");
 if(days===1)return i18n.t("friends:yesterday");
 return days<30?i18n.t("friends:days",{count:days}):new Date(timestamp).toLocaleDateString(i18n.language==="en"?"en-US":"zh-TW");
}

export function FriendsPage(){
 const {t,i18n:locale}=useTranslation("friends");
 const english=locale.language==="en";
 const navigate=useNavigate();
 const pace=useTeacherStore(s=>s.speakingPace),setPace=useTeacherStore(s=>s.setSpeakingPace),setLanguage=useTeacherStore(s=>s.setTargetLanguage);
 const language=useTeacherStore(s=>s.targetLanguage);
 const friendChatMode=useTeacherStore(s=>s.friendChatMode),setFriendChatMode=useTeacherStore(s=>s.setFriendChatMode);
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState<string>("all");
 const [selected,setSelected]=useState<FriendProfile|null>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const [memoryPanel,setMemoryPanel]=useState(false);
 const [draft,setDraft]=useState("");
 const [revision,setRevision]=useState(0);
 // The profile modal must be rendered at the viewport root, outside route transitions.
 // Freeze background scrolling while the dialog is open, and restore focus on close.
 useEffect(()=>{
  if(!selected)return;
  const oldOverflow=document.body.style.overflow;
  const lastFocused=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow="hidden";
  closeButton.current?.focus();
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();setSelected(null);setMemoryPanel(false)}
  };
  document.addEventListener("keydown",onKeyDown);
  return()=>{
   document.body.style.overflow=oldOverflow;
   document.removeEventListener("keydown",onKeyDown);
   if(lastFocused?.isConnected)lastFocused.focus();
  };
 },[selected]);
 const refresh=()=>setRevision(x=>x+1);
 useEffect(()=>{const listener=()=>setRevision(x=>x+1);window.addEventListener("crew-friend-memory-changed",listener);return()=>window.removeEventListener("crew-friend-memory-changed",listener)},[]);
 const recent=recentFriends(language);
 const visible=CREW_FRIENDS.filter(friend=>(category==="all"||friend.category===category)&&
  [friend.name,friend.titleZh,friend.bioZh,friend.titleEn,friend.bioEn].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
 function begin(friend:FriendProfile){
  localStorage.setItem("crew_web_selected_friend_v1",friend.id);
  navigate("/friend/live?id="+encodeURIComponent(friend.id));
 }
 const memories=selected?getFriendTopics(selected.id,language):[];
 const captureStatus=selected?getFriendCaptureStatus(selected.id,language):"";
 return <div className="crew-friends-page" data-revision={revision}>
  <header className="hero friends-intro">
   <h1>{t("title")}</h1>
   <p>{t("intro")}</p>
  </header>
  <section className="section teacher-precall-settings panel"><label>{t("language")}<select className="field" value={language} onChange={e=>setLanguage(e.target.value)}>{TARGET_LANGUAGES.map(x=>x.value).map(v=><option key={v} value={v}>{t("languages."+v)}</option>)}</select></label><label>{t("pace")}<select className="field" value={pace} onChange={e=>setPace(e.target.value as typeof pace)}><option value="slow">{t("slow")}</option><option value="normal">{t("normal")}</option><option value="fast">{t("fast")}</option></select></label><label>{t("chatModeTitle")}<select className="field" value={friendChatMode} onChange={e=>setFriendChatMode(e.target.value as FriendChatLanguageMode)}><option value="natural">{t("chatModeNatural")}</option><option value="bilingual">{t("chatModeBilingual")}</option><option value="immersion">{t("chatModeImmersion")}</option></select></label></section>
  <p className="friends-language-mode-hint" role="note">{t(friendChatMode==="natural"?"chatModeHintNatural":friendChatMode==="bilingual"?"chatModeHintBilingual":"chatModeHintImmersion")}</p>
  <Link className="friends-game-entry" to="/games"><span aria-hidden="true"><Icon name="play"/></span><span><strong>{t("gameEntryTitle")}</strong><small>{t("gameEntryDescription")}</small></span><b aria-hidden="true">→</b></Link>
  <div className="friends-top-actions"><span>{t("count",{count:CREW_FRIENDS.length})}</span><Link to="/settings#memory-settings">{t("memorySettings")} →</Link></div>
  {recent.length?<section className="section friends-recent">
   <div className="section-head"><h2>{t("recent")}</h2><button type="button" className="friends-subtle" onClick={()=>{if(window.confirm(t("clearRecentConfirm"))){clearFriendRecent(language);refresh()}}}>{t("clearRecent")}</button></div>
   <div className="friends-recent-list">{recent.slice(0,8).map(friend=><button type="button" key={friend.id} className="friends-recent-card" onClick={()=>begin(friend)}>
     <FriendAvatar friend={friend}/><strong>{friend.name}</strong><small>{relativeDate(getFriendLastChat(friend.id,language))}</small><span>{t("resume")} →</span>
   </button>)}</div>
  </section>:<div className="friends-recent-empty">{t("recentEmpty")}</div>}
  <section className="section friends-directory">
   <div className="section-head"><h2>{t("all")}</h2><small>{t("people",{count:CREW_FRIENDS.length})}</small></div>
   <label className="friends-search"><span className="sr-only">{t("search")}</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("searchPlaceholder")}/></label>
   <div className="friends-categories" role="group" aria-label={t("categories")}>{FRIEND_CATEGORIES.map(cat=><button type="button" key={cat} className={category===cat?"active":""} aria-pressed={category===cat} onClick={()=>setCategory(cat)}>{t("category."+cat,{defaultValue:FRIEND_CATEGORY_LABELS[cat]})}</button>)}</div>
   <div className="friends-contact-list">{visible.length?visible.map(friend=><button type="button" className="friends-contact" key={friend.id} onClick={()=>{setSelected(friend);setMemoryPanel(false)}}>
     <FriendAvatar friend={friend}/><span className="friends-contact-copy"><strong>{friend.name}<small>{english?friend.titleEn:friend.titleZh}</small></strong><span>{friendMemoryEnabled()&&getFriendTopics(friend.id,language)[0]?.title?t("lastTopic")+getFriendTopics(friend.id,language)[0].title:(english?friend.bioEn:friend.bioZh)}</span></span>
     <span className="friends-contact-tail"><small>{relativeDate(getFriendLastChat(friend.id,language))}</small><b aria-hidden="true">›</b></span>
    </button>):<p className="friends-empty">{t("noMatches")}</p>}</div>
  </section>
  <p className="friends-privacy-note">{t("privacy")}</p>
  {selected?createPortal(<div className="friends-modal-backdrop" role="presentation" onClick={()=>{setSelected(null);setMemoryPanel(false)}}>
   <section className="friends-modal" role="dialog" aria-modal="true" aria-label={selected.name} onClick={e=>e.stopPropagation()}>
    <button ref={closeButton} type="button" className="friends-modal-close" aria-label={t("close")} onClick={()=>{setSelected(null);setMemoryPanel(false)}}>×</button>
    <FriendAvatar friend={selected} className="friends-detail-avatar"/><h2>{selected.name}</h2><strong className="friends-detail-title">{english?selected.titleEn:selected.titleZh}</strong><p>{english?selected.bioEn:selected.bioZh}</p><small className="friends-role-promise">{t("rolePromise")}</small>
    {(()=>{const bio=characterLifeView("friend",selected.id,locale.language),labels=lifeBookLabels("friend",locale.language);return bio?<details className="friends-life-book">
     <summary>{labels.title}</summary>
     <p>{bio.summary}</p>
     {bio.people&&<><strong>{labels.people}</strong><p>{bio.people}</p></>}
     {bio.current&&<><strong>{labels.current}</strong><p>{bio.current}</p></>}
     {!!bio.moments.length&&<><strong>{labels.moments}</strong><ul>{bio.moments.map((m,i)=><li key={i}>{m}</li>)}</ul></>}
     <small>{labels.note}</small>
    </details>:null})()}
    {getFriendLastChat(selected.id,language)>0?<small className="friends-detail-time">{relativeDate(getFriendLastChat(selected.id,language))}</small>:null}
    {memoryPanel?<div className="friends-memories">
     <h3>{t("topicsWith",{name:selected.name})}</h3>
     {captureStatus?<p className="meta" role="status">{t("capture."+captureStatus)}</p>:null}
     {!friendMemoryEnabled()?<p>{t("disabled")}</p>:<>
       {memories.length?memories.map(item=><div className="friends-memory-row" key={item.id}>
        <div><strong>{item.title}</strong><small>{item.summary}</small></div>
        <button type="button" aria-label={t("pin")} onClick={()=>{pinFriendTopic(selected.id,language,item.id);refresh()}}>{item.pinned?t("unpin"):t("pin")}</button>
        <button type="button" aria-label={t("edit")} onClick={()=>{
          const title=window.prompt(t("editPrompt"),item.title);
          if(title!==null&&editFriendTopic(selected.id,language,item.id,title))refresh();
        }}>{t("edit")}</button>
        {item.manual?<button type="button" onClick={()=>{
         if(window.confirm(t("autoUpdateConfirm"))&&allowFriendTopicAutoUpdate(selected.id,language,item.id))refresh();
        }}>{t("autoUpdate")}</button>:null}
        <button type="button" aria-label={t("delete")} onClick={()=>{deleteFriendTopic(selected.id,language,item.id);refresh()}}>{t("delete")}</button>
       </div>):<p>{t("noTopics")}</p>}
       <form className="friends-add-memory" onSubmit={e=>{e.preventDefault();if(saveFriendTopic(selected.id,language,draft)){setDraft("");refresh()}}}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={65} placeholder={t("addPlaceholder")}/><button type="submit" disabled={!draft.trim()}>{t("add")}</button></form>
       {memories.length?<button type="button" className="friends-clear-memory" onClick={()=>{if(window.confirm(t("clearTopicsConfirm"))){clearFriendTopics(selected.id,language);refresh()}}}>{t("clearTopics")}</button>:null}
      </>}
    </div>:<div className="friends-detail-topics">{friendMemoryEnabled()&&memories.length?<><h3>{t("topics")}</h3>{memories.slice(0,3).map(topic=><span key={topic.id}>{topic.title}</span>)}</>:!friendMemoryEnabled()?<small>{t("disabledHint")}</small>:null}</div>}
    <div className="friends-modal-actions">
     <button type="button" className="friends-primary" onClick={()=>begin(selected)}>{getFriendLastChat(selected.id,language)?t("resume"):t("start")}</button>
     <button type="button" className="friends-secondary" onClick={()=>setMemoryPanel(v=>!v)}>{memoryPanel?t("back"):t("sharedMemories")}</button>
    </div>
   </section>
  </div>,document.body):null}
 </div>;
}
