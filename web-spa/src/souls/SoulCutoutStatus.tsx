import {type CutoutProgress} from "./soulCutout";

/** A small status for the optional local background removal workflow. */
export function SoulCutoutStatus({cutting,phase,hasCutout,useCutout,en}:{
 cutting:boolean;phase:CutoutProgress;hasCutout:boolean;useCutout:boolean;en:boolean
}){
 const t=(zh:string,english:string)=>en?english:zh;
 return <p className="souls-muted">{cutting?(
  phase==="loading"?t("正在下載或初始化去背模型，首次使用可能較慢。","Preparing cutout model; first use may take longer."):
  phase==="segmenting"?t("正在執行物品分割，畫面可能暫時停住。","Segmenting subject; the screen may pause briefly."):
  t("正在製作去背圖片…","Creating transparent photo…")
 ):hasCutout&&useCutout?t("透明背景已完成。","Transparent background ready."):
  t("目前使用原始照片，可以直接存成 Soul。","Original photo is ready to save as a Soul.")}</p>;
}
