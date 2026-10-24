import {isMandarinTarget,PINYIN_AID_OPTIONS,type PinyinAidMode} from "./pinyinAid";

type Props={
 targetLanguage:string;
 value:PinyinAidMode;
 onChange:(mode:PinyinAidMode)=>void;
 english?:boolean;
 showWhenUnavailable?:boolean;
};

/** All teacher settings surfaces share the same persisted Pinyin preference. */
export function TeacherPinyinSetting({targetLanguage,value,onChange,english=false,showWhenUnavailable=false}:Props){
 const available=isMandarinTarget(targetLanguage);
 if(!available&&!showWhenUnavailable)return null;
 return <label className="crew-pinyin-setting">
  <span className="label">{english?"Chinese Pinyin aid":"中文拼音輔助"}</span>
  <select className="field" aria-label={english?"Chinese Pinyin aid":"中文拼音輔助"} value={value} disabled={!available}
   onChange={event=>onChange(event.target.value as PinyinAidMode)}>
   {PINYIN_AID_OPTIONS.map(option=><option key={option.value} value={option.value}>{english?option.labelEn:option.label}</option>)}
  </select>
  {showWhenUnavailable&&<small className="crew-pinyin-setting-hint">
   {available
    ?english?"Show tone-marked Pinyin under your teacher’s Mandarin text; changes apply immediately.":"老師的中文文字下方顯示聲調拼音，變更立即生效。"
    :english?"Select Mandarin Chinese as your learning language to enable this.":"將「學習目標語言」切換成「中文」，即可啟用拼音輔助。"}
  </small>}
 </label>;
}
