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

export function PracticePage(){
 const {t}=useTranslation("teacher");
 const ready=useClientReady();
 const storedTarget=useTeacherStore(s=>s.targetLanguage);
 const target=ready?storedTarget:"英文";
 const storedProfile=useTeacherStore(s=>s.teacherProfile);
 const profile=getTeacherProfile(ready?storedProfile:"emma");
 const friendId=ready?localStorage.getItem("crew_web_selected_friend_v1"):null;
 const friend=CREW_FRIENDS.find(x=>x.id===friendId)||CREW_FRIENDS[0];
 const h=ready?history("teacher"):[],today=new Date().toDateString();
 const todaySessions=h.filter((x:any)=>new Date(x.ts||x.createdAt||0).toDateString()===today).length,v=(ready?todayVocabulary():0);
 return <>
 <section className="hero crew-practice-heading"><span className="kicker">Crew Teacher</span><h1>{t("practice.title")}</h1><p>{t("practice.intro")}</p></section>
 {ready&&!geminiKey()&&<section className="section"><GeminiSetupNotice/></section>}
 <section className="section crew-target-shortcut" aria-label={t("practice.targetLabel")}><span>{t("practice.targetLabel")}</span><strong>{target}</strong><Link to="/teacher/roles?mode=teacher">{t("practice.targetChange")}</Link></section>
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
