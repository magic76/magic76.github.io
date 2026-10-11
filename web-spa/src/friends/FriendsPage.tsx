import {useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {useTeacherStore} from "../store/teacherStore";
import {hasPersonalMemoryDecision,personalMemoryEnabled,setPersonalMemoryEnabled} from "../teacher/studentMemory";
import {CREW_FRIENDS,FRIEND_CATEGORIES,FRIEND_CATEGORY_LABELS,type FriendProfile} from "./friendProfiles";
import {FriendAvatar} from "./FriendAvatar";
import {clearFriendRecent,clearFriendTopics,deleteFriendTopic,editFriendTopic,friendMemoryEnabled,getFriendLastChat,
 getFriendTopics,hasFriendMemoryDecision,pinFriendTopic,recentFriends,saveFriendTopic,setFriendMemoryEnabled} from "./friendMemory";
import "./friends.css";

function relativeDate(timestamp:number) {
 if(!timestamp)return "";
 const days=Math.floor((Date.now()-timestamp)/86400000);
 if(days<1)return "今天聊過";
 if(days===1)return "昨天聊過";
 return days<30?days+" 天前聊過":new Date(timestamp).toLocaleDateString("zh-TW");
}

export function FriendsPage(){
 const navigate=useNavigate();
 const language=useTeacherStore(s=>s.targetLanguage);
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState<string>("all");
 const [selected,setSelected]=useState<FriendProfile|null>(null);
 const [memoryPanel,setMemoryPanel]=useState(false);
 const [settings,setSettings]=useState(false);
 const [draft,setDraft]=useState("");
 const [revision,setRevision]=useState(0);
 const refresh=()=>setRevision(x=>x+1);
 const recent=recentFriends(language);
 const visible=CREW_FRIENDS.filter(friend=>(category==="all"||friend.category===category)&&
  [friend.name,friend.titleZh,friend.bioZh,friend.titleEn,friend.bioEn].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
 const choiceNeeded=!hasPersonalMemoryDecision()||!hasFriendMemoryDecision();
 const showConsent=choiceNeeded||settings;
 function begin(friend:FriendProfile){
  navigate("/friend/live?id="+encodeURIComponent(friend.id));
 }
 function openMemories(friend:FriendProfile){setSelected(friend);setDraft("");setMemoryPanel(true)}
 const memories=selected?getFriendTopics(selected.id,language):[];
 const consent=<section className="friend-consent" aria-label="記憶選擇">
  <div className="friend-consent-heading"><strong>讓 Crew 記住你嗎？</strong><span>由你決定，隨時能關閉</span></div>
  <p>個人偏好、聊天話題分開控制。儲存於這台瀏覽器；同意後，部分相關內容可能提供給 Gemini，讓之後的對話自然延續。</p>
  <label><input type="checkbox" checked={personalMemoryEnabled()} onChange={e=>{setPersonalMemoryEnabled(e.target.checked);refresh()}}/>記住我說過的興趣與偏好</label>
  <label><input type="checkbox" checked={friendMemoryEnabled()} onChange={e=>{setFriendMemoryEnabled(e.target.checked);refresh()}}/>記住我和各個朋友聊過的話題</label>
  <button type="button" className="friend-consent-dismiss" onClick={()=>{
   if(!hasPersonalMemoryDecision())setPersonalMemoryEnabled(false);
   if(!hasFriendMemoryDecision())setFriendMemoryEnabled(false);
   setSettings(false);refresh();
  }}>完成 / 暫時不要</button>
 </section>;
 return <div className="crew-friends-page" data-revision={revision}>
  <header className="hero friends-intro">
   <span className="kicker">CREW FRIENDS</span><h1>今天，找誰聊聊？</h1>
   <p>這裡不用上課。挑個聊得來的人，從生活、旅行到各種突發奇想都能聊。</p>
  </header>
  <div className="friends-top-actions"><span>16 位不同個性的朋友</span><button type="button" onClick={()=>setSettings(v=>!v)}>{settings?"收起設定":"記憶設定"}</button></div>
  {showConsent?consent:null}
  {recent.length?<section className="section friends-recent">
   <div className="section-head"><h2>最近聊過</h2><button type="button" className="friends-subtle" onClick={()=>{if(window.confirm("清除最近聊天日期？已儲存的共同話題不會刪除。")){clearFriendRecent(language);refresh()}}}>清除最近</button></div>
   <div className="friends-recent-list">{recent.slice(0,8).map(friend=><button type="button" key={friend.id} className="friends-recent-card" onClick={()=>begin(friend)}>
     <FriendAvatar friend={friend}/><strong>{friend.name}</strong><small>{relativeDate(getFriendLastChat(friend.id,language))}</small><span>接著聊 →</span>
   </button>)}</div>
  </section>:<div className="friends-recent-empty">聊過的朋友會出現在這裡，方便下次直接接著聊。</div>}
  <section className="section friends-directory">
   <div className="section-head"><h2>所有朋友</h2><small>{CREW_FRIENDS.length} 位</small></div>
   <label className="friends-search"><span className="sr-only">搜尋朋友</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋名字、興趣或個性"/></label>
   <div className="friends-categories" role="group" aria-label="朋友分類">{FRIEND_CATEGORIES.map(cat=><button type="button" key={cat} className={category===cat?"active":""} aria-pressed={category===cat} onClick={()=>setCategory(cat)}>{FRIEND_CATEGORY_LABELS[cat]}</button>)}</div>
   <div className="friends-contact-list">{visible.length?visible.map(friend=><button type="button" className="friends-contact" key={friend.id} onClick={()=>{setSelected(friend);setMemoryPanel(false)}}>
     <FriendAvatar friend={friend}/><span className="friends-contact-copy"><strong>{friend.name}<small>{friend.titleZh}</small></strong><span>{friendMemoryEnabled()&&getFriendTopics(friend.id,language)[0]?.title?"聊過的事："+getFriendTopics(friend.id,language)[0].title:friend.bioZh}</span></span>
     <span className="friends-contact-tail"><small>{relativeDate(getFriendLastChat(friend.id,language))}</small><b aria-hidden="true">›</b></span>
    </button>):<p className="friends-empty">沒有符合的朋友，試試別的名字或興趣。</p>}</div>
  </section>
  <p className="friends-privacy-note">最近互動只記錄真實聊天日期；個人話題必須得到同意才會保存。朋友是虛構的 AI 角色，不會聲稱真實線上狀態。</p>
  {selected?<div className="friends-modal-backdrop" role="presentation" onClick={()=>{setSelected(null);setMemoryPanel(false)}}>
   <section className="friends-modal" role="dialog" aria-modal="true" aria-label={selected.name} onClick={e=>e.stopPropagation()}>
    <button type="button" className="friends-modal-close" aria-label="關閉" onClick={()=>{setSelected(null);setMemoryPanel(false)}}>×</button>
    <FriendAvatar friend={selected} className="friends-detail-avatar"/><h2>{selected.name}</h2><strong className="friends-detail-title">{selected.titleZh}</strong><p>{selected.bioZh}</p>
    {getFriendLastChat(selected.id,language)>0?<small className="friends-detail-time">{relativeDate(getFriendLastChat(selected.id,language))}</small>:null}
    {memoryPanel?<div className="friends-memories">
     <h3>和 {selected.name} 的共同話題</h3>
     {!friendMemoryEnabled()?<p>尚未開啟聊天話題記憶。需要先同意，才會記住你們聊過的事。</p>:<>
       {memories.length?memories.map(item=><div className="friends-memory-row" key={item.id}>
        <div><strong>{item.title}</strong><small>{item.summary}</small></div>
        <button type="button" aria-label="釘選話題" onClick={()=>{pinFriendTopic(selected.id,language,item.id);refresh()}}>{item.pinned?"取消釘選":"釘選"}</button>
        <button type="button" aria-label="編輯話題" onClick={()=>{
          const title=window.prompt("修改話題名稱",item.title);
          if(title!==null&&editFriendTopic(selected.id,language,item.id,title))refresh();
        }}>編輯</button>
        <button type="button" aria-label="刪除話題" onClick={()=>{deleteFriendTopic(selected.id,language,item.id);refresh()}}>刪除</button>
       </div>):<p>目前還沒有共同話題，聊過幾次後可以慢慢累積，也可以自行新增。</p>}
       <form className="friends-add-memory" onSubmit={e=>{e.preventDefault();if(saveFriendTopic(selected.id,language,draft)){setDraft("");refresh()}}}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={65} placeholder="手動新增一個話題"/><button type="submit" disabled={!draft.trim()}>新增</button></form>
       {memories.length?<button type="button" className="friends-clear-memory" onClick={()=>{if(window.confirm("清除和這位朋友的所有共同話題？")){clearFriendTopics(selected.id,language);refresh()}}}>清除這位朋友的話題</button>:null}
      </>}
    </div>:<div className="friends-detail-topics">{friendMemoryEnabled()&&memories.length?<><h3>我們聊過的話題</h3>{memories.slice(0,3).map(topic=><span key={topic.id}>{topic.title}</span>)}</>:!friendMemoryEnabled()?<small>未開啟聊天記憶，可在「共同回憶」自行啟用。</small>:null}</div>}
    <div className="friends-modal-actions">
     <button type="button" className="friends-primary" onClick={()=>begin(selected)}>{getFriendLastChat(selected.id,language)?"接著聊":"開始聊天"}</button>
     <button type="button" className="friends-secondary" onClick={()=>setMemoryPanel(v=>!v)}>{memoryPanel?"返回人物介紹":"共同回憶"}</button>
    </div>
   </section>
  </div>:null}
 </div>;
}
