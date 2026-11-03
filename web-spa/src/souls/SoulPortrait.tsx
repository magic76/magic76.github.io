import {useRef,type PointerEvent,type RefObject} from "react";
import {safeFace,type SoulFace} from "./soulFace";
import {applyGesture,safeTransform,stageToObjectPoint,type PointerPosition,type SoulTransform} from "./soulTransform";
import {type SoulVisual} from "./soulVisual";

/** Fixed photo + face compose into a single transformable object.
 * The outer sprite animates; the inner object keeps the user's saved transform.
 */
export function SoulPortrait({
 image,face,onFaceChange,editing=false,editTarget="face",transform,onTransformChange,
 visual,caption=true,mouthRef,name
}:{
 image:string;face?:SoulFace;onFaceChange?:(next:SoulFace)=>void;
 editing?:boolean;editTarget?:"face"|"object";
 transform?:SoulTransform;onTransformChange?:(next:SoulTransform)=>void;
 visual?:SoulVisual;caption?:boolean;mouthRef?:RefObject<SVGEllipseElement|null>;name?:string;
}){
 const stage=useRef<HTMLDivElement>(null);
 const pointers=useRef(new Map<number,PointerPosition>());
 const gesture=useRef<{start:PointerPosition[];initial:SoulTransform}|null>(null);
 const faceRef=useRef(safeFace(face));faceRef.current=safeFace(face);
 const transformRef=useRef(safeTransform(transform));transformRef.current=safeTransform(transform);
 const f=faceRef.current,p=transformRef.current;
 const mood=visual?.mood||"calm",talking=visual?.state==="speaking";
 function move(e:PointerEvent<HTMLDivElement>){
  const bounds=stage.current?.getBoundingClientRect();
  if(!editing||!onFaceChange||!bounds?.width||!bounds.height)return;
  const local=stageToObjectPoint(e.clientX-bounds.left,e.clientY-bounds.top,
   bounds.width,bounds.height,transformRef.current);
  onFaceChange(safeFace({...faceRef.current,...local}));
 }
 function rebase(){
  gesture.current={
   start:Array.from(pointers.current.values()).slice(0,2),
   initial:transformRef.current
  };
 }
 function down(e:PointerEvent<HTMLDivElement>){
  if(!editing)return;
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);
  pointers.current.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY});
  if(editTarget==="face"){
   if(pointers.current.size===1)move(e);
  }else if(onTransformChange)rebase();
 }
 function drag(e:PointerEvent<HTMLDivElement>){
  if(!editing||!pointers.current.has(e.pointerId))return;
  e.preventDefault();
  pointers.current.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY});
  if(editTarget==="face"){
   if(pointers.current.size===1)move(e);
   return;
  }
  if(!onTransformChange||!gesture.current)return;
  const rect=stage.current?.getBoundingClientRect();
  if(!rect?.width||!rect.height)return;
  const start=gesture.current.start;
  const current=start.map(point=>pointers.current.get(point.id)).filter(
   (item):item is PointerPosition=>Boolean(item));
  if(current.length!==start.length)return;
  const result=applyGesture(gesture.current.initial,start,current,rect.width,rect.height);
  transformRef.current=result;onTransformChange(result);
 }
 function up(e:PointerEvent<HTMLDivElement>){
  if(!pointers.current.has(e.pointerId))return;
  pointers.current.delete(e.pointerId);
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  if(editTarget==="object"&&pointers.current.size)rebase();else gesture.current=null;
 }
 return <div className={"souls-portrait"+(editing?" souls-portrait-editing":"")}
   data-animated={!editing?"true":"false"}
   data-edit-target={editing?editTarget:"none"}
   data-speaking={talking?"true":"false"} data-mood={mood}
   data-hearing={visual?.hearing?"true":"false"}>
  <div ref={stage} className="souls-portrait-stage"
   role={editing?"group":undefined}
   aria-label={editing?(editTarget==="object"?"拖曳物品，雙指縮放與旋轉":"點擊或拖曳調整眼睛位置"):undefined}
   onPointerDown={down} onPointerMove={drag} onPointerUp={up} onPointerCancel={up}>
   <div className="souls-portrait-sprite">
    <div className="souls-portrait-object" style={{
     transform:`translate(${p.x*100}%,${p.y*100}%) rotate(${p.rotation}deg) scale(${p.scale})`
    }}>
     <img draggable={false} src={image} alt={name||"Soul object portrait"} className="souls-portrait-photo"/>
     <div className="souls-portrait-face"
      style={{left:(f.x*100)+"%",top:(f.y*100)+"%",width:(37*f.scale)+"%"}}>
      <svg viewBox="0 0 150 105" aria-hidden="true">
       <g className="souls-portrait-eye-set">
        {mood==="happy"?<>
         <path d="M18 53 Q40 25 62 53 M88 53 Q110 25 132 53" stroke="white" strokeWidth="15" strokeLinecap="round" fill="none"/>
         <path d="M18 53 Q40 25 62 53 M88 53 Q110 25 132 53" stroke="#292039" strokeWidth="9" strokeLinecap="round" fill="none"/>
        </>:<>
         <rect x="18" y="18" width="44" height="55" rx="21" fill="#fff"/>
         <rect x="88" y="18" width="44" height="55" rx="21" fill="#fff"/>
         <rect x="23" y="24" width="34" height="44" rx="17" fill="#292039"/>
         <rect x="93" y="24" width="34" height="44" rx="17" fill="#292039"/>
         <ellipse cx="37" cy="35" rx="7" ry="10" fill="#fff"/>
         <ellipse cx="107" cy="35" rx="7" ry="10" fill="#fff"/>
        </>}
       </g>
       <ellipse cx="13" cy="72" rx="12" ry="7" fill="#ff8baa" fillOpacity=".76"/>
       <ellipse cx="137" cy="72" rx="12" ry="7" fill="#ff8baa" fillOpacity=".76"/>
       <g className="souls-portrait-mouth">
        <path d="M61 85 Q75 96 89 85" stroke="white" strokeWidth="9" strokeLinecap="round"
         fill="none" className="souls-portrait-smile-back"/>
        <path d="M61 85 Q75 96 89 85" stroke="#292039" strokeWidth="4" strokeLinecap="round"
         fill="none" className="souls-portrait-smile"/>
        <ellipse ref={mouthRef} className="souls-portrait-speaking-mouth"
         cx="75" cy="87" rx="10" ry={mood==="surprised"?10:4} fill="#292039"/>
       </g>
       {mood==="thinking"&&<g fill="white"><circle cx="130" cy="14" r="6"/><circle cx="140" cy="4" r="3"/></g>}
      </svg>
     </div>
    </div>
   </div>
   {editing&&<div className="souls-portrait-guide" aria-hidden="true">✦</div>}
  </div>
  {name&&!editing&&<strong className="souls-portrait-label">{name}</strong>}
  {caption&&visual?.caption&&!editing&&<p className="souls-portrait-caption" aria-live="polite">
   {visual.caption.slice(-130)}</p>}
 </div>;
}
