import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {learningSpeechRoute} from "./learningSpeechRoutes";
import type {HighQualityStatus} from "./learningSpeechHighQuality";
import "./learningSpeechOptIn.css";

type Copy={add:string;loading:string;remove:string};
const LABELS:Record<string,Copy>={
 "zh-TW":{add:"導入高品質語音",loading:"高品質語音讀取中…",remove:"移除高品質語音"},
 en:{add:"Import high-quality voice",loading:"Loading high-quality voice…",remove:"Remove high-quality voice"},
 ja:{add:"高音質音声を導入",loading:"高音質音声を読み込み中…",remove:"高音質音声を削除"},
 ko:{add:"고음질 음성 가져오기",loading:"고음질 음성 불러오는 중…",remove:"고음질 음성 삭제"},
 es:{add:"Importar voz de alta calidad",loading:"Cargando voz de alta calidad…",remove:"Eliminar voz de alta calidad"},
 fr:{add:"Importer une voix haute qualité",loading:"Chargement de la voix haute qualité…",remove:"Supprimer la voix haute qualité"},
 de:{add:"Hochwertige Stimme importieren",loading:"Hochwertige Stimme wird geladen…",remove:"Hochwertige Stimme entfernen"},
 "pt-BR":{add:"Importar voz de alta qualidade",loading:"Carregando voz de alta qualidade…",remove:"Remover voz de alta qualidade"},
 id:{add:"Impor suara berkualitas tinggi",loading:"Memuat suara berkualitas tinggi…",remove:"Hapus suara berkualitas tinggi"},
 vi:{add:"Nhập giọng nói chất lượng cao",loading:"Đang tải giọng nói chất lượng cao…",remove:"Xóa giọng nói chất lượng cao"},
 th:{add:"นำเข้าเสียงคุณภาพสูง",loading:"กำลังโหลดเสียงคุณภาพสูง…",remove:"ลบเสียงคุณภาพสูง"}
};
export function LearningSpeechOptIn({language}:{language:string}){
 const {i18n}=useTranslation();
 const [status,setStatus]=useState<HighQualityStatus|"checking">("checking");
 const supported=learningSpeechRoute(language).engine==="kokoro";
 const locale=i18n.resolvedLanguage||i18n.language;
 const copy=LABELS[locale]||LABELS[locale.split("-")[0]]||LABELS.en;
 useEffect(()=>{
  if(!supported){setStatus("idle");return}
  let mounted=true,unsubscribe=()=>{};
  void import("./learningSpeechHighQuality").then(mod=>{
   if(!mounted)return;
   const update=()=>{void mod.highQualityStatus(language).then(next=>{if(mounted)setStatus(next)}).catch(()=>{if(mounted)setStatus("idle")})};
   unsubscribe=mod.subscribeHighQuality(update);
   update();
  }).catch(()=>{if(mounted)setStatus("idle")});
  return()=>{mounted=false;unsubscribe()};
 },[language,supported]);
 const change=async()=>{
  setStatus("loading");
  try{
   const mod=await import("./learningSpeechHighQuality");
   if(status==="ready")await mod.removeHighQuality(language);
   else await mod.importHighQuality(language);
   setStatus(await mod.highQualityStatus(language));
  }catch(error){
   console.warn("[learning-speech] Optional high-quality voice action failed",error);
   setStatus("idle");
  }
 };
 if(!supported||status==="checking")return null;
 return <div className="crew-hq-voice-control">
  <button type="button" className="crew-hq-voice-button" disabled={status==="loading"} onClick={()=>void change()}>{status==="ready"?copy.remove:copy.add}</button>
  {status==="loading"&&<span className="crew-hq-voice-loading" role="status">{copy.loading}</span>}
 </div>;
}
