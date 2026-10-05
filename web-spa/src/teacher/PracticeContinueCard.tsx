import{useEffect,useState}from"react";
import{Link}from"react-router-dom";
import{ensureTeacherServices,lastLive,vocabularyLevel}from"../lib/runtime";
import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";

type TextbookSession={plan?:{title?:string};currentPage?:number;images?:unknown[]};

export function PracticeTutorStrip(){
 const teacherId=useTeacherStore(s=>s.teacherProfile),profile=getTeacherProfile(teacherId);
 return <Link className="practice-tutor-strip" to="/teacher/tutor">
  <span className="practice-tutor-avatar"><img src={profile.avatar} alt={profile.name}/></span>
  <span><small>目前老師</small><strong>{profile.name} · {profile.title}</strong></span>
  <b>›</b>
 </Link>;
}

export function PracticeContinueCard(){
 const[textbook,setTextbook]=useState<TextbookSession|null>(null),[ready,setReady]=useState(false);
 const teacherId=useTeacherStore(s=>s.teacherProfile),profile=getTeacherProfile(teacherId);
 const live=lastLive("teacher"),done=Number(localStorage.getItem("crew_vocab_today")||0);

 useEffect(()=>{void ensureTeacherServices().then(async()=>{
  setTextbook((await window.CrewTextbookStore?.last())||null);setReady(true);
 }).catch(()=>setReady(true))},[]);

 let to="/teacher/live",title="和老師練一下今天的重點",note=profile.name+" 已準備好，直接開口開始練習。",action="開始重點練習  →";
 if(textbook){
  const current=(Number(textbook.currentPage)||0)+1,total=textbook.images?.length||1;
  to="/teacher/textbook";title="接著學："+(textbook.plan?.title||"上次教材");note="教材陪讀 · 第 "+current+" / "+total+" 頁";action="繼續下一課  →";
 }else if(live){
  to="/teacher/live?resume=1";title="和老師練一下今天的重點";note=(live.title||"上次口說練習")+" · 可以直接接著聊";action="開始重點練習  →";
 }else if(done>0&&done<20){
  to="/teacher/vocabulary";title="繼續單字練習";note="目前單字程度："+vocabularyLevel()+" · 今日 "+done+" / 20";action="現在複習  →";
 }

 return <section className="practice-next-card">
  <span className="kicker">今天下一步</span>
  <h2>{ready?title:"正在整理今天下一步…"}</h2>
  <p>{ready?note:""}</p>
  <Link className="practice-next-action" to={to}>{ready?action:""}</Link>
 </section>;
}
