import {useLayoutEffect,useRef,type KeyboardEvent} from "react";

const STEP=52;
type Props={min:number;max:number;value:number;disabled:boolean;onChange:(value:number)=>void;zh:boolean};
/** Native touch momentum + scroll snap. The center number is authoritative only on confirmation. */
export function NumberWheel({min,max,value,disabled,onChange,zh}:Props){
 const viewport=useRef<HTMLDivElement>(null);
 const fromScroll=useRef(false);
 const chosen=Math.max(min,Math.min(max,value));
 const numbers=Array.from({length:Math.max(0,max-min+1)},(_,index)=>min+index);
 const scrollToValue=(next:number,behavior:ScrollBehavior="smooth")=>{
  viewport.current?.scrollTo({top:(next-min)*STEP,behavior});
 };
 // Bounds change after each guess; never leave the selected number outside the valid range.
 useLayoutEffect(()=>{
  if(!fromScroll.current&&viewport.current)viewport.current.scrollTop=(chosen-min)*STEP;
  fromScroll.current=false;
 },[min,max,chosen]);
 const onScroll=()=>{
  const node=viewport.current;if(!node||disabled)return;
  const number=Math.max(min,Math.min(max,min+Math.round(node.scrollTop/STEP)));
  if(number!==chosen){fromScroll.current=true;onChange(number)}
 };
 const onKeyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
  if(disabled)return;
  let next=chosen;
  if(event.key==="ArrowDown"||event.key==="ArrowRight")next++;
  else if(event.key==="ArrowUp"||event.key==="ArrowLeft")next--;
  else if(event.key==="PageDown")next+=5;
  else if(event.key==="PageUp")next-=5;
  else if(event.key==="Home")next=min;
  else if(event.key==="End")next=max;
  else return;
  event.preventDefault();next=Math.max(min,Math.min(max,next));
  onChange(next);scrollToValue(next);
 };
 return <div className="crew-number-wheel">
  <div className="crew-number-wheel-label">{zh?"上下滑動選數字":"Swipe to choose a number"}</div>
  <div className="crew-number-wheel-frame">
   <div className="crew-number-wheel-bounds" role="status" aria-live="polite">
    <span>{zh?"目前可猜範圍":"Allowed range"}</span>
    <strong>{min} — {max}</strong>
   </div>
   <div className="crew-number-wheel-focus" aria-hidden="true"/>
   <div className="crew-number-wheel-scroll" role="listbox" aria-label={zh?"選擇猜測的數字":"Choose a number"} aria-disabled={disabled}
    tabIndex={disabled?-1:0} ref={viewport} onScroll={onScroll} onKeyDown={onKeyDown}>
    {numbers.map(number=><button key={number} type="button" role="option" tabIndex={-1} aria-selected={number===chosen}
      disabled={disabled} className={"crew-number-wheel-option"+(number===chosen?" is-selected":"")}
      onClick={()=>{onChange(number);scrollToValue(number)}}>{number}</button>)}
   </div>
  </div>
  <div className="crew-number-wheel-selected" role="status" aria-live="off">{zh?"目前選擇":"Selected"} <strong>{chosen}</strong></div>
 </div>;
}
