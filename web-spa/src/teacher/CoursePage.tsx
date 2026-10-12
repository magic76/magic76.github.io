import{useMemo,useState}from"react";
import{useTranslation}from"react-i18next";
import{Link,useSearchParams}from"react-router-dom";
import{COURSE_TRACKS,courseLesson,lessonsForUnit,unitsForTrack}from"./courseCatalog";
import{completedLessons,lessonProgress,lessonUnlocked,totalStars}from"./courseProgress";

export function CoursePage(){
 const {t,i18n}=useTranslation("teacher");const english=i18n.resolvedLanguage==="en";
 const[p]=useSearchParams(),requested=courseLesson(p.get("lesson")||"");
 const[trackId,setTrackId]=useState(requested?.trackId||localStorage.getItem("crew_teacher_course_track")||COURSE_TRACKS[0].id);
 const track=COURSE_TRACKS.find(x=>x.id===trackId)||COURSE_TRACKS[0],units=useMemo(()=>unitsForTrack(track.id),[track.id]);
 const completed=completedLessons(track.id),total=units.reduce((n,u)=>n+lessonsForUnit(u.id).length,0);

 function select(id:string){localStorage.setItem("crew_teacher_course_track",id);setTrackId(id)}

 return <><section className="hero"><span className="kicker">Scenario lessons</span><h1>{t("course.title")}</h1><p>{t("course.intro")}</p></section>
 <section className="section panel"><div className="course-map-summary"><div><strong>{completed} / {total}</strong><span>{english?track.titleEn:track.titleZh}</span></div><div><strong>★ {totalStars()}</strong><span>{t("course.stars")}</span></div></div><div className="progress-track"><div className="progress-fill" style={{width:(total?completed/total*100:0)+"%"}}/></div></section>
 <section className="section"><div className="course-track-tabs">{COURSE_TRACKS.map(x=><button key={x.id} className={x.id===track.id?"active":""} onClick={()=>select(x.id)}><span>{x.emoji}</span><strong>{english?x.titleEn:x.titleZh}</strong><small>{completedLessons(x.id)} / {unitsForTrack(x.id).reduce((n,u)=>n+lessonsForUnit(u.id).length,0)}</small></button>)}</div></section>
 <section className="section course-map" key={track.id}><div className="course-track-intro"><span className="course-track-emoji">{track.emoji}</span><div><h2>{english?track.titleEn:track.titleZh}</h2><p>{english?track.descEn:track.descZh}</p></div></div>
 {units.map((unit,ui)=><section className="course-unit" key={unit.id}><div className="course-unit-head"><span>{ui+1}</span><div><h3>{english?unit.titleEn:unit.titleZh}</h3><p>{english?unit.descEn:unit.descZh}</p></div></div><div className="course-lesson-list">{lessonsForUnit(unit.id).map((lesson,li)=>{const prog=lessonProgress(lesson.id),unlocked=lessonUnlocked(lesson.id),highlight=requested?.id===lesson.id;return <article className={"course-lesson "+(prog.completed?"completed ":unlocked?"unlocked ":"locked ")+(highlight?"highlight":"")} key={lesson.id}><div className="course-lesson-index">{prog.completed?"✓":unlocked?li+1:"🔒"}</div><div className="course-lesson-copy"><strong>{english?lesson.titleEn:lesson.titleZh}</strong><p>{english?lesson.descEn:lesson.descZh}</p><div className="course-lesson-meta"><span>{lesson.scene}</span>{prog.completed&&<span>★ {prog.stars} · {t("course.best",{score:prog.bestScore})}</span>}</div></div>{unlocked?<Link className="btn small" to={"/teacher/live?mode=course&lesson="+encodeURIComponent(lesson.id)}>{prog.completed?t("course.review"):t("course.start")}</Link>:<span className="pill">{t("course.locked")}</span>}</article>})}</div></section>)}
 </section></>;
}
