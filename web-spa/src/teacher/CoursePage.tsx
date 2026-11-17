import {useEffect,useMemo,useState} from "react";
import {useTranslation} from "react-i18next";
import {Link,Navigate,useLocation,useNavigate,useParams,useSearchParams} from "react-router-dom";
import {COURSE_TRACKS,COURSE_UNITS,COURSE_LESSONS,courseLesson,lessonsForUnit,unitsForTrack,type CourseLesson,type CourseTrack,type CourseUnit} from "./courseCatalog";
import {courseDisplayTitle,courseDisplayDescription,courseDisplayMission} from "./courseLocale";
import {CourseBriefing} from "./CourseBriefing";
import {COURSE_SEO_TITLES} from "./courseSeoTitles";
import {bestNextLesson,completedLessons,lessonCompleted,lessonProgress,lessonUnlocked,nextUnlockedLesson,textLessonCompleted,totalStars} from "./courseProgress";
import {useTeacherStore} from "../store/teacherStore";
import {useClientReady} from "../lib/useClientReady";
import {localizedNativeName} from "./teacherLocale";
import {neutralCourseCopy} from "./teacherLanguageUx";
import "./learningFlow.css";

const TRACK_KEY="crew_teacher_course_track";
function storedTrack():string{
 try{return localStorage.getItem(TRACK_KEY)||bestNextLesson()?.trackId||COURSE_TRACKS[0].id}catch{return bestNextLesson()?.trackId||COURSE_TRACKS[0].id}
}

export function CoursePage(){
 const {t,i18n}=useTranslation("teacher");
 const {t:tLesson}=useTranslation("lesson");
 const locale=i18n.resolvedLanguage||"en";
 const english=locale==="en";
 const ready=useClientReady(),storedTarget=useTeacherStore(s=>s.targetLanguage),native=useTeacherStore(s=>s.nativeLanguage);
 const target=ready?storedTarget:"英文",otherLanguage=target!=="英文";
 const learnerName=t("friends:languages."+target,{defaultValue:target});
 const [params]=useSearchParams();const {slug}=useParams();const navigate=useNavigate();const location=useLocation();
 const pathTrack=COURSE_TRACKS.find(item=>item.id===slug);
 const requested=courseLesson(params.get("lesson")||"");
 const briefing=courseLesson(params.get("briefing")||"");
 const[trackId,setTrackId]=useState(()=>requested?.trackId||briefing?.trackId||pathTrack?.id||storedTrack());
 const track=COURSE_TRACKS.find(item=>item.id===trackId)||COURSE_TRACKS[0];
 useEffect(()=>{if(pathTrack?.id)setTrackId(current=>current===pathTrack.id?current:pathTrack.id)},[pathTrack?.id]);
 useEffect(()=>{if(pathTrack){const entry=COURSE_SEO_TITLES[pathTrack.id];document.title=neutralCourseCopy(locale.startsWith("ja")?courseDisplayTitle(pathTrack,locale):entry?(english?entry.en:entry.zh):courseDisplayTitle(pathTrack,locale),locale,target)+" | Crew Teacher"}},[pathTrack?.id,locale,target]);
 const units=useMemo(()=>unitsForTrack(track.id),[track.id]);
 const next=nextUnlockedLesson(track.id);
 const completed=completedLessons(track.id);
 const total=units.reduce((n,u)=>n+lessonsForUnit(u.id).length,0);
 const featuredUnit=requested?.trackId===track.id?requested.unitId:next?.unitId||units[0]?.id;
 const[expandedUnits,setExpandedUnits]=useState<string[]>(()=>featuredUnit?[featuredUnit]:[]);
 // A bookmark points to a specific lesson and must open the correct track/unit.
 useEffect(()=>{
  if(requested?.trackId&&requested.trackId!==trackId)setTrackId(requested.trackId);
 },[requested?.id]);
 useEffect(()=>{
  const focus=requested?.trackId===track.id?requested.unitId:next?.unitId||units[0]?.id;
  setExpandedUnits(focus?[focus]:[]);
 },[track.id,requested?.id]);
 // A deep link must reveal the bookmarked lesson, not just switch tracks.
 useEffect(()=>{
  if(!requested||requested.trackId!==track.id)return;
  const timer=window.setTimeout(()=>{
   document.querySelector(".crew-course-lesson.highlighted")?.scrollIntoView({block:"center",behavior:"auto"});
  },120);
  return()=>window.clearTimeout(timer);
 },[track.id,requested?.id]);

 function chooseTrack(id:string){
  if(id===track.id)return;
  setTrackId(id);navigate("/teacher/course/"+id);
  try{localStorage.setItem(TRACK_KEY,id)}catch{/* Optional local preference. */}
 }
 const title=(item:CourseTrack|CourseUnit|CourseLesson)=>neutralCourseCopy(courseDisplayTitle(item,locale),locale,target);
 const description=(item:CourseTrack|CourseUnit|CourseLesson)=>neutralCourseCopy(courseDisplayDescription(item,locale),locale,target);
 const route=(id:string)=>"/teacher/course/"+track.id+"?briefing="+encodeURIComponent(id);
 // Unknown course URLs must not silently show a previously stored track.
 if(slug&&!pathTrack)return <Navigate to={"/teacher/course"+location.search} replace/>;
 // Locked deep links must not bypass the Android-style sequential unlock.
 if(briefing&&lessonUnlocked(briefing.id))return <CourseBriefing lesson={briefing}/>;

 return <div className="crew-learning-focus crew-course-focus">
  <header className="crew-learning-page-heading">
   <span className="kicker">{t("course.kicker")}</span>
   <h1>{pathTrack?title(track):t("course.title")}</h1>
   <p>{t("course.intro",{tracks:COURSE_TRACKS.length,units:COURSE_UNITS.length,lessons:COURSE_LESSONS.length})}</p>
   {otherLanguage&&<p className="crew-course-language-note" role="note">{t("course.materialNotice",{language:learnerName,native:localizedNativeName(native,locale)})}</p>}
  </header>
  <section className="crew-course-resume" aria-label={t("course.nextLesson")}>
   <span className="kicker">{next?t("course.nextLesson"):t("course.trackComplete")}</span>
   <div className="crew-course-resume-header">
    <div>
     <h2>{next?title(next):title(track)}</h2>
     <p>{next?description(next):t("course.trackCompleteDesc")}</p>
    </div>
    <span className="crew-course-progress-pill">{tLesson("learnToday.trackProgress",{done:completed,total})}</span>
   </div>
   {next&&<>
    <div className="crew-course-mission-summary">
     {next.missions.map((m,index)=><span key={m.titleZh}>✓ {courseDisplayMission(next,index,locale)}</span>)}
    </div>
    <Link to={route(next.id)} className="btn primary crew-learning-full-cta">{t("course.continue")} →</Link>
   </>}
  </section>

  <section className="crew-course-selector" aria-label={t("course.selectTrack")}>
   <h2>{t("course.selectTrack")}</h2>
   <div className="crew-course-track-tabs" role="group" aria-label={t("course.selectTrack")}>
    {COURSE_TRACKS.map(item=><button key={item.id} type="button" onClick={()=>chooseTrack(item.id)}
     className={item.id===track.id?"active":""} aria-pressed={item.id===track.id}>
     <span aria-hidden="true">{item.emoji}</span>
     <strong>{title(item)}</strong>
     <small>{tLesson("learnToday.trackProgress",{done:completedLessons(item.id),total:unitsForTrack(item.id).reduce((n,u)=>n+lessonsForUnit(u.id).length,0)})}</small>
    </button>)}
   </div>
  </section>

  <section className="crew-course-map" aria-label={t("course.courseMap")}>
   <div className="crew-course-map-heading">
    <div><h2>{title(track)}</h2><p>{description(track)}</p></div>
    <span>★ {totalStars()}</span>
   </div>
   <div className="progress-track" role="progressbar" aria-label={t("course.progress")}
    aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}>
    <div className="progress-fill" style={{width:(total?completed/total*100:0)+"%"}}/>
   </div>
   {units.map((unit,ui)=>{
    const lessons=lessonsForUnit(unit.id);
    const count=lessons.filter(lesson=>lessonCompleted(lesson.id)).length;
    return <details className="crew-course-unit" key={unit.id} open={expandedUnits.includes(unit.id)}
     onToggle={event=>{
      const opened=event.currentTarget.open;
      setExpandedUnits(previous=>opened
       ?previous.includes(unit.id)?previous:[...previous,unit.id]
       :previous.filter(id=>id!==unit.id));
     }}>
     <summary>
      <span className="crew-course-unit-number">{ui+1}</span>
      <span className="crew-course-unit-title"><strong>{title(unit)}</strong><small>{count} / {lessons.length} · {description(unit)}</small></span>
      <span className="crew-course-unit-chevron" aria-hidden="true">⌄</span>
     </summary>
     <div className="crew-course-lessons">
      {lessons.map((lesson,li)=>{
       const progress=lessonProgress(lesson.id),textDone=textLessonCompleted(lesson.id),finished=progress.completed||textDone;
       const unlocked=lessonUnlocked(lesson.id);
       const isNext=next?.id===lesson.id;
       const inner=<>
        <span className="crew-course-lesson-index">{finished?"✓":unlocked?li+1:"🔒"}</span>
        <span className="crew-course-lesson-copy">
         <strong>{title(lesson)}</strong>
         <small>{description(lesson)}</small>
         {progress.completed&&<em>★ {progress.stars} · {t("course.best",{score:progress.bestScore})}</em>}
          {textDone&&<em className="crew-course-text-badge">{tLesson("live.textCourseBadge")}</em>}
        </span>
        <span className="crew-course-lesson-action" aria-hidden="true">{unlocked?"→":"·"}</span>
       </>;
       const className="crew-course-lesson "+(finished?"completed":unlocked?"unlocked":"locked")+(textDone?" text-completed":"")+(isNext?" is-next":"")+(requested?.id===lesson.id?" highlighted":"");
       return unlocked
        ?<Link key={lesson.id} to={route(lesson.id)} className={className} aria-label={title(lesson)+" · "+(finished?t("course.review"):t("course.start"))}>{inner}</Link>
        :<div key={lesson.id} className={className} aria-disabled="true">{inner}</div>;
      })}
     </div>
    </details>;
   })}
  </section>
 </div>;
}
