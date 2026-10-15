import{Link}from"react-router-dom";
import{useTranslation}from"react-i18next";
import{Icon}from"../components/Icon";
import{geminiKey,history}from"../lib/runtime";
import{GeminiSetupNotice}from"../components/GeminiSetupNotice";
import{ContinueLearningCard}from"./ContinueLearningCard";
import{todayVocabulary}from"./vocabularyProgress";
import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";
import{TeacherAvatar}from"./TeacherAvatar";
import{CREW_FRIENDS}from"../friends/friendProfiles";
import{FriendAvatar}from"../friends/FriendAvatar";
import{useClientReady}from"../lib/useClientReady";
import{ProductDiscoverability}from"../components/ProductDiscoverability";
import {GuideHub} from "../guides/GuideHub";

export function PracticePage(){
 const {t,i18n}=useTranslation("teacher");
 const english=i18n.language.startsWith("en");
 const ready=useClientReady();
 const storedTarget=useTeacherStore(s=>s.targetLanguage);
 const target=ready?storedTarget:"英文";
 const storedProfile=useTeacherStore(s=>s.teacherProfile);
 const profile=getTeacherProfile(ready?storedProfile:"emma");
 const friendId=ready?localStorage.getItem("crew_web_selected_friend_v1"):null;
 const friend=CREW_FRIENDS.find(x=>x.id===friendId)||CREW_FRIENDS[0];
 const selectedFriend=encodeURIComponent(friend.id);
 const h=ready?history("teacher"):[],today=new Date().toDateString();
 const todaySessions=h.filter((x:any)=>new Date(x.ts||x.createdAt||0).toDateString()===today).length,v=(ready?todayVocabulary():0);
 return <>
 <section className="hero crew-practice-heading"><span className="kicker">Crew Teacher</span><h1>{t("practice.title")}</h1><p>{t("practice.intro")}</p></section>
 {ready&&!geminiKey()&&<section className="section"><GeminiSetupNotice/></section>}
 <section className="section crew-target-shortcut" aria-label={t("practice.targetLabel")}><span>{t("practice.targetLabel")}</span><strong>{target}</strong><Link to="/teacher/roles?mode=teacher">{t("practice.targetChange")}</Link></section>
 <section className="section crew-daily-intents" aria-label={english?"Choose your conversation":"今天想做什麼？"}>
  <div className="section-head"><h2>{english?"What do you feel like doing?":"今天想做什麼？"}</h2><small>{english?"Start with a reason to speak":"先選想做的事，再開始聊天"}</small></div>
  <div className="crew-intent-grid">
   <Link className="crew-intent-card" to={"/friend/live?id="+selectedFriend+"&intent=share"}><span className="crew-intent-icon"><Icon name="chat"/></span><strong>{english?"Share something from today":"跟朋友說說今天的事"}</strong><small>{english?"Just talk. No lesson or pressure.":"自然聊天、不必準備話題"}</small></Link>
   <Link className="crew-intent-card" to={"/friend/live?id="+selectedFriend+"&intent=speak"}><span className="crew-intent-icon"><Icon name="mic"/></span><strong>{english?"Chat for 3 minutes":"隨便聊 3 分鐘外語"}</strong><small>{english?"A relaxed target-language conversation.":"外語陪聊，不考試不強迫糾錯"}</small></Link>
   <Link className="crew-intent-card" to="/teacher/live?intent=continue"><span className="crew-intent-icon"><Icon name="book"/></span><strong>{english?"Continue speaking practice":"接續上次的練習"}</strong><small>{english?"Your tutor adapts to known progress.":"老師依已知學習進度引導"}</small></Link>
  </div>
 </section>
   <section className="section crew-role-gateway" aria-label={t("practice.roleLabel")}>
  <Link className="crew-role-entry friend" to="/teacher/roles?mode=friends">
   <span className="crew-role-symbol crew-role-portrait"><FriendAvatar friend={friend}/></span>
   <strong>{t("practice.friend")} <span className="crew-role-name">· {friend.name}</span></strong><span>{t("practice.friendDesc")}</span>
   <small>{t("practice.friendAction")} <b aria-hidden="true">↗</b></small>
  </Link>
  <Link className="crew-role-entry teacher" to="/teacher/roles?mode=teacher">
   <span className="crew-role-symbol crew-role-portrait"><TeacherAvatar profile={profile}/></span>
   <strong>{t("practice.teacher")} <span className="crew-role-name">· {profile.name}</span></strong><span>{t("practice.teacherDesc")}</span>
   <small>{t("practice.teacherAction")} <b aria-hidden="true">↗</b></small>
  </Link>
 </section>
 <section className="section crew-continue-section"><div className="section-head"><h2>{t("practice.continue")}</h2><small>{t("practice.next")}</small></div><ContinueLearningCard compact/></section>
 <GuideHub/>
 <section className="section crew-practice-shortcuts"><div className="section-head"><h2>{t("practice.quick")}</h2><small>{t("practice.choose")}</small></div><div className="grid two-col">
  <Link className="feature-card teacher-material" to="/teacher/textbook"><span className="feature-icon"><Icon name="book"/></span><strong>{t("practice.textbook")}</strong><span>{t("practice.textbookDesc")}</span></Link>
  {target==="英文"&&<Link className="feature-card teacher-vocab" to="/teacher/vocabulary"><span className="feature-icon"><Icon name="cards"/></span><strong>{t("practice.vocab")}</strong><span>{t("practice.vocabDesc")}</span></Link>}
  {target==="英文"&&<Link className="feature-card teacher-scene" to="/teacher/course"><span className="feature-icon"><Icon name="scene"/></span><strong>{t("practice.course")}</strong><span>{t("practice.courseDesc")}</span></Link>}
  <Link className="feature-card" to="/teacher/pronunciation"><span className="feature-icon"><Icon name="mic"/></span><strong>{t("practice.pronunciation")}</strong><span>{t("practice.pronunciationDesc")}</span></Link>
 </div></section>
 {(todaySessions>0||v>0)&&<section className="section crew-today-summary"><div className="section-head"><h2>{t("practice.today")}</h2><small>{t("practice.record")}</small></div><div className="notice"><div><b>{t("practice.done")}</b><p>{[todaySessions?t("practice.sessions",{count:todaySessions}):"",v?t("practice.words",{count:v}):""].filter(Boolean).join(" · ")}</p></div></div></section>}
 <ProductDiscoverability product="teacher"/>
 </>;
}
