import {useEffect,useRef,useState,type PointerEvent} from "react";
import {paintMaskStroke,type MaskBrushMode} from "./soulMaskBrush";
import {SoulNumberStepper} from "./SoulNumberStepper";

const SIZE=640,MAX_UNDO=8;
function image(src:string):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
  const element=new Image();
  element.onload=()=>resolve(element);
  element.onerror=()=>reject(new Error("Image unavailable"));
  element.src=src;
 });
}
/** Repairs a cutout with local add/erase strokes. Original photo is never mutated.
 * The edited transparent PNG is handed to the parent only after Apply.
 */
export function SoulMaskEditor({
 original,initialCutout,onApply,onCancel,en
}:{
 original:string;initialCutout?:string;onApply:(dataUrl:string)=>void;
 onCancel:()=>void;en:boolean
}){
 const t=(zh:string,english:string)=>en?english:zh;
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const originalRef=useRef<Uint8ClampedArray|null>(null);
 const pixelsRef=useRef<ImageData|null>(null);
 const initialRef=useRef<Uint8ClampedArray|null>(null);
 const historyRef=useRef<Uint8ClampedArray[]>([]),futureRef=useRef<Uint8ClampedArray[]>([]);
 const lastRef=useRef<{x:number;y:number}|null>(null),pointerRef=useRef<number|null>(null);
 const [mode,setMode]=useState<MaskBrushMode>("restore");
 const [radius,setRadius]=useState(22),[ready,setReady]=useState(false);
 const [revision,setRevision]=useState(0),[error,setError]=useState("");
 function render(){
  const ctx=canvasRef.current?.getContext("2d");
  if(ctx&&pixelsRef.current)ctx.putImageData(pixelsRef.current,0,0);
  setRevision(old=>old+1);
 }
 useEffect(()=>{
  let active=true;setReady(false);setError("");
  (async()=>{
   try{
    const [source,mask]=await Promise.all([
     image(original),initialCutout?image(initialCutout):Promise.resolve(null)
    ]);
    if(!active)return;
    const off=document.createElement("canvas");off.width=off.height=SIZE;
    const ctx=off.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw new Error("Canvas unavailable");
    ctx.drawImage(source,0,0,SIZE,SIZE);
    const sourceData=ctx.getImageData(0,0,SIZE,SIZE);
    ctx.clearRect(0,0,SIZE,SIZE);
    if(mask)ctx.drawImage(mask,0,0,SIZE,SIZE);
    else ctx.drawImage(source,0,0,SIZE,SIZE);
    const working=ctx.getImageData(0,0,SIZE,SIZE);
    if(!active)return;
    originalRef.current=sourceData.data;
    pixelsRef.current=working;
    initialRef.current=new Uint8ClampedArray(working.data);
    historyRef.current=[];futureRef.current=[];
    canvasRef.current?.getContext("2d")?.putImageData(working,0,0);
    setReady(true);setRevision(0);
   }catch(cause){if(active)setError(cause instanceof Error?cause.message:String(cause))}
  })();
  return ()=>{active=false;pointerRef.current=null;lastRef.current=null};
 },[original,initialCutout]);
 function locate(e:PointerEvent<HTMLCanvasElement>){
  const rect=e.currentTarget.getBoundingClientRect();
  return {x:(e.clientX-rect.left)*SIZE/Math.max(1,rect.width),
   y:(e.clientY-rect.top)*SIZE/Math.max(1,rect.height)};
 }
 function paint(a:{x:number;y:number},b:{x:number;y:number}){
  const working=pixelsRef.current,source=originalRef.current;
  if(!working||!source)return;
  paintMaskStroke(working.data,source,SIZE,SIZE,a,b,radius,mode);
  render();
 }
 function down(e:PointerEvent<HTMLCanvasElement>){
  if(!ready||pointerRef.current!==null)return;
  e.preventDefault();
  const working=pixelsRef.current;
  if(!working)return;
  historyRef.current.push(new Uint8ClampedArray(working.data));
  if(historyRef.current.length>MAX_UNDO)historyRef.current.shift();
  futureRef.current=[];
  const point=locate(e);
  pointerRef.current=e.pointerId;lastRef.current=point;
  e.currentTarget.setPointerCapture(e.pointerId);paint(point,point);
 }
 function move(e:PointerEvent<HTMLCanvasElement>){
  if(pointerRef.current!==e.pointerId||!lastRef.current)return;
  e.preventDefault();
  const point=locate(e);
  paint(lastRef.current,point);lastRef.current=point;
 }
 function up(e:PointerEvent<HTMLCanvasElement>){
  if(pointerRef.current!==e.pointerId)return;
  pointerRef.current=null;lastRef.current=null;
  if(e.currentTarget.hasPointerCapture(e.pointerId))
   e.currentTarget.releasePointerCapture(e.pointerId);
 }
 function setPixels(saved:Uint8ClampedArray){
  const working=pixelsRef.current;
  if(!working)return;
  working.data.set(saved);render();
 }
 function undo(){
  const saved=historyRef.current.pop(),working=pixelsRef.current;
  if(!saved||!working)return;
  futureRef.current.push(new Uint8ClampedArray(working.data));setPixels(saved);
 }
 function redo(){
  const saved=futureRef.current.pop(),working=pixelsRef.current;
  if(!saved||!working)return;
  historyRef.current.push(new Uint8ClampedArray(working.data));setPixels(saved);
 }
 function reset(){
  const saved=initialRef.current,working=pixelsRef.current;
  if(!saved||!working)return;
  historyRef.current.push(new Uint8ClampedArray(working.data));
  if(historyRef.current.length>MAX_UNDO)historyRef.current.shift();
  futureRef.current=[];setPixels(saved);
 }
 function apply(){
  if(!ready||!pixelsRef.current)return;
  const canvas=canvasRef.current;
  if(canvas)onApply(canvas.toDataURL("image/png"));
 }
 return <section className="souls-mask-editor" aria-label={t("手動修補去背","Manual mask repair")}>
  <h3>{t("修補去背輪廓","Repair cutout edges")}</h3>
  <p className="souls-muted">{t("補回被刪掉的手、頭髮或物品；擦掉不需要的背景。只在手機本機處理。","Paint missing hands, hair or object parts back in; erase unwanted background. Everything stays on your device.")}</p>
  <div className="souls-mask-toolbar" role="group" aria-label={t("筆刷模式","Brush mode")}>
   <button type="button" aria-pressed={mode==="restore"} onClick={()=>setMode("restore")}>
    {t("＋ 補前景","＋ Restore")}
   </button>
   <button type="button" aria-pressed={mode==="erase"} onClick={()=>setMode("erase")}>
    {t("－ 擦背景","－ Erase")}
   </button>
  </div>
  <div className="souls-mask-brush-size">
   <SoulNumberStepper en={en} label={t("筆刷大小","Brush size")}
    min={4} max={64} step={2} value={radius} display={String(radius)}
    onChange={setRadius}/>
  </div>
  <div className="souls-mask-canvas-frame">
   <canvas ref={canvasRef} width={SIZE} height={SIZE} onPointerDown={down}
    onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    aria-label={t("在圖片上塗抹修補去背","Paint on the photo to repair the cutout")}/>
  </div>
  {!ready&&!error&&<p role="status">{t("正在準備圖片…","Loading image…")}</p>}
  {error&&<p role="alert" className="souls-error">{error}</p>}
  <div className="souls-mask-actions">
   <button type="button" disabled={!ready||!historyRef.current.length} onClick={undo}>
    {t("復原","Undo")}
   </button>
   <button type="button" disabled={!ready||!futureRef.current.length} onClick={redo}>
    {t("重做","Redo")}
   </button>
   <button type="button" disabled={!ready} onClick={reset}>{t("重設輪廓","Reset mask")}</button>
   <button type="button" onClick={onCancel}>{t("取消","Cancel")}</button>
   <button type="button" className="souls-primary" disabled={!ready} onClick={apply}>
    {t("套用修補","Apply repair")}
   </button>
  </div>
  <span className="souls-hidden" aria-hidden="true">{revision}</span>
 </section>;
}
