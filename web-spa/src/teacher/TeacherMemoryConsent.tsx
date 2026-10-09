import{useEffect,useState}from"react";
import{hasPersonalMemoryDecision,personalMemoryEnabled,setPersonalMemoryEnabled}from"./studentMemory";
import{useTeacherStore}from"../store/teacherStore";
import{teacherText}from"./teacherLocale";

/** A one-time, optional choice. No silent opt-in and no repeated nagging. */
export function TeacherMemoryConsent(){
 const native=useTeacherStore(s=>s.nativeLanguage);
 const [show,setShow]=useState(false);
 useEffect(()=>{if(!hasPersonalMemoryDecision())setShow(true)},[]);
 if(!show)return null;
 const en=native==="en";
 return <div className="teacher-consent-backdrop" role="presentation"><section className="teacher-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="teacher-consent-title">
 <h2 id="teacher-consent-title">{en?"Let your teacher remember how you learn?":teacherText(native,"memoryTitle")}</h2>
 <p>{en?"Your teacher already remembers learning strengths, weaknesses and progress after eligible practice sessions. With permission it can also remember goals, interests and teaching preferences you clearly say.":"老師會在符合條件的課後，自動記住你的學習強項、弱點與進步。你也可以允許老師記住你明確說出的學習目標、興趣與教學偏好。"}</p>
 <p className="meta">{en?"Notes stay in this browser; relevant notes are sent to Gemini during learning. You can change this later under My → What my teacher knows.":"記憶只保存在這台瀏覽器；練習時會挑選相關筆記送給 Gemini。可隨時在「我的 → 老師對我的了解」修改、停用或清空。"}</p>
 <div className="actions teacher-consent-actions">
 <button className="btn secondary" onClick={()=>{setPersonalMemoryEnabled(false);setShow(false)}}>{en?"Not now":"暫不啟用"}</button>
 <button className="btn" onClick={()=>{setPersonalMemoryEnabled(true);setShow(false)}}>{en?"Enable personalized memory":"同意個人化記憶"}</button></div>
 </section></div>;
}
