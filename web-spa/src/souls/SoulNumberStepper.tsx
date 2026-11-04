/** Tap-only numeric control: unlike range sliders, vertical page swipes cannot change the value.
 * Kept separate from the preview gesture mode so mobile browsing stays scroll-safe.
 */
export function SoulNumberStepper({
 label,value,min,max,step,display,onChange,en
}:{
 label:string;value:number;min:number;max:number;step:number;display:string;
 onChange:(value:number)=>void;en:boolean;
}){
 const adjust=(direction:-1|1)=>{
  const next=Math.max(min,Math.min(max,Number((value+direction*step).toFixed(4))));
  onChange(next);
 };
 return <div className="souls-number-stepper" role="group" aria-label={label}>
  <span className="souls-stepper-label">{label}</span>
  <div className="souls-stepper-buttons">
   <button type="button" aria-label={label+" "+(en?"decrease":"減少")}
    disabled={value<=min} onClick={()=>adjust(-1)}>−</button>
   <output aria-label={label+" "+(en?"current value":"目前數值")}>{display}</output>
   <button type="button" aria-label={label+" "+(en?"increase":"增加")}
    disabled={value>=max} onClick={()=>adjust(1)}>＋</button>
  </div>
 </div>;
}
