import {type Soul,type SoulSpeechStyle,soulFaceVisible,soulSpeechStyle} from "./soulData";

export function SoulDisplayPreferences({
 soul,en,onFaceChange,onSpeechStyleChange
}:{
 soul:Soul;en:boolean;onFaceChange:(visible:boolean)=>void;
 onSpeechStyleChange:(style:SoulSpeechStyle)=>void
}){
 const t=(zh:string,english:string)=>en?english:zh;
 return (     <div className="souls-display-preferences">
      <label className="souls-checkbox"><input type="checkbox" checked={soulFaceVisible(soul)}
       onChange={e=>onFaceChange(e.target.checked)}/>
       {t("顯示 Q 版靈魂臉","Show cartoon Soul face")}
      </label>
      <fieldset><legend>{t("對話文字顯示方式","Speech text position")}</legend>
       <div className="souls-pills">
        {(["bubble","subtitle"] as SoulSpeechStyle[]).map(style=><button type="button"
         key={style} aria-pressed={soulSpeechStyle(soul)===style}
         onClick={()=>onSpeechStyleChange(style)}>
         {style==="bubble"?t("角色下方氣泡","Bubble under character"):t("底部字幕","Subtitle under character")}
        </button>)}
       </div>
      </fieldset>
     </div>
 );
}
