import {useEffect,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {accentLabel,accentOptions,normalizedAccent,type RegionalRole} from "../teacher/teacherAccent";
import {getTeacherProfile} from "../teacher/teacherProfiles";
import {previewTeacherVoice,type PreviewStatus} from "../teacher/teacherVoicePreview";
import {geminiKey} from "../lib/runtime";

// All published UI locales share these short labels, rather than exposing model instructions.
const copy:Record<string,[string,string,string,string,string]> = {
 "zh-TW":["地區語言風格","即時試聽口音","使用目前老師的聲線作為比較範例。口音由 AI 生成，實際發音可能略有差異。","即時試聽需要 Gemini Key。","試聽失敗，請重試。"],
 en:["Regional language style","Hear the accent live","Uses the current teacher’s voice for comparison. AI-generated accents may vary.","Live preview requires a Gemini key.","Preview failed. Try again."],
 ja:["地域の言語スタイル","発音をリアルタイムで試聴","比較には現在の講師の声を使用します。AI の発音には差が出る場合があります。","試聴には Gemini キーが必要です。","試聴に失敗しました。再試行してください。"],
 ko:["지역 언어 스타일","실시간 억양 듣기","비교에는 현재 선생님의 음성을 사용합니다. AI 발음은 달라질 수 있습니다.","미리 듣기에는 Gemini 키가 필요합니다.","다시 시도해 주세요."],
 vi:["Phong cách ngôn ngữ vùng miền","Nghe thử giọng trực tiếp","Dùng giọng của giáo viên hiện tại để so sánh. Phát âm do AI tạo có thể thay đổi.","Nghe thử cần khóa Gemini.","Không thể phát mẫu. Hãy thử lại."],
 es:["Variante regional","Escuchar el acento en directo","Usa la voz del profesor actual para comparar. La pronunciación de IA puede variar.","La prueba requiere una clave Gemini.","No se pudo reproducir. Inténtalo de nuevo."],
 fr:["Variante régionale","Écouter l’accent en direct","Utilise la voix du professeur actuel pour comparer. La prononciation IA peut varier.","Une clé Gemini est nécessaire.","Échec de la lecture. Réessayez."],
 de:["Regionale Sprachvariante","Akzent live anhören","Zum Vergleich wird die Stimme der aktuellen Lehrkraft genutzt. KI-Aussprache kann variieren.","Die Hörprobe benötigt einen Gemini-Schlüssel.","Hörprobe fehlgeschlagen. Erneut versuchen."],
 pt:["Variante regional","Ouvir o sotaque ao vivo","Usa a voz do professor atual para comparar. A pronúncia da IA pode variar.","A prévia exige uma chave Gemini.","Falha na reprodução. Tente novamente."],
 id:["Ragam bahasa daerah","Dengarkan aksen langsung","Gunakan suara guru saat ini untuk membandingkan. Pelafalan AI dapat bervariasi.","Pratinjau memerlukan kunci Gemini.","Gagal memutar. Coba lagi."],
 th:["รูปแบบภาษาตามภูมิภาค","ฟังสำเนียงแบบสด","ใช้เสียงครูปัจจุบันเพื่อเปรียบเทียบ การออกเสียงของ AI อาจแตกต่างกัน","ต้องใช้คีย์ Gemini เพื่อทดลองฟัง","เล่นเสียงไม่สำเร็จ โปรดลองอีกครั้ง"]
};
export function RegionalStyleSettings({role,beforePreview,otherPreviewActive=false}:{role:RegionalRole;beforePreview?:()=>void;otherPreviewActive?:boolean}){
 const {t,i18n}=useTranslation(["teacher","settings"]),locale=i18n.resolvedLanguage||i18n.language;
 const [title,listen,hint,keyHint,errorHint]=copy[locale]||copy[locale.split("-")[0]]||copy.en;
 const s=useTeacherStore(),teacher=role==="teacher";
 const region=normalizedAccent(s.targetLanguage,teacher?s.languageStyle:s.friendLanguageStyle);
 const strength=teacher?s.accentStrength:s.friendAccentStrength,custom=teacher?s.customAccent:s.friendCustomAccent;
 const setRegion=teacher?s.setLanguageStyle:s.setFriendLanguageStyle,setStrength=teacher?s.setAccentStrength:s.setFriendAccentStrength,setCustom=teacher?s.setCustomAccent:s.setFriendCustomAccent;
 const pace=teacher?s.speakingPace:s.friendSpeakingPace;
 const [status,setStatus]=useState<PreviewStatus|null>(null),stopRef=useRef<null|(()=>void)>(null);
 const busy=status?.state==="connecting"||status?.state==="playing",hasKey=Boolean(geminiKey());
 function stop(){stopRef.current?.();stopRef.current=null;setStatus(null)}
 useEffect(()=>{setStatus(null);return()=>{stopRef.current?.();stopRef.current=null}},[s.targetLanguage,s.teacherProfile,s.voice,region,strength,custom,pace]);
 useEffect(()=>{if(otherPreviewActive)stop()},[otherPreviewActive]);
 function play(){
  if(busy){stop();return}
  if(!hasKey)return;
  beforePreview?.();stop();
  stopRef.current=previewTeacherVoice(getTeacherProfile(s.teacherProfile),s.targetLanguage,setStatus,{voice:s.voice,languageStyle:region,accentStrength:strength,customAccent:custom,speakingPace:pace,regionalSample:true});
 }
 return <div className="crew-role-setting regional-style-settings">
  <label>{title}<select className="field" value={region} onChange={e=>setRegion(e.target.value as typeof region)}>{accentOptions(s.targetLanguage).map(a=><option key={a.value} value={a.value}>{accentLabel(s.targetLanguage,a.value,locale,t("settings:group.automatic"),t("tutor.customAccent"))}</option>)}</select></label>
  <button type="button" className="btn secondary" style={{minHeight:44}} disabled={!hasKey||(region==="custom"&&!custom.trim())} onClick={play}>{busy?t("tutor.stop"):listen}</button>
  <small className="meta">{hint}{!hasKey?" "+keyHint:""}</small>
  {status?.state==="error"&&<small role="alert">{errorHint}</small>}
  {region!=="auto"&&<details className="crew-role-advanced" open={region==="custom"?true:undefined}><summary>{t("tutor.advancedAccent")}</summary>
   {region==="custom"&&<label>{t("tutor.customAccent")}<input className="field" value={custom} maxLength={180} onChange={e=>setCustom(e.target.value)} placeholder={t("tutor.customPlaceholder")}/></label>}
   <label>{t("tutor.accentStrength")}<select className="field" value={strength} onChange={e=>setStrength(e.target.value as typeof strength)}>{(["subtle","natural","noticeable"] as const).map(value=><option key={value} value={value}>{t("tutor.strength."+value)}</option>)}</select></label>
  </details>}
 </div>;
}
