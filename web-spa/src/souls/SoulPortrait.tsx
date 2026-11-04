import {useRef,type PointerEvent,type RefObject} from "react";
import {safeFace,type SoulFace} from "./soulFace";
import {applyGesture,safeTransform,stageToObjectPoint,type PointerPosition,type SoulTransform} from "./soulTransform";
import {type SoulVisual} from "./soulVisual";
import {type Soul} from "./soulData";

/** Fixed photo + face compose into a single transformable object.
 * The outer sprite animates; the inner object keeps the user's saved transform.
 */
export function SoulPortrait({
 image,face,onFaceChange,editing=false,editTarget="face",transform,onTransformChange,
 visual,caption=true,mouthRef,name,personality="gentle",faceVisible=true,freezePreview=false
}:{
 image:string;face?:SoulFace;onFaceChange?:(next:SoulFace)=>void;
 editing?:boolean;editTarget?:"face"|"object";
 transform?:SoulTransform;onTransformChange?:(next:SoulTransform)=>void;
 visual?:SoulVisual;caption?:boolean;mouthRef?:RefObject<SVGEllipseElement|null>;name?:string;
 personality?:Soul["personality"];faceVisible?:boolean;freezePreview?:boolean;
}){
 const stage=useRef<HTMLDivElement>(null);
 const pointers=useRef(new Map<number,PointerPosition>());
 const gesture=useRef<{start:PointerPosition[];initial:SoulTransform}|null>(null);
 const faceRef=useRef(safeFace(face));faceRef.current=safeFace(face);
 const transformRef=useRef(safeTransform(transform));transformRef.current=safeTransform(transform);
 const f=faceRef.current,p=transformRef.current;
 const mood=visual?.mood||"calm",talking=visual?.state==="speaking";
 const isWitty=personality==="witty",isCurious=personality==="curious";
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
   data-animated={!editing&&!freezePreview?"true":"false"}
   data-preview={freezePreview?"true":"false"}
   data-personality={personality} data-face-visible={faceVisible?"true":"false"}
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
     {faceVisible&&<div className="souls-portrait-face"
      style={{left:(f.x*100)+"%",top:(f.y*100)+"%",width:(37*f.scale)+"%"}}>
      <svg viewBox="0 0 150 105" aria-hidden="true">
       <g className="souls-portrait-eye-set">
        {isWitty?<g className="souls-witty-eyes">
         <g className="souls-witty-left-eye">
          {mood==="happy"?<>
           <path d="M17 49 Q37 28 62 42" stroke="#fff" strokeWidth="16" strokeLinecap="round" fill="none"/>
           <path d="M17 49 Q37 28 62 42" stroke="#292039" strokeWidth="9" strokeLinecap="round" fill="none"/>
          </>:mood==="surprised"?<>
           <rect x="19" y="26" width="40" height="45" rx="19" fill="#fff"/>
           <ellipse cx="42" cy="48" rx="11" ry="17" fill="#292039"/>
           <circle cx="38" cy="39" r="3.5" fill="#fff"/>
          </>:<>
           <path d="M15 46 Q18 31 34 31 L53 34 Q62 37 62 48 Q44 57 21 53 Z" fill="#fff"/>
           <ellipse cx={mood==="thinking"?46:41} cy="46" rx="10" ry={mood==="thinking"?7:11} fill="#292039"/>
           <circle cx={mood==="thinking"?45:38} cy="41" r="3" fill="#fff"/>
           <path d={mood==="thinking"?"M16 45 Q39 43 62 44":"M16 42 Q37 32 62 43"}
            stroke="#292039" strokeWidth={mood==="thinking"?9:7} strokeLinecap="round" fill="none"/>
          </>}
         </g>
         <g className="souls-witty-right-eye">
          {mood==="happy"?<>
           <path d="M86 47 Q111 25 135 43" stroke="#fff" strokeWidth="16" strokeLinecap="round" fill="none"/>
           <path d="M86 47 Q111 25 135 43" stroke="#292039" strokeWidth="9" strokeLinecap="round" fill="none"/>
          </>:mood==="surprised"?<>
           <rect x="89" y="17" width="43" height="53" rx="19" fill="#fff"/>
           <ellipse cx="108" cy="42" rx="11" ry="17" fill="#292039"/>
           <circle cx="105" cy="33" r="3.5" fill="#fff"/>
          </>:<>
           <path d="M85 47 Q89 28 105 30 L130 27 Q140 33 135 50 Q115 58 91 54 Z" fill="#fff"/>
           <ellipse cx={mood==="thinking"?119:113} cy="45" rx="10" ry={mood==="thinking"?7:12} fill="#292039"/>
           <circle cx={mood==="thinking"?117:110} cy="39" r="3" fill="#fff"/>
           <path d={mood==="thinking"?"M86 43 Q110 39 135 41":"M86 42 Q108 28 135 38"}
            stroke="#292039" strokeWidth={mood==="thinking"?9:7} strokeLinecap="round" fill="none"/>
          </>}
         </g>
         <g className="souls-witty-brows" fill="none" stroke="#292039"
          strokeWidth="5" strokeLinecap="round">
          <path d={mood==="surprised"?"M23 13 Q39 4 55 13":mood==="thinking"?"M22 20 Q39 19 54 21":"M22 21 Q39 13 56 19"}/>
          <path d={mood==="surprised"?"M93 8 Q112 -3 129 7":mood==="thinking"?"M92 17 Q111 21 128 12":"M94 17 Q113 6 132 14"}/>
         </g>
        </g>:isCurious?<g className="souls-curious-eyes">
         <rect x="17" y="13" width="46" height="63" rx="22" fill="#fff"/>
         <rect x="85" y="13" width="48" height="63" rx="23" fill="#fff"/>
         <ellipse cx="43" cy="48" rx={mood==="surprised"?10:16} ry={mood==="surprised"?16:22} fill="#292039"/>
         <ellipse cx="111" cy="48" rx={mood==="surprised"?10:16} ry={mood==="surprised"?16:22} fill="#292039"/>
         <ellipse cx="39" cy="38" rx="6" ry="8" fill="#fff"/>
         <ellipse cx="107" cy="38" rx="6" ry="8" fill="#fff"/>
         <path d="M23 10 Q39 1 55 10 M94 9 Q112 -1 128 9" stroke="#292039"
          strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        </g>:mood==="happy"?<>
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
       {isWitty?<>
        <ellipse cx="12" cy="73" rx="9" ry="4" fill="#ff8baa" fillOpacity=".34"/>
        <ellipse cx="137" cy="73" rx="9" ry="4" fill="#ff8baa" fillOpacity=".34"/>
       </>:<>
        <ellipse cx="13" cy="72" rx="12" ry="7" fill="#ff8baa" fillOpacity=".76"/>
        <ellipse cx="137" cy="72" rx="12" ry="7" fill="#ff8baa" fillOpacity=".76"/>
       </>}
       <g className="souls-portrait-mouth">
        {isWitty?<>
         <path d={mood==="happy"?"M56 81 Q75 101 98 78":"M56 84 Q78 92 96 78"}
          stroke="white" strokeWidth="9" strokeLinecap="round" fill="none"
          className="souls-portrait-smile-back"/>
         <path d={mood==="happy"?"M56 81 Q75 101 98 78":"M56 84 Q78 92 96 78"}
          stroke="#292039" strokeWidth="4.5" strokeLinecap="round" fill="none"
          className="souls-portrait-smile"/>
        </>:<>
         <path d="M61 85 Q75 96 89 85" stroke="white" strokeWidth="9" strokeLinecap="round"
          fill="none" className="souls-portrait-smile-back"/>
         <path d="M61 85 Q75 96 89 85" stroke="#292039" strokeWidth="4" strokeLinecap="round"
          fill="none" className="souls-portrait-smile"/>
        </>}
        <ellipse ref={mouthRef} className="souls-portrait-speaking-mouth"
         cx={isWitty?80:75} cy={isWitty?84:87} rx={isWitty?8:10}
         ry={mood==="surprised"?10:4} fill="#292039"/>
       </g>
       {mood==="thinking"&&!isWitty&&<g fill="white">
        <circle cx="130" cy="14" r="6"/><circle cx="140" cy="4" r="3"/>
       </g>}
      </svg>
     </div>}
    </div>
   </div>
   {editing&&<div className="souls-portrait-guide" aria-hidden="true">✦</div>}
  </div>
  {name&&!editing&&<strong className="souls-portrait-label">{name}</strong>}
  {caption&&visual?.caption&&!editing&&<p className="souls-portrait-caption" aria-live="polite">
   {visual.caption.slice(-130)}</p>}
 </div>;
}
