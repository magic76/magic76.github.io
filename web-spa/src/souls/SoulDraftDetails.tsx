import {type Dispatch,type FormEvent,type SetStateAction} from "react";
import {type Soul,type SoulSubjectType,persona} from "./soulData";
import {randomSoulVoice,soulVoiceLabel} from "./soulVoice";

export function SoulDraftDetails({
 en,subjectType,busy,name,setName,kind,setKind,description,setDescription,
 personality,setPersonality,draftVoice,setDraftVoice,rememberEnabled,setRememberEnabled,onSuggest,onCreate
}:{
 en:boolean;subjectType:SoulSubjectType;busy:boolean;
 name:string;setName:(value:string)=>void;kind:string;setKind:(value:string)=>void;
 description:string;setDescription:(value:string)=>void;
 personality:Soul["personality"];setPersonality:(value:Soul["personality"])=>void;
 draftVoice:string;setDraftVoice:Dispatch<SetStateAction<string>>;
 rememberEnabled:boolean;setRememberEnabled:(value:boolean)=>void;
 onSuggest:()=>void;onCreate:(event:FormEvent<HTMLFormElement>)=>void
}){
 const t=(zh:string,english:string)=>en?english:zh;
 return (   <div className="souls-editor-details">
    <div className="souls-section-heading"><div><small>{t("02 · 設定角色個性","02 · SET PERSONALITY")}</small>
     <h2>{t("幫它取個名字","Name your Soul")}</h2></div></div>
    <button className="souls-ai-describe" type="button" disabled={busy}
     onClick={onSuggest}>
     {t("✧ 讓 Gemini 幫忙取名（會上傳照片）","✧ Gemini name suggestion (uploads photo)")}
    </button>
    <form className="souls-form" onSubmit={onCreate}>
     <label>{t("名字 *","Name *")}
      <input required maxLength={40} value={name} onChange={e=>setName(e.target.value)}
       placeholder={t("例如：小杯杯","e.g. Mugsy")}/>
     </label>
     <label>{t(subjectType==="person"?"角色定位":"物品種類",subjectType==="person"?"Character role":"Object type")}
      <input maxLength={60} value={kind} onChange={e=>setKind(e.target.value)}
       placeholder={t(subjectType==="person"?"例如：愛旅行的虛構角色":"例如：咖啡杯",subjectType==="person"?"e.g. Fictional traveler":"e.g. Coffee mug")}/>
     </label>
     <label>{t("外觀特色（選填）","Appearance (optional)")}
      <textarea maxLength={140} value={description} onChange={e=>setDescription(e.target.value)}/>
     </label>
     <fieldset><legend>{t("它是什麼個性？","Personality")}</legend>
      <div className="souls-pills">
       {(Object.keys(persona) as Soul["personality"][]).map(id=><button type="button" key={id}
        aria-pressed={personality===id} onClick={()=>setPersonality(id)}>
        {en?persona[id][1]:persona[id][0]}</button>)}
      </div>
     </fieldset>
     <div className="souls-voice-choice">
      <span>{t("專屬聲線","Soul voice")}：<strong>{soulVoiceLabel(draftVoice)}</strong></span>
      <button type="button" onClick={()=>setDraftVoice(previous=>randomSoulVoice(previous))}>
       {t("換個聲音","Shuffle voice")}
      </button>
      <small>{t("從 Gemini Live 聲線中隨機選一種，儲存後不會自己改變。","Randomly chosen from Gemini Live voices; stays the same after saving.")}</small>
     </div>
     <label className="souls-checkbox"><input type="checkbox" checked={rememberEnabled}
      onChange={e=>setRememberEnabled(e.target.checked)}/>
      {t("允許聊天時擷取有依據的回憶（之後可關閉或刪除）","Remember grounded facts from chats (can disable or delete)")}
     </label>
     <button className="souls-primary" disabled={!name.trim()||busy}>
      {t("儲存 Soul，開始聊天 ✦","Save Soul & start chatting ✦")}
     </button>
    </form>
   </div>
 );
}
