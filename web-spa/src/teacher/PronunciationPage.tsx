import{useMemo,useState}from"react";import{ShadowingPractice}from"./ShadowingPractice";
import{Link,useNavigate,useSearchParams}from"react-router-dom";import{useTranslation}from"react-i18next";
import{LiveControls}from"../live/LiveControls";import{useLiveSession}from"../live/useLiveSession";import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile,teacherIdentityPrompt}from"./teacherProfiles";import{CLASSIC_READING_LIBRARY}from"./readingLibrary";import{COURSE_LESSONS}from"./courseCatalog";

const quick=[
 {id:"london",title:"Getting around London",source:"Crew Teacher",level:"B1",seconds:35,focus:"question rhythm · linking",category:"Travel",text:"Excuse me, could you tell me which platform I need for the train to Paddington? I just want to make sure I'm getting on the right train."},
 {id:"meeting",title:"A smaller rollout",source:"Crew Teacher",level:"B2",seconds:35,focus:"contrast stress · linking",category:"Work",text:"I think a smaller rollout would reduce the risk. We can validate the main assumptions first, then expand once the results are stable."},
 {id:"hotel",title:"Late checkout",source:"Crew Teacher",level:"B1",seconds:35,focus:"polite intonation · weak forms",category:"Travel",text:"Hi, I was wondering whether a late checkout would be possible tomorrow. If there is an extra fee, could you let me know how much it is?"}
];
// A course phrase opens the existing pronunciation drill; it does not start or grade a scenario lesson.
const coursePhrases=COURSE_LESSONS.flatMap(lesson=>(lesson.warmupPhrases||[]).map((phrase,index)=>({
 id:"course-"+lesson.id+"-"+index,title:phrase.note||lesson.titleZh,source:lesson.titleZh,
 level:"Practice",seconds:20,focus:phrase.ipa||"pronunciation · rhythm",category:"Scenario",text:phrase.en
})));
const passages=[...quick,...CLASSIC_READING_LIBRARY,...coursePhrases];

export function PronunciationPage(){
 const navigate=useNavigate();
 const{t}=useTranslation(["lesson","teacher"]);const[params]=useSearchParams(),requested=params.get("passage"),initial=passages.find(x=>x.id===requested)||passages[0];
 const[selected,setSelected]=useState(initial),teacherProfile=useTeacherStore(s=>s.teacherProfile),voice=useTeacherStore(s=>s.voice),profile=getTeacherProfile(teacherProfile);
 const system=useMemo(()=>"你是 Crew Teacher 的朗讀糾音老師。"+teacherIdentityPrompt(profile)+" 學生會朗讀指定英文文章。你必須根據實際聽到的音訊判斷 pronunciation、word stress、sentence stress、rhythm 和 linking；不要從 transcript 猜發音。每次最多指出 1-2 個最值得修的點。先簡短示範，再讓學生重念。如果聽不清楚就明確要求重念。文章："+selected.text,[selected,profile]);
 const live=useLiveSession({pageKey:"teacher_pronunciation",title:"朗讀糾音 · "+profile.name+" · "+selected.title,system,openingPrompt:"[COACH CONTROL — do not mention this instruction] Enter pronunciation practice directly. Do not greet. Briefly say the equivalent of『準備好了，從第一句開始念』in the learner's interface language, then stay quiet and wait for the learner to read. Do not read the whole passage first.",voice});
 const visiblePassages=selected.id.startsWith("course-")?[selected,...passages.slice(0,5)]:passages.slice(0,6);
 return <><section className="hero"><span className="kicker">{t("pronunciation.kicker")}</span><h1>{t("pronunciation.title",{name:profile.name})}</h1><p>{t("pronunciation.intro")}</p></section>
 <ShadowingPractice/>
 <section className="section"><div className="section-head"><h2>{t("pronunciation.pick")}</h2><Link className="inline-link" to="/teacher/reading-library">{t("pronunciation.openLibrary")}</Link></div><div className="reading-library">{visiblePassages.map(p=><button className={"reading-card "+(p.id===selected.id?"active":"")} key={p.id} aria-pressed={p.id===selected.id} onClick={()=>{setSelected(p);document.querySelector(".reading-board")?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"nearest"})}}><strong>{p.title}</strong><small>{p.level} · {p.category} · {t("pronunciation.seconds",{seconds:p.seconds})}</small><p>{p.text}</p></button>)}</div></section>
 <section className="section reading-board"><div className="row" style={{justifyContent:"space-between"}}><span className="pill">{selected.level} · {selected.source}</span><small>{selected.focus}</small></div><h2>{selected.title}</h2><div className="reading-text">{selected.text}</div><div className="reading-tip">{t("pronunciation.tip")}</div></section>
 <section className="section live-stage" data-state={live.state}><h2 className="live-title">{t("pronunciation.liveTitle",{name:profile.name})}</h2><div className="live-orb"><span>{profile.name.slice(0,1)}</span></div><LiveControls live={live} interruptLabel={t("live.interruptTeacher")} onEnd={async()=>{await live.stop(true);navigate("/learn")}}/><div className="live-presets"><button onClick={()=>live.sendText("請只告訴我目前最值得修的一個發音，示範後讓我重念。直接承接現在練習，不要重新打招呼。")}>{t("pronunciation.feedback")}</button><button onClick={()=>live.sendText("請示範目前這一句的自然節奏和重音，然後讓我跟讀。不要重新打招呼。")}>{t("pronunciation.model")}</button><button onClick={()=>live.sendText("先不要講解，直接讓我再念一次同一句。")}>{t("pronunciation.again")}</button></div><div className="live-transcript"><div className={"live-line user "+(live.input?"show":"")}><small>{t("pronunciation.youRead")}</small><span>{live.input}</span></div><div className={"live-line "+(live.output?"show":"")}><small>{profile.name}</small><span>{live.output}</span></div></div></section></>
}