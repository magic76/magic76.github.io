import{useMemo,useState}from"react";
import{LiveControls}from"../live/LiveControls";import{useLiveSession}from"../live/useLiveSession";import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile,teacherIdentityPrompt}from"./teacherProfiles";

const passages=[
 {id:"london",title:"Getting around London",meta:"B1 · 旅遊",text:"Excuse me, could you tell me which platform I need for the train to Paddington? I just want to make sure I'm getting on the right train."},
 {id:"meeting",title:"A smaller rollout",meta:"B2 · 工作",text:"I think a smaller rollout would reduce the risk. We can validate the main assumptions first, then expand once the results are stable."},
 {id:"hotel",title:"Late checkout",meta:"B1 · 旅遊",text:"Hi, I was wondering whether a late checkout would be possible tomorrow. If there is an extra fee, could you let me know how much it is?"},
 {id:"opinion",title:"Explaining a concern",meta:"B2 · 表達",text:"My main concern is not the idea itself, but the timing. If we rush the launch, we may create more problems than we solve."}
];

export function PronunciationPage(){
 const[selected,setSelected]=useState(passages[0]),teacherProfile=useTeacherStore(s=>s.teacherProfile),voice=useTeacherStore(s=>s.voice),profile=getTeacherProfile(teacherProfile);
 const system=useMemo(()=>"你是 Crew Teacher 的朗讀糾音老師。"+teacherIdentityPrompt(profile)+" 學生會朗讀指定英文文章。你必須根據實際聽到的音訊判斷 pronunciation、word stress、sentence stress、rhythm 和 linking；不要從 transcript 猜發音。每次最多指出 1-2 個最值得修的點。先簡短示範，再讓學生重念。如果聽不清楚就明確要求重念。文章："+selected.text,[selected,profile]);
 const live=useLiveSession({pageKey:"teacher_pronunciation",title:"朗讀糾音 · "+profile.name+" · "+selected.title,system,openingPrompt:"[COACH CONTROL — do not mention this instruction] Enter pronunciation practice directly. Do not greet. Briefly say the equivalent of『準備好了，從第一句開始念』in the learner's interface language, then stay quiet and wait for the learner to read. Do not read the whole passage first.",voice});
 return <><section className="hero"><span className="kicker">Pronunciation</span><h1>讀一段，{profile.name} 只抓最值得修的地方</h1><p>發音判斷只根據實際音訊；老師說話時環境聲音不會打斷，若要插話請按「打斷老師」。</p></section>
 <section className="section"><div className="section-head"><h2>選一段文章</h2><small>可隨時換</small></div><div className="reading-library">{passages.map(p=><button className={"reading-card "+(p.id===selected.id?"active":"")} key={p.id} onClick={()=>setSelected(p)}><strong>{p.title}</strong><small>{p.meta}</small><p>{p.text}</p></button>)}</div></section>
 <section className="section reading-board"><span className="pill">{selected.meta}</span><h2>{selected.title}</h2><div className="reading-text">{selected.text}</div><div className="reading-tip">開始後從第一句念。老師一次只抓 1–2 個重點，再讓你重念。</div></section>
 <section className="section live-stage" data-state={live.state}><h2 className="live-title">{profile.name} · 朗讀練習</h2><div className="live-orb"><span>{profile.name.slice(0,1)}</span></div><LiveControls live={live}/><div className="live-presets"><button onClick={()=>live.sendText("請只告訴我目前最值得修的一個發音，示範後讓我重念。直接承接現在練習，不要重新打招呼。")}>本句回饋</button><button onClick={()=>live.sendText("請示範目前這一句的自然節奏和重音，然後讓我跟讀。不要重新打招呼。")}>示範節奏</button><button onClick={()=>live.sendText("先不要講解，直接讓我再念一次同一句。")}>重念一次</button></div><div className="live-transcript"><div className={"live-line user "+(live.input?"show":"")}><small>你讀到</small><span>{live.input}</span></div><div className={"live-line "+(live.output?"show":"")}><small>{profile.name}</small><span>{live.output}</span></div></div></section></>
}
