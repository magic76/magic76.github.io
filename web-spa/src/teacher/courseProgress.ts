import{COURSE_LESSONS,courseLesson,lessonsForTrack,type CourseLesson}from"./courseCatalog";
export type CourseProgress={lessonId:string;stars:number;bestScore:number;completed:boolean;lastCompletedTime:number};
const KEY="crew_teacher_course_progress_v1";
const TEXT_KEY="crew_teacher_course_text_progress_v1";
/** Device-local text completion, kept separate from scored speaking sessions. */
function textRecords():Record<string,number>{
 try{
  const data:unknown=JSON.parse(localStorage.getItem(TEXT_KEY)||"{}");
  return data&&typeof data==="object"&&!Array.isArray(data)?data as Record<string,number>:{};
 }catch{return{}}
}
export function textLessonCompleted(id:string):boolean{
 const at=textRecords()[id];return typeof at==="number"&&Number.isFinite(at)&&at>0;
}
export function textCompletedLessons(trackId?:string):number{
 return COURSE_LESSONS.filter(x=>(!trackId||x.trackId===trackId)&&textLessonCompleted(x.id)).length;
}
export function lessonCompleted(id:string):boolean{return lessonProgress(id).completed||textLessonCompleted(id)}
export function saveTextLessonProgress(id:string):boolean{
 if(!courseLesson(id)||!lessonUnlocked(id))return false;
 try{
  const data=textRecords();
  if(!textLessonCompleted(id)){data[id]=Date.now();localStorage.setItem(TEXT_KEY,JSON.stringify(data))}
  return true;
 }catch{return false}
}
function all():Record<string,CourseProgress>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return{}}}
function write(value:Record<string,CourseProgress>){localStorage.setItem(KEY,JSON.stringify(value))}
export function lessonProgress(id:string):CourseProgress{return all()[id]||{lessonId:id,stars:0,bestScore:0,completed:false,lastCompletedTime:0}}
export function saveLessonProgress(id:string,stars:number,score:number){
 const data=all(),old=lessonProgress(id);data[id]={lessonId:id,stars:Math.max(old.stars,stars),bestScore:Math.max(old.bestScore,score),completed:old.completed||stars>=1,lastCompletedTime:Date.now()};write(data);return data[id]
}
export function lessonUnlocked(id:string){
 const lesson=courseLesson(id);if(!lesson)return false;const list=lessonsForTrack(lesson.trackId),i=list.findIndex(x=>x.id===id);if(i<=0)return true;return lessonCompleted(list[i-1].id)
}
export function nextUnlockedLesson(trackId:string){return lessonsForTrack(trackId).find(x=>!lessonCompleted(x.id)&&lessonUnlocked(x.id))||null}
export function completedLessons(trackId?:string){return COURSE_LESSONS.filter(x=>(!trackId||x.trackId===trackId)&&lessonCompleted(x.id)).length}
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
