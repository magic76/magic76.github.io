import {type SoulSubjectType} from "./soulData";
export function SoulSubjectSelector({subjectType,onChange,en}:{
 subjectType:SoulSubjectType;onChange:(kind:SoulSubjectType)=>void;en:boolean
}){
 const t=(zh:string,english:string)=>en?english:zh;
 return (   <div className="souls-subject-toggle" role="group" aria-label={t("角色類型","Character type")}>
    <button type="button" aria-pressed={subjectType==="object"} onClick={()=>onChange("object")}>{t("物品","Object")}</button>
    <button type="button" aria-pressed={subjectType==="person"} onClick={()=>onChange("person")}>{t("人物","Person")}</button>
    <small>{t("人物預設保留原本五官、不加卡通臉；聊天角色為虛構設定。","People keep their natural face by default; the chat persona is fictional.")}</small>
   </div>);
}
