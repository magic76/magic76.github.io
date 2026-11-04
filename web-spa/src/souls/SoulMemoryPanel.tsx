import {type FormEvent} from "react";
import {type Soul} from "./soulData";
export function SoulMemoryPanel({soul,en,note,onNoteChange,onAdd,onRememberChange,onDelete}:{
 soul:Soul;en:boolean;note:string;onNoteChange:(text:string)=>void;
 onAdd:(event:FormEvent<HTMLFormElement>)=>void;
 onRememberChange:(enabled:boolean)=>void;onDelete:(id:string)=>void
}){
 const t=(zh:string,english:string)=>en?english:zh;
 return (   <section className="souls-panel">
    <h2>{t("它記得的事","Memories")} <small>({soul.notes.length}/30)</small></h2>
    <label className="souls-checkbox"><input type="checkbox" checked={soul.remember}
     onChange={e=>onRememberChange(e.target.checked)}/>
     {t("聊天時使用並擷取回憶","Use and capture memories during chats")}
    </label>
    <p className="souls-muted">{t("只保存有依據的摘要，不保留逐字稿；可逐則刪除。","Only grounded notes are saved, not full transcripts. Delete any note.")}</p>
    <form className="souls-note" onSubmit={onAdd}>
     <input value={note} maxLength={180} onChange={e=>onNoteChange(e.target.value)}
      aria-label={t("新增回憶","New memory")} placeholder={t("手動記下想讓它記得的事…","Add a memory…")}/>
     <button disabled={!note.trim()}>{t("記住","Remember")}</button>
    </form>
    <ul className="souls-notes">{[...soul.notes].reverse().map(n=><li key={n.id}>
     <span>{n.text}<small>{n.source==="manual"?t("手動","Manual"):t("聊天擷取","From chat")}</small></span>
     <button type="button" aria-label={t("刪除回憶","Delete memory")}
      onClick={()=>onDelete(n.id)}>×</button>
    </li>)}</ul>
   </section>);
}
