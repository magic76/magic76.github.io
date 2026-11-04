import {SoulNumberStepper} from "./SoulNumberStepper";
import {DEFAULT_FACE,safeFace,type SoulFace} from "./soulFace";
import {DEFAULT_TRANSFORM,safeTransform,type SoulTransform} from "./soulTransform";

/** Detailed placement controls stay closed until requested.
 * Adjustments use discrete buttons so a swipe to scroll never changes a value.
 * Direct gestures on the portrait are a separate, explicit edit mode.
 */
export function SoulTransformControls({
 mode,onModeChange,face,onFaceChange,transform,onTransformChange,en,
 gestureEnabled=false,onGestureEnabledChange=()=>{},faceVisible=true
}:{
 mode:"object"|"face";onModeChange:(next:"object"|"face")=>void;
 face:SoulFace;onFaceChange:(next:SoulFace)=>void;
 transform:SoulTransform;onTransformChange:(next:SoulTransform)=>void;en:boolean;
 gestureEnabled?:boolean;onGestureEnabledChange?:(enabled:boolean)=>void;faceVisible?:boolean;
}){
 const t=(zh:string,eng:string)=>en?eng:zh;
 const changeTransform=(values:Partial<SoulTransform>)=>onTransformChange(safeTransform({...transform,...values}));
 return <details className="souls-transform-controls"
  onToggle={e=>{if(!e.currentTarget.open)onGestureEnabledChange(false)}}>
  <summary>{t("微調大小、角度與位置（選用）","Fine-tune size, rotation & position (optional)")}</summary>
  <div className="souls-transform-panel">
   <div className="souls-transform-tabs" role="group" aria-label={t("編輯項目","Editing target")}>
    <button type="button" aria-pressed={mode==="object"} onClick={()=>{
     onModeChange("object");onGestureEnabledChange(false);
    }}>{t("調整照片","Adjust photo")}</button>
    <button type="button" aria-pressed={mode==="face"} disabled={!faceVisible} onClick={()=>{
     onModeChange("face");onGestureEnabledChange(false);
    }}>{t("調整眼睛","Adjust eyes")}</button>
   </div>
   <button className="souls-gesture-toggle" type="button" aria-pressed={gestureEnabled}
    onClick={()=>onGestureEnabledChange(!gestureEnabled)}>
    {gestureEnabled?t("✓ 完成拖曳，恢復頁面滑動","✓ Finish dragging, scroll page normally"):
     t("啟用照片上的拖曳手勢","Enable direct photo gestures")}
   </button>
   <p className="souls-muted">
    {gestureEnabled?(mode==="object"?
     t("編輯中：拖曳照片移動，雙指縮放或旋轉。完成後請關閉手勢模式。","Editing: drag the photo to move it, pinch to zoom or rotate. Finish to unlock page scrolling.") :
     t("編輯中：直接拖動眼睛的位置。完成後請關閉手勢模式。","Editing: drag the eyes into place. Finish to unlock page scrolling.")):
     t("一般上下滑動只會捲動頁面，不會移動角色。需要直接拖曳時才開啟手勢。","Swiping normally only scrolls the page. Enable gestures when you want to drag the character.")}
   </p>
   {mode==="object"?<div className="souls-transform-sliders">
    <SoulNumberStepper en={en} label={t("照片大小","Photo size")}
     value={transform.scale} min={.5} max={2.8} step={.05}
     display={Math.round(transform.scale*100)+"%"}
     onChange={scale=>changeTransform({scale})}/>
    <SoulNumberStepper en={en} label={t("旋轉","Rotation")}
     value={transform.rotation} min={-175} max={175} step={5}
     display={Math.round(transform.rotation)+"°"}
     onChange={rotation=>changeTransform({rotation})}/>
    <SoulNumberStepper en={en} label={t("左右位置","Horizontal position")}
     value={transform.x} min={-.65} max={.65} step={.05}
     display={Math.round(transform.x*100)+"%"}
     onChange={x=>changeTransform({x})}/>
    <SoulNumberStepper en={en} label={t("上下位置","Vertical position")}
     value={transform.y} min={-.65} max={.65} step={.05}
     display={Math.round(transform.y*100)+"%"}
     onChange={y=>changeTransform({y})}/>
    <button type="button" className="souls-transform-reset" onClick={()=>{
     onTransformChange({...DEFAULT_TRANSFORM});onGestureEnabledChange(false);
    }}>{t("還原照片位置與角度","Reset photo placement")}</button>
   </div>:<div className="souls-transform-sliders">
    <SoulNumberStepper en={en} label={t("眼睛大小","Eye size")}
     value={face.scale} min={.55} max={1.65} step={.05}
     display={Math.round(face.scale*100)+"%"}
     onChange={scale=>onFaceChange(safeFace({...face,scale}))}/>
    <button type="button" className="souls-transform-reset" onClick={()=>{
     onFaceChange({...DEFAULT_FACE});onGestureEnabledChange(false);
    }}>{t("還原眼睛位置","Reset eyes")}</button>
   </div>}
  </div>
 </details>;
}
