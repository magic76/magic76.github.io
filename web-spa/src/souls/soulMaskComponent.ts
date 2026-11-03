/** Select the foreground connected to the user's tap, rather than bounding every
 * stray foreground pixel in the scene. Pure function so synthetic masks can be tested. */
export type MaskPoint={x:number;y:number};
export type MaskComponent={left:number;top:number;right:number;bottom:number;anchors:MaskPoint[]};
export function componentFromAlpha(
 rgba:Uint8ClampedArray,width:number,height:number,at:MaskPoint
):MaskComponent{
 if(width<8||height<8||rgba.length<width*height*4)throw Error("Invalid segmentation bitmap");
 const step=3,gw=Math.ceil(width/step),gh=Math.ceil(height/step);
 const occupied=new Uint8Array(gw*gh);
 for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){
  const px=Math.min(width-1,x*step+1),py=Math.min(height-1,y*step+1);
  if(rgba[(py*width+px)*4+3]>=128)occupied[y*gw+x]=1;
 }
 const clickX=Math.max(0,Math.min(gw-1,Math.floor(at.x*width/step)));
 const clickY=Math.max(0,Math.min(gh-1,Math.floor(at.y*height/step)));
 // The user may tap an eye/handle slightly outside the alpha region, but we
 // must not jump to an unrelated object far away.
 const maxDistance=Math.max(3,Math.round(Math.min(gw,gh)*.07));
 let seed=-1,bestDistance=Infinity;
 for(let dy=-maxDistance;dy<=maxDistance;dy++)for(let dx=-maxDistance;dx<=maxDistance;dx++){
  const x=clickX+dx,y=clickY+dy;
  if(x<0||x>=gw||y<0||y>=gh||!occupied[y*gw+x])continue;
  const distance=dx*dx+dy*dy;
  if(distance<bestDistance){bestDistance=distance;seed=y*gw+x}
 }
 if(seed<0)throw Error("Selected point is outside the foreground");
 const selected=new Uint8Array(gw*gh),queue=new Int32Array(gw*gh);
 let head=0,tail=1,count=0,minGX=gw,minGY=gh,maxGX=-1,maxGY=-1;
 selected[seed]=1;queue[0]=seed;
 const directions=[-1,0,1];
 while(head<tail){
  const index=queue[head++],x=index%gw,y=Math.floor(index/gw);
  minGX=Math.min(minGX,x);maxGX=Math.max(maxGX,x);
  minGY=Math.min(minGY,y);maxGY=Math.max(maxGY,y);
  count++;
  for(const dy of directions)for(const dx of directions){
   if(!dx&&!dy)continue;
   const nx=x+dx,ny=y+dy;
   if(nx<0||nx>=gw||ny<0||ny>=gh)continue;
   const next=ny*gw+nx;
   if(selected[next]||!occupied[next])continue;
   selected[next]=1;queue[tail++]=next;
  }
 }
 const fraction=count/(gw*gh);
 if(fraction<.002||fraction>.88)throw Error("Ambiguous foreground area");
 const left=Math.max(0,minGX*step),top=Math.max(0,minGY*step);
 const right=Math.min(width,(maxGX+1)*step),bottom=Math.min(height,(maxGY+1)*step);
 const gap=Math.max(2,Math.round(Math.min(maxGX-minGX,maxGY-minGY)/6));
 const anchors:MaskPoint[]=[];
 for(let y=minGY;y<=maxGY;y+=gap)for(let x=minGX;x<=maxGX;x+=gap){
  // Search nearby to avoid rejecting a curved/irregular mask at the grid centers.
  let chosen=-1,closest=Infinity;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   const nx=x+dx,ny=y+dy;
   if(nx<0||nx>=gw||ny<0||ny>=gh||!selected[ny*gw+nx])continue;
   const d=dx*dx+dy*dy;
   if(d<closest){closest=d;chosen=ny*gw+nx}
  }
  if(chosen<0)continue;
  const px=Math.min(width-1,(chosen%gw)*step+1);
  const py=Math.min(height-1,Math.floor(chosen/gw)*step+1);
  if(rgba[(py*width+px)*4+3]<165)continue;
  anchors.push({x:px/width,y:py/height});
 }
 return {left,top,right,bottom,anchors:anchors.slice(0,48)};
}
