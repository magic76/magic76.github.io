import {Arrow} from "../components/Arrow";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon} from "../components/Icon";
import {geminiKey} from "../lib/runtime";
import {GeminiSetupNotice} from "../components/GeminiSetupNotice";
import {ContinueLearningCard} from "./ContinueLearningCard";
import {useTeacherStore} from "../store/teacherStore";
import {getTeacherProfile} from "./teacherProfiles";
import {TeacherAvatar} from "./TeacherAvatar";
import {useClientReady} from "../lib/useClientReady";
import {ProductDiscoverability} from "../components/ProductDiscoverability";
import {GuideHub} from "../guides/GuideHub";
import {COURSE_TRACKS,lessonsForTrack} from "./courseCatalog";
import {completedLessons} from "./courseProgress";
import {useRouteNamespace} from "../i18n/useRouteNamespace";
import {loadUiNamespace} from "../i18n";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import {hasLearningHistory} from "./learningHistory";

export function PracticePage(){
 const {t}=useTranslation("teacher");
 const {t:tToday,i18n}=useTranslation("lesson");
 const stringsReady=useRouteNamespace("lesson");
 const ready=useClientReady();
 const storedTarget=useTeacherStore(s=>s.targetLanguage);
 const target=ready?storedTarget:"英文";
 const storedProfile=useTeacherStore(s=>s.teacherProfile);
 const profile=getTeacherProfile(ready?storedProfile:"emma");
 const chinese=i18n.resolvedLanguage==="zh-TW";
 // Keep SSR and the first hydration render identical; after mount, hide empty continuations.
 const showContinue=!ready||hasLearningHistory(target,profile.id);
 // SSG prerenders zh-TW and then en through a cached React.lazy page. A lazy
 // import alone only loads the namespace for the FIRST locale. Suspend until
 // each locale's lesson catalog is ready, including on subsequent SSG passes.
 // Otherwise the English server HTML differs from the first client render.
 if(!stringsReady)throw loadUiNamespace("lesson");
 let friendId:string|null=null;
 if(ready)try{friendId=localStorage.getItem("crew_web_selected_friend_v1")}catch{/* Private browser storage may be disabled. */}
 const selectedFriend=encodeURIComponent((CREW_FRIENDS.find(x=>x.id===friendId)||CREW_FRIENDS[0]).id);
 return <>
 <section className="hero crew-practice-heading"><span className="kicker">Koolo Teacher</span><h1>{tToday("learnToday.teachersCourses")}</h1><p>{tToday("learnToday.teacherIntro")}</p></section>
 <section className="section crew-target-shortcut" aria-label={t("practice.targetLabel")}><span>{t("practice.targetLabel")}</span><strong>{t("friends:languages."+target,{defaultValue:target})}</strong><Link to="/settings#settings-learning">{t("practice.targetChange")}</Link></section>
 <section className="section crew-role-gateway" aria-label={t("practice.roleLabel")} style={!showContinue?{gridTemplateColumns:"minmax(0,1fr)"}:undefined}>
  <Link className="crew-role-entry teacher" to="/teacher/roles?mode=teacher">
   <span className="crew-role-symbol crew-role-portrait"><TeacherAvatar profile={profile}/></span>
   <strong>{t("practice.teacher")} <span className="crew-role-name">· {profile.name}</span></strong><span>{t("practice.teacherDesc")}</span>
   <small>{t("practice.teacherAction")} <Arrow direction="up-right"/></small>
  </Link>
  {showContinue&&<Link className="crew-role-entry teacher" to="/teacher/live?intent=continue">
   <span className="crew-role-symbol"><Icon name="chat"/></span><strong>{t("practiceEntry.continueTitle")}</strong>
   <span>{t("practiceEntry.continueDesc")}</span><small>{t("practice.next")} ↗</small>
  </Link>}
 </section>
 {showContinue&&<section className="section crew-continue-section"><div className="section-head"><h2>{t("practice.continue")}</h2><Link to="/learn">{tToday("learnToday.backToLearn")} <Arrow/></Link></div><ContinueLearningCard compact/></section>}
 {target==="英文"&&<section className="section crew-course-tracks" aria-label={tToday("learnToday.courseTracks")}>
  <div className="section-head"><h2>{tToday("learnToday.courseTracks")}</h2></div>
  <div className="grid two-col">{COURSE_TRACKS.map(track=>{
   const done=ready?completedLessons(track.id):0,total=lessonsForTrack(track.id).length;
   return <Link key={track.id} to={"/teacher/course/"+track.id} className="feature-card crew-course-track-card" onClick={()=>{
    try{localStorage.setItem("crew_teacher_course_track",track.id)}catch{/* Optional preference. */}
   }}><strong>{track.emoji} {chinese?track.titleZh:track.titleEn}</strong><span>{tToday("learnToday.trackProgress",{done,total})}</span></Link>;
  })}</div>
 </section>}
 {/* Secondary escape hatch only: /chat owns primary Friend entry and Shorts.
     Keep these two real, accessible links while Android owns the contract. */}
 <section className="section crew-practice-friend-links" aria-label={t("practice.friend")}>
  <div className="section-head"><h2>{t("practice.friend")}</h2><Link to="/chat">{t("practice.friendAction")} <Arrow/></Link></div>
  <div className="crew-learn-focus-secondary">
   <Link to={"/friend/live?id="+selectedFriend+"&intent=share"}>{t("practiceEntry.shareTitle")}</Link>
   <Link to={"/friend/live?id="+selectedFriend+"&intent=speak"}>{t("practiceEntry.speakTitle")}</Link>
  </div>
 </section>
 {ready&&!geminiKey()&&<section className="section"><GeminiSetupNotice compactLabel={t("practice.advancedKey")}/></section>}
 <GuideHub hideGeminiKey/>
 <section className="section crew-practice-shortcuts"><div className="section-head"><h2>{t("practice.quick")}</h2><small>{t("practice.choose")}</small></div><div className="grid two-col">
  <Link className="feature-card teacher-material" to="/teacher/textbook"><span className="feature-icon"><Icon name="book"/></span><strong>{t("practice.textbook")}</strong><span>{t("practice.textbookDesc")}</span></Link>
  {target==="英文"&&<Link className="feature-card teacher-vocab" to="/teacher/vocabulary"><span className="feature-icon"><Icon name="cards"/></span><strong>{t("practice.vocab")}</strong><span>{t("practice.vocabDesc")}</span></Link>}
  {target==="英文"&&<Link className="feature-card teacher-scene" to="/teacher/course"><span className="feature-icon"><Icon name="scene"/></span><strong>{t("practice.course")}</strong><span>{t("practice.courseDesc")}</span></Link>}
  <Link className="feature-card" to="/teacher/pronunciation"><span className="feature-icon"><Icon name="mic"/></span><strong>{t("practice.pronunciation")}</strong><span>{t("practice.pronunciationDesc")}</span></Link>
 </div></section>
 <ProductDiscoverability product="teacher"/>
 </>;
}
