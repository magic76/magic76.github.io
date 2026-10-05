import{useMemo,useState}from"react";
import{Link,useSearchParams}from"react-router-dom";
import{COURSE_TRACKS,courseLesson,lessonsForUnit,unitsForTrack}from"./courseCatalog";
import{completedLessons,lessonProgress,lessonUnlocked,totalStars}from"./courseProgress";

export function CoursePage(){
 const[p]=useSearchParams(),requested=courseLesson(p.get("lesson")||"");
 const[trackId,setTrackId]=useState(requested?.trackId||localStorage.getItem("crew_teacher_course_track")||COURSE_TRACKS[0].id);
 const track=COURSE_TRACKS.find(x=>x.id===trackId)||COURSE_TRACKS[0],units=useMemo(()=>unitsForTrack(track.id),[track.id]);
 const completed=completedLessons(track.id),total=units.reduce((n,u)=>n+lessonsForUnit(u.id).length,0);

 function select(id:string){localStorage.setItem("crew_teacher_course_track",id);setTrackId(id)}

 return <><section className="hero"><span className="kicker">Scenario lessons</span><h1>用任務練真實對話</h1><p>直接沿用 App 的課程架構：3 個 Track、10 個 Unit、31 堂課；完成前一課才會解鎖下一課。</p></section>
 <section className="section panel"><div className="course-map-summary"><div><strong>{completed} / {total}</strong><span>{track.titleZh}</span></div><div><strong>★ {totalStars()}</strong><span>累積星星</span></div></div><div className="progress-track"><div className="progress-fill" style={{width:(total?completed/total*100:0)+"%"}}/></div></section>
 <section className="section"><div className="course-track-tabs">{COURSE_TRACKS.map(x=><button key={x.id} className={x.id===track.id?"active":""} onClick={()=>select(x.id)}><span>{x.emoji}</span><strong>{x.titleZh}</strong><small>{completedLessons(x.id)} / {unitsForTrack(x.id).reduce((n,u)=>n+lessonsForUnit(u.id).length,0)}</small></button>)}</div></section>
 <section className="section course-map"><div className="course-track-intro"><span className="course-track-emoji">{track.emoji}</span><div><h2>{track.titleZh}</h2><p>{track.descZh}</p></div></div>
 {units.map((unit,ui)=><section className="course-unit" key={unit.id}><div className="course-unit-head"><span>{ui+1}</span><div><h3>{unit.titleZh}</h3><p>{unit.descZh}</p></div></div><div className="course-lesson-list">{lessonsForUnit(unit.id).map((lesson,li)=>{const prog=lessonProgress(lesson.id),unlocked=lessonUnlocked(lesson.id),highlight=requested?.id===lesson.id;return <article className={"course-lesson "+(prog.completed?"completed ":unlocked?"unlocked ":"locked ")+(highlight?"highlight":"")} key={lesson.id}><div className="course-lesson-index">{prog.completed?"✓":unlocked?li+1:"🔒"}</div><div className="course-lesson-copy"><strong>{lesson.titleZh}</strong><p>{lesson.descZh}</p><div className="course-lesson-meta"><span>{lesson.scene}</span>{prog.completed&&<span>★ {prog.stars} · Best {prog.bestScore}</span>}</div></div>{unlocked?<Link className="btn small" to={"/teacher/live?mode=course&lesson="+encodeURIComponent(lesson.id)}>{prog.completed?"再練一次":"開始"}</Link>:<span className="pill">未解鎖</span>}</article>})}</div></section>)}
 </section></>;
}
