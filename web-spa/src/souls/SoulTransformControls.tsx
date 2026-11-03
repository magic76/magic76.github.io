import {DEFAULT_FACE,safeFace,type SoulFace} from "./soulFace";
import {DEFAULT_TRANSFORM,safeTransform,type SoulTransform} from "./soulTransform";

export function SoulTransformControls({
 mode,onModeChange,face,onFaceChange,transform,onTransformChange,en
}:{
 mode:"object"|"face";onModeChange:(next:"object"|"face")=>void;
 face:SoulFace;onFaceChange:(next:SoulFace)=>void;
 transform:SoulTransform;onTransformChange:(next:SoulTransform)=>void;en:boolean;
}){
 const t=(zh:string,eng:string)=>en?eng:zh;
 return <div className="souls-transform-controls">
  <div className="souls-transform-tabs" role="group" aria-label={t("編輯項目","Editing target")}>
   <button type="button" aria-pressed={mode==="object"} onClick={()=>onModeChange("object")}>
    {t("調整物品","Move object")}
   </button>
   <button type="button" aria-pressed={mode==="face"} onClick={()=>onModeChange("face")}>
    {t("調整眼睛","Move eyes")}
   </button>
  </div>
  <p className="souls-muted">{mode==="object"?
   t("單指拖曳物品，雙指縮放與旋轉；眼睛會跟著移動。","Drag the object; pinch to zoom and rotate. The eyes follow it.") :
   t("用手指把眼睛放在物品上。","Drag the eyes onto the object.")}</p>
  {mode==="object"?<div className="souls-transform-sliders">
   <label>{t("物品大小","Object size")} <output>{Math.round(transform.scale*100)}%</output>
    <input type="range" min=".5" max="2.8" step=".05" value={transform.scale}
     onChange={e=>onTransformChange(safeTransform({...transform,scale:Number(e.target.value)}))}/>
   </label>
   <label>{t("旋轉","Rotation")} <output>{Math.round(transform.rotation)}°</output>
    <input type="range" min="-180" max="180" step="1" value={transform.rotation}
     onChange={e=>onTransformChange(safeTransform({...transform,rotation:Number(e.target.value)}))}/>
   </label>
   <label>{t("左右位置","Horizontal position")}
    <input type="range" min="-.65" max=".65" step=".01" value={transform.x}
     onChange={e=>onTransformChange(safeTransform({...transform,x:Number(e.target.value)}))}/>
   </label>
   <label>{t("上下位置","Vertical position")}
    <input type="range" min="-.65" max=".65" step=".01" value={transform.y}
     onChange={e=>onTransformChange(safeTransform({...transform,y:Number(e.target.value)}))}/>
   </label>
   <button type="button" onClick={()=>onTransformChange({...DEFAULT_TRANSFORM})}>
    {t("重設物品位置與角度","Reset object")}
   </button>
  </div>:<div className="souls-transform-sliders">
   <label>{t("眼睛大小","Eye size")} <output>{Math.round(face.scale*100)}%</output>
    <input type="range" min=".55" max="1.65" step=".05" value={face.scale}
     onChange={e=>onFaceChange(safeFace({...face,scale:Number(e.target.value)}))}/>
   </label>
   <button type="button" onClick={()=>onFaceChange({...DEFAULT_FACE})}>
    {t("重設眼睛位置","Reset eyes")}
   </button>
  </div>}
 </div>;
}
