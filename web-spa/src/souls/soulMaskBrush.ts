/** Local pixel brush for repairing a segmentation alpha mask. No uploads or model calls. */
export type MaskBrushMode="restore"|"erase";
export function paintMaskPoint(
 output:Uint8ClampedArray,original:Uint8ClampedArray,
 width:number,height:number,x:number,y:number,radius:number,mode:MaskBrushMode
){
 if(width<1||height<1||output.length!==width*height*4||original.length!==output.length)return;
 const size=Math.max(1,Math.min(120,Number.isFinite(radius)?radius:12));
 const left=Math.max(0,Math.floor(x-size)),right=Math.min(width-1,Math.ceil(x+size));
 const top=Math.max(0,Math.floor(y-size)),bottom=Math.min(height-1,Math.ceil(y+size));
 for(let py=top;py<=bottom;py++)for(let px=left;px<=right;px++){
  const distance=Math.hypot(px-x,py-y)/size;
  if(distance>1)continue;
  const strength=Math.min(1,Math.max(0,(1-distance)*3));
  const i=(py*width+px)*4;
  // Keep RGB from the source photo so recovered pixels never inherit cutout fringing.
  output[i]=original[i];output[i+1]=original[i+1];output[i+2]=original[i+2];
  const alpha=output[i+3],target=mode==="restore"?original[i+3]:0;
  output[i+3]=Math.round(alpha+(target-alpha)*strength);
 }
}
export function paintMaskStroke(
 output:Uint8ClampedArray,original:Uint8ClampedArray,
 width:number,height:number,from:{x:number;y:number},to:{x:number;y:number},
 radius:number,mode:MaskBrushMode
){
 const distance=Math.hypot(to.x-from.x,to.y-from.y);
 const segments=Math.min(150,Math.max(1,Math.ceil(distance/Math.max(1,radius*.27))));
 for(let k=0;k<=segments;k++){
  const ratio=k/segments;
  paintMaskPoint(output,original,width,height,
   from.x+(to.x-from.x)*ratio,from.y+(to.y-from.y)*ratio,radius,mode);
 }
}
