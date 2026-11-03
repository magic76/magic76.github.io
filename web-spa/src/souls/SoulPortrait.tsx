import {useRef,type PointerEvent,type RefObject} from "react";
import {safeFace,type SoulFace} from "./soulFace";
import {type SoulVisual} from "./soulVisual";

/** A static object cutout with a *separate* animated, adjustable face.
 * No camera stream, detector, tracker or image generation is involved. */
export function SoulPortrait({
 image,face,onFaceChange,editing=false,visual,caption=true,mouthRef,name
}:{
 image:string;face?:SoulFace;
 onFaceChange?:(next:SoulFace)=>void;editing?:boolean;
 visual?:SoulVisual;caption?:boolean;mouthRef?:RefObject<SVGEllipseElement|null>;name?:string
}){
 const stage=useRef<HTMLDivElement>(null),dragging=useRef(false);
 const f=safeFace(face),mood=visual?.mood||"calm";
 const talking=visual?.state==="speaking";
 function move(e:PointerEvent<HTMLDivElement>){
  const bounds=stage.current?.getBoundingClientRect();
  if(!editing||!onFaceChange||!bounds||!bounds.width||!bounds.height)return;
  onFaceChange(safeFace({
   ...f,x:(e.clientX-bounds.left)/bounds.width,
   y:(e.clientY-bounds.top)/bounds.height
  }));
 }
 function down(e:PointerEvent<HTMLDivElement>){
  if(!editing||!onFaceChange)return;
  dragging.current=true;e.currentTarget.setPointerCapture(e.pointerId);move(e);
 }
 function drag(e:PointerEvent<HTMLDivElement>){
  if(dragging.current)move(e);
 }
 function up(e:PointerEvent<HTMLDivElement>){
  if(!dragging.current)return;
  dragging.current=false;
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 }
 return <div className={"souls-portrait"+(editing?" souls-portrait-editing":"")}
   data-speaking={talking?"true":"false"} data-mood={mood} data-hearing={visual?.hearing?"true":"false"}>
  <div ref={stage} className="souls-portrait-stage" role={editing?"group":undefined}
   aria-label={editing?"點擊或拖曳調整五官位置":undefined}
   onPointerDown={down} onPointerMove={drag} onPointerUp={up} onPointerCancel={up}>
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
      <path d="M61 85 Q75 96 89 85" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none"
        className="souls-portrait-smile-back"/>
      <path d="M61 85 Q75 96 89 85" stroke="#292039" strokeWidth="4" strokeLinecap="round" fill="none"
        className="souls-portrait-smile"/>
      <ellipse ref={mouthRef} className="souls-portrait-speaking-mouth"
        cx="75" cy="87" rx="10" ry={mood==="surprised"?10:4} fill="#292039"/>
     </g>
     {mood==="thinking"&&<g fill="white"><circle cx="130" cy="14" r="6"/><circle cx="140" cy="4" r="3"/></g>}
    </svg>
   </div>
   {editing&&<div className="souls-portrait-guide" aria-hidden="true">✦</div>}
  </div>
  {name&&!editing&&<strong className="souls-portrait-label">{name}</strong>}
  {caption&&visual?.caption&&!editing&&<p className="souls-portrait-caption" aria-live="polite">{visual.caption.slice(-130)}</p>}
 </div>;
}
