import{useState}from"react";
import{Link}from"react-router-dom";
import{useTeacherStore}from"../store/teacherStore";
import{type MemoryKind,type MemoryItem,studentMemories,saveStudentMemory,updateStudentMemory,
 deleteStudentMemory,clearStudentMemory,personalMemoryEnabled,setPersonalMemoryEnabled}from"./studentMemory";

const LABELS:Record<MemoryKind,string>={goal:"學習目標",interest:"興趣",preference:"教學偏好",weakness:"待加強",strength:"做得好",win:"已進步",focus:"下次重點"};
const TYPES:MemoryKind[]=["goal","interest","preference","weakness","focus"];
const personal=(m:MemoryItem)=>["goal","interest","preference"].includes(m.type);
export function StudentMemoryPage(){
 const lang=useTeacherStore(s=>s.targetLanguage);
 const [items,setItems]=useState(()=>studentMemories(lang));
 const [type,setType]=useState<MemoryKind>("goal"),[text,setText]=useState("");
 const [consent,setConsent]=useState(personalMemoryEnabled);
 const [edit,setEdit]=useState(""),[draft,setDraft]=useState("");
 const refresh=()=>setItems(studentMemories(lang));
 // Re-read storage whenever language changes; no cross-language leakage.
 const [currentLang,setCurrentLang]=useState(lang);
 if(currentLang!==lang){setCurrentLang(lang);setItems(studentMemories(lang));setEdit("")}
 const display=items.filter(x=>!personal(x)||x.source==="self"||consent);
 return <><section className="hero"><span className="kicker">Personalized Learning</span><h1>老師對我的了解</h1>
 <p>老師記得你的學習目標、需要加強的地方與進步。這些資訊只保存在目前瀏覽器，依學習語言分開儲存。</p></section>
 <section className="section panel teacher-memory-panel">
 <div className="section-head"><h2>告訴老師關於我</h2><small>{lang}</small></div>
 <div className="teacher-memory-form"><select aria-label="記憶類型" className="field" value={type} onChange={e=>setType(e.target.value as MemoryKind)}>{TYPES.map(x=><option key={x} value={x}>{LABELS[x]}</option>)}</select>
 <textarea className="field" rows={3} value={text} onChange={e=>setText(e.target.value)} maxLength={180} placeholder="例如：希望能用英文主持工作會議；講解時少用中文"/>
 <button className="btn" disabled={!text.trim()} onClick={()=>{saveStudentMemory(lang,type,text);setText("");refresh()}}>儲存給老師</button></div>
 </section>
 <section className="section panel teacher-memory-panel"><h2>個人資訊由你決定</h2>
 <label className="teacher-memory-consent"><input type="checkbox" checked={consent} onChange={e=>{
 const enabled=e.target.checked;
 if(enabled&&!window.confirm("允許課後 AI 從你明確說過的話中整理學習相關目標、興趣與偏好？可隨時關閉。"))return;
 setPersonalMemoryEnabled(enabled);setConsent(enabled);refresh();
 }}/><span>允許課後自動整理我明確說過的目標、興趣與偏好</span></label>
 <p className="meta">預設關閉。關閉後不會把過去自動提取的個人資訊提供給老師；手動新增的資訊仍會使用。課後弱點及進步紀錄不受此開關影響。</p>
 </section>
 <section className="section"><div className="section-head"><h2>目前記憶</h2><small>{display.length} 筆</small></div>
 {display.length?<div className="teacher-memory-list">{display.map(m=><article className="panel teacher-memory-item" key={m.id}>
 <div className="row" style={{justifyContent:"space-between",gap:8}}><span className="pill">{LABELS[m.type]} · {m.source==="self"?"我自己新增":"課後整理"}{!m.active?" · 已掌握":""}</span><span className="meta">{m.observations>1?m.observations+" 次觀察":""}</span></div>
 {edit===m.id?<div className="teacher-memory-form"><textarea className="field" rows={2} maxLength={180} value={draft} onChange={e=>setDraft(e.target.value)}/><div className="actions"><button className="btn small" onClick={()=>{updateStudentMemory(lang,m.id,{detail:draft});setEdit("");refresh()}}>儲存</button><button className="btn secondary small" onClick={()=>setEdit("")}>取消</button></div></div>:<p>{m.detail}</p>}
 <div className="actions">
 {edit!==m.id&&<button className="btn secondary small" onClick={()=>{setEdit(m.id);setDraft(m.detail)}}>編輯</button>}
 {!personal(m)&&<button className="btn secondary small" onClick={()=>{updateStudentMemory(lang,m.id,{active:!m.active});refresh()}}>{m.active?"標記已掌握":"重新練習"}</button>}
 <button className="btn secondary small" onClick={()=>{deleteStudentMemory(lang,m.id);refresh()}}>刪除</button>
 </div></article>)}</div>:<div className="notice"><div><b>還沒有記憶</b><p>新增一個目標，或完成有足夠內容的口說練習後，老師就會逐漸了解你。</p></div></div>}
 </section>
 <section className="section teacher-memory-footer"><button className="btn secondary small" onClick={()=>{if(window.confirm("確定清空「"+lang+"」的老師記憶？其他語言、單字及課程進度不受影響。")){clearStudentMemory(lang);refresh()}}}>清空這個語言的記憶</button>
 <Link className="inline-link" to="/teacher/me">返回我的</Link></section>
 </>;
}
