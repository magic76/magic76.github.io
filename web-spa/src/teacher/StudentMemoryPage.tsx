import {Arrow} from "../components/Arrow";
import{useState}from"react";
import{Link}from"react-router-dom";
import{useTeacherStore}from"../store/teacherStore";
import{type MemoryKind,type MemoryItem,studentMemories,saveStudentMemory,updateStudentMemory,
 deleteStudentMemory,clearStudentMemory,personalMemoryEnabled}from"./studentMemory";

const LABELS:Record<MemoryKind,string>={fact:"生活事實",goal:"學習目標",interest:"興趣",preference:"教學偏好",weakness:"待加強",strength:"做得好",win:"已進步",focus:"下次重點"};
const TYPES:MemoryKind[]=["fact","goal","interest","preference","weakness","focus"];
const personal=(m:MemoryItem)=>["fact","goal","interest","preference"].includes(m.type);
export function StudentMemoryPage(){
 const lang=useTeacherStore(s=>s.targetLanguage);
 const [items,setItems]=useState(()=>studentMemories(lang));
 const [type,setType]=useState<MemoryKind>("goal"),[text,setText]=useState("");
 const consent=personalMemoryEnabled();
 const [edit,setEdit]=useState(""),[draft,setDraft]=useState("");
 const [filter,setFilter]=useState<MemoryKind|"all">("all");
 const refresh=()=>setItems(studentMemories(lang));
 // Re-read storage whenever language changes; no cross-language leakage.
 const [currentLang,setCurrentLang]=useState(lang);
 if(currentLang!==lang){setCurrentLang(lang);setItems(studentMemories(lang));setEdit("")}
 const display=filter==="all"?items:items.filter(m=>m.type===filter);
 return <><section className="hero"><span className="kicker">Personalized Learning</span><h1>老師對我的了解</h1>
 <p>老師會在有意義的對話中或課後，自動整理明確提及的生活事實、學習進步與待加強項目，你可以隨時編輯或刪除。這些資訊只保存在目前瀏覽器，依學習語言分開儲存。</p></section>
 <section className="section panel teacher-memory-panel">
 <div className="section-head"><h2>自己補充記憶（選填）</h2><small>{lang}</small></div>
 <div className="teacher-memory-form"><select aria-label="記憶類型" className="field" value={type} onChange={e=>setType(e.target.value as MemoryKind)}>{TYPES.map(x=><option key={x} value={x}>{LABELS[x]}</option>)}</select>
 <textarea className="field" rows={3} value={text} onChange={e=>setText(e.target.value)} maxLength={180} placeholder="例如：希望能用英文主持工作會議；講解時少用中文"/>
 <button className="btn" disabled={!text.trim()} onClick={()=>{saveStudentMemory(lang,type,text);setText("");refresh()}}>儲存給老師</button></div>
 </section>
 <section className="section panel teacher-memory-panel"><h2>個人化記憶</h2>
 <p className="meta">目前：{consent?"已開啟":"已關閉"}。記憶預設開啟，可到設定關閉；關閉後不再自動整理或提供個人偏好給老師與朋友，已保存的記憶仍可在此編輯或刪除。</p>
 <Link className="inline-link" to="/settings#memory-settings">前往設定調整記憶 <Arrow/></Link>
 </section>
 <section className="section"><div className="section-head"><h2>目前記憶</h2><small>{display.length} / {items.length} 筆</small></div><label className="label" htmlFor="memory-filter">篩選記憶類型</label><select id="memory-filter" className="field" value={filter} onChange={e=>setFilter(e.target.value as MemoryKind|"all")}><option value="all">全部類型</option>{(Object.keys(LABELS) as MemoryKind[]).map(kind=><option key={kind} value={kind}>{LABELS[kind]}</option>)}</select>
 {display.length?<div className="teacher-memory-list">{display.map(m=><article className="panel teacher-memory-item" key={m.id}>
 <div className="row" style={{justifyContent:"space-between",gap:8}}><span className="pill">{LABELS[m.type]} · {m.source==="self"?"我自己新增":"課後整理"}{!m.active?" · 已掌握":""}</span><span className="meta">{m.observations>1?m.observations+" 次觀察":""}</span></div>
 {edit===m.id?<div className="teacher-memory-form"><textarea className="field" rows={2} maxLength={180} value={draft} onChange={e=>setDraft(e.target.value)}/><div className="actions"><button className="btn small" onClick={()=>{updateStudentMemory(lang,m.id,{detail:draft});setEdit("");refresh()}}>儲存</button><button className="btn secondary small" onClick={()=>setEdit("")}>取消</button></div></div>:<p>{m.detail}</p>}
 <div className="actions">
 {edit!==m.id&&<button className="btn secondary small" onClick={()=>{setEdit(m.id);setDraft(m.detail)}}>編輯</button>}
 {!personal(m)&&<button className="btn secondary small" onClick={()=>{updateStudentMemory(lang,m.id,{active:!m.active});refresh()}}>{m.active?"標記已掌握":"重新練習"}</button>}
 <button className="btn secondary small" onClick={()=>{deleteStudentMemory(lang,m.id);refresh()}}>刪除</button>
 </div></article>)}</div>:<div className="notice"><div><b>還沒有記憶</b><p>分享有意義的事情，即使只是一次簡短對話，也有機會自動留下記憶。也可以手動補充目標。</p></div></div>}
 </section>
 <section className="section teacher-memory-footer"><button className="btn secondary small" onClick={()=>{if(window.confirm("確定清空「"+lang+"」的老師記憶？其他語言、單字及課程進度不受影響。")){clearStudentMemory(lang);refresh()}}}>清空這個語言的記憶</button>
 <Link className="inline-link" to="/teacher/me">返回我的</Link></section>
 </>;
}
