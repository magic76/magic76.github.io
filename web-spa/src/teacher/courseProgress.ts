import{COURSE_LESSONS,courseLesson,lessonsForTrack,type CourseLesson}from"./courseCatalog";
export type CourseProgress={lessonId:string;stars:number;bestScore:number;completed:boolean;lastCompletedTime:number};
const KEY="crew_teacher_course_progress_v1";
function all():Record<string,CourseProgress>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return{}}}
function write(value:Record<string,CourseProgress>){localStorage.setItem(KEY,JSON.stringify(value))}
export function lessonProgress(id:string):CourseProgress{return all()[id]||{lessonId:id,stars:0,bestScore:0,completed:false,lastCompletedTime:0}}
export function saveLessonProgress(id:string,stars:number,score:number){
 const data=all(),old=lessonProgress(id);data[id]={lessonId:id,stars:Math.max(old.stars,stars),bestScore:Math.max(old.bestScore,score),completed:old.completed||stars>=1,lastCompletedTime:Date.now()};write(data);return data[id]
}
export function lessonUnlocked(id:string){
 const lesson=courseLesson(id);if(!lesson)return false;const list=lessonsForTrack(lesson.trackId),i=list.findIndex(x=>x.id===id);if(i<=0)return true;return lessonProgress(list[i-1].id).completed
}
export function nextUnlockedLesson(trackId:string){return lessonsForTrack(trackId).find(x=>!lessonProgress(x.id).completed&&lessonUnlocked(x.id))||null}
export function completedLessons(trackId?:string){return COURSE_LESSONS.filter(x=>(!trackId||x.trackId===trackId)&&lessonProgress(x.id).completed).length}
export function totalStars(){return COURSE_LESSONS.reduce((n,x)=>n+lessonProgress(x.id).stars,0)}
export function bestNextLesson(){
 const trackIds=[...new Set(COURSE_LESSONS.map(x=>x.trackId))];let best:{lesson:CourseLesson;completed:number}|null=null;
 for(const id of trackIds){const lesson=nextUnlockedLesson(id);if(!lesson)continue;const completed=completedLessons(id);if(!best||completed>best.completed)best={lesson,completed}}
 return best?.lesson||null
}
export function scoreCourseSession(lesson:CourseLesson,turns:Array<{input?:string;output?:string}>){
 const student=turns.map(x=>x.input||"").join(" ").toLowerCase(),hits=lesson.missions.map(m=>m.keywords.some(k=>student.includes(k.toLowerCase())));
 const done=hits.filter(Boolean).length,total=Math.max(1,lesson.missions.length),score=Math.round(done/total*100);
 const stars=done===total&&done>0?3:done>=Math.ceil(total*2/3)?2:done>=1&&turns.filter(x=>x.input).length>=2?1:0;
 return{hits,done,total,score,stars}
}
