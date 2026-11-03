/** Persistent face coordinates on a square object portrait, independent of camera AR. */
export type SoulFace={x:number;y:number;scale:number};
export const DEFAULT_FACE:SoulFace={x:.5,y:.42,scale:1};
export const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,Number.isFinite(value)?value:min));
export function safeFace(value:Partial<SoulFace>|undefined|null):SoulFace{
 return {x:clamp(value?.x??DEFAULT_FACE.x,.10,.90),
  y:clamp(value?.y??DEFAULT_FACE.y,.10,.90),
  scale:clamp(value?.scale??DEFAULT_FACE.scale,.55,1.65)};
}
/** Put the eyes within the visible foreground; works for any alpha PNG. */
export function faceFromAlpha(pixels:Uint8ClampedArray,width:number,height:number):SoulFace{
 if(width<=0||height<=0||pixels.length<width*height*4)return {...DEFAULT_FACE};
 let left=width,top=height,right=-1,bottom=-1,count=0;
 // Ignore almost transparent antialiasing pixels.
 for(let y=0;y<height;y+=2)for(let x=0;x<width;x+=2){
  if(pixels[(y*width+x)*4+3]<170)continue;
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);count++;
 }
 if(right<left||count<Math.max(5,width*height*.001/4))return {...DEFAULT_FACE};
 const objectWidth=(right-left+1)/width,objectHeight=(bottom-top+1)/height;
 if(objectWidth>.97&&objectHeight>.97)return {...DEFAULT_FACE};
 return safeFace({
  x:(left+right)/(2*width),
  y:(top+(bottom-top)*.42)/height,
  scale:clamp(Math.min(objectWidth/.55,objectHeight/.63),.60,1.35)
 });
}
