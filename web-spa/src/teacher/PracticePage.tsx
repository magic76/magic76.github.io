import{Link}from"react-router-dom";
import{Icon}from"../components/Icon";
import{geminiKey,history}from"../lib/runtime";
import{ContinueLearningCard}from"./ContinueLearningCard";
import{todayVocabulary}from"./vocabularyProgress";
import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";
import{TeacherAvatar}from"./TeacherAvatar";
import{CREW_FRIENDS}from"../friends/friendProfiles";
import{FriendAvatar}from"../friends/FriendAvatar";

export function PracticePage(){
 const target=useTeacherStore(s=>s.targetLanguage),setTarget=useTeacherStore(s=>s.setTargetLanguage);
 const teacherId=useTeacherStore(s=>s.teacherProfile),teacher=getTeacherProfile(teacherId);
 const friend=CREW_FRIENDS.find(x=>x.id===localStorage.getItem("crew_web_selected_friend_v1"))||CREW_FRIENDS[0];
 const h=history("teacher"),today=new Date().toDateString();
 const todaySessions=h.filter((x:any)=>new Date(x.ts||x.createdAt||0).toDateString()===today).length,v=todayVocabulary();
 return <>
 <section className="hero crew-practice-heading"><span className="kicker">Crew Teacher</span><h1>今天想和誰聊聊？</h1><p>找朋友自在聊天，或跟老師練習表達。</p></section>
 <section className="section crew-target-language"><label htmlFor="crew-home-target">目前學習語言</label><select id="crew-home-target" className="field" value={target} onChange={e=>setTarget(e.target.value)}>{["英文","日文","韓文","西班牙文","法文"].map(value=><option key={value}>{value}</option>)}</select></section>
 {!geminiKey()&&<section className="section"><Link className="crew-setup-warning" to="/settings"><strong>先設定 Gemini Key</strong><span>完成設定後，就能和 Crew 老師、朋友直接語音對話。</span><b aria-hidden="true">→</b></Link></section>}
 <section className="section crew-role-gateway" aria-label="選擇 Crew 角色">
  <Link className="crew-role-entry friend" to="/teacher/roles?mode=friends">
   <span className="crew-role-portrait"><FriendAvatar friend={friend} decorative/></span>
   <strong>Crew 朋友 · {friend.name}</strong><span>16 位個性不同的朋友，自然聊天、不評分。</span>
   <small>找朋友聊聊 <b aria-hidden="true">↗</b></small>
  </Link>
  <Link className="crew-role-entry teacher" to="/teacher/roles?mode=teacher">
   <span className="crew-role-portrait"><TeacherAvatar profile={teacher} decorative/></span>
   <strong>Crew 老師 · {teacher.name}</strong><span>16 位專屬老師，口說、情境與表達練習。</span>
   <small>找老師練習 <b aria-hidden="true">↗</b></small>
  </Link>
 </section>
 <section className="section crew-continue-section"><div className="section-head"><h2>接續上次學習</h2><small>你的下一步</small></div><ContinueLearningCard compact/></section>
 <section className="section crew-practice-shortcuts"><div className="section-head"><h2>快速練習</h2><small>選一種方式</small></div><div className="grid two-col">
  <Link className="feature-card teacher-material" to="/teacher/textbook"><span className="feature-icon"><Icon name="book"/></span><strong>教材陪讀</strong><span>拍下教材，跟著老師逐頁讀</span></Link>
  {target==="英文"&&<Link className="feature-card teacher-vocab" to="/teacher/vocabulary"><span className="feature-icon"><Icon name="cards"/></span><strong>單字練習</strong><span>練習和複習不熟的字</span></Link>}
  {target==="英文"&&<Link className="feature-card teacher-scene" to="/teacher/course"><span className="feature-icon"><Icon name="scene"/></span><strong>情境課程</strong><span>從生活到工作場合逐步練習</span></Link>}
  <Link className="feature-card" to="/teacher/pronunciation"><span className="feature-icon"><Icon name="mic"/></span><strong>朗讀糾音</strong><span>練習發音、節奏與流暢度</span></Link>
 </div></section>
 {(todaySessions>0||v>0)&&<section className="section crew-today-summary"><div className="section-head"><h2>今天</h2><small>學習紀錄</small></div><div className="notice"><div><b>今天已經開始學習</b><p>{[todaySessions?todaySessions+" 次口說練習":"",v?v+" 題單字":""].filter(Boolean).join(" · ")}</p></div></div></section>}
 </>;
}
