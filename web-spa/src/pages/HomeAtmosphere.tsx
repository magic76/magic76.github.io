import {useEffect,useRef} from "react";

export type HomeProduct="chat"|"play"|"learn"|"teacher"|"story"|"fortune";
type Particle={x:number;y:number;size:number;phase:number;speed:number};
type Point={x:number;y:number;size:number};

const COLORS:Record<HomeProduct|"idle",readonly [number,number,number]>={
 idle:[110,125,195],chat:[123,95,221],learn:[73,125,220],teacher:[113,90,211],story:[212,143,63],fortune:[75,123,192],play:[57,151,133]
};
const noise=(seed:number,salt:number)=>{
 const value=Math.sin((seed+1)*127.1+salt*311.7)*43758.5453;
 return value-Math.floor(value);
};
const createParticles=(count:number):Particle[]=>Array.from({length:count},(_,index)=>({
 x:noise(index,1),y:noise(index,2),
 size:1+noise(index,3)*1.7,
 phase:noise(index,4)*Math.PI*2,
 speed:.3+noise(index,5)*.5
}));

/**
 * Decorative network rendered only while its hero is visible.
 * Canvas is bounded and throttled, while the aurora and glass core have CSS fallbacks.
 */

type Vertex=readonly [number,number];
type Stroke=readonly Vertex[];
const arc=(cx:number,cy:number,r:number,count=24):Vertex[]=>
 Array.from({length:count+1},(_,i)=>[cx+Math.cos(i/count*Math.PI*2)*r,cy+Math.sin(i/count*Math.PI*2)*r]);

// These paths follow the same 24x24 silhouettes as the icons on the three product cards.
const GLYPH_STROKES:Record<HomeProduct,readonly Stroke[]>={
 chat:[
  [[5,5],[19,5],[19,16],[10,16],[5,20],[5,5]],
  [[8,9],[16,9]],[[8,12],[14,12]]
 ],
 learn:[
  [[12,6.5],[10,5.4],[8,5],[6,5],[4,5.5],[4,18.5],[6,18],[8,18],[10,18.5],[12,19.5],[12,6.5]],
  [[12,6.5],[14,5.4],[16,5],[18,5],[20,5.5],[20,18.5],[18,18],[16,18],[14,18.5],[12,19.5]],
  [[7,9],[9,9]],[[15,9],[17,9]]
 ],
 teacher:[
  arc(12,8,3.5),
  [[5,21],[5.4,19.3],[6.2,17.6],[7.4,16.2],[9,15.3],[12,15],
   [15,15.3],[16.6,16.2],[17.8,17.6],[18.6,19.3],[19,21]],
  [[18,5.5],[20.5,3]]
 ],
 story:[
  [[12,6.5],[10,5.4],[8,5],[6,5],[4,5.5],[4,18.5],[6,18],[8,18],[10,18.5],[12,19.5],[12,6.5]],
  [[12,6.5],[14,5.4],[16,5],[18,5],[20,5.5],[20,18.5],[18,18],[16,18],[14,18.5],[12,19.5]]
 ],
 fortune:[
  arc(12,12,8,36),
  [[12,4],[12,20]],[[4,12],[20,12]],
  [[6.5,6.5],[17.5,17.5]],[[17.5,6.5],[6.5,17.5]]
 ],
 play:[
  [[5,4],[19,4],[20,5],[20,19],[19,20],[5,20],[4,19],[4,5],[5,4]],
  [[9.3,4],[9.3,20]],[[14.7,4],[14.7,20]],
  [[4,9.3],[20,9.3]],[[4,14.7],[20,14.7]],
  [[5.5,5.5],[8,8]],[[8,5.5],[5.5,8]],
  arc(17.4,17.4,1.4,12)
 ]
};
// Even arc-length sampling spreads a bounded number of dots along the actual icon strokes.
const sampleGlyph=(product:HomeProduct,count:number):Vertex[]=>{
 const segments:{a:Vertex;b:Vertex;length:number}[]=[];
 for(const stroke of GLYPH_STROKES[product]){
  stroke.slice(1).forEach((b,index)=>{
   const a=stroke[index],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
   if(length>0)segments.push({a,b,length});
  });
 }
 const total=segments.reduce((sum,segment)=>sum+segment.length,0);
 return Array.from({length:count},(_,index)=>{
  let distance=total*(index+.5)/count;
  for(const {a,b,length} of segments){
   if(distance<=length){
    const t=distance/length;
    return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t] as const;
   }
   distance-=length;
  }
  return segments[segments.length-1].b;
 });
};
const smoothstep=(progress:number)=>1-Math.pow(1-progress,3);

export function HomeAtmosphere({activeProduct}: {activeProduct:HomeProduct|null}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const productRef=useRef(activeProduct);
 const refreshRef=useRef<null|(()=>void)>(null);
 useEffect(()=>{productRef.current=activeProduct;refreshRef.current?.()},[activeProduct]);

 useEffect(()=>{
  const canvas=canvasRef.current;
  const scene=canvas?.parentElement;
  const hero=scene?.closest<HTMLElement>(".crew-home-intro");
  const ctx=canvas?.getContext("2d",{alpha:true});
  if(!canvas||!scene||!hero||!ctx)return;

  const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer=window.matchMedia("(hover: hover) and (pointer: fine)");
  const saveData=Boolean((navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData);
  let width=0,height=0,mobile=false,visible=true;
  let particles:Particle[]=[];
  let pointer:{x:number;y:number}|null=null;
  let ripple:{x:number;y:number,start:number}|null=null;
  let timer:number|null=null;
  let frame:number|null=null;
  let previousProduct:HomeProduct|null=null;
  let morphStart=0;
  let fromNodes:Point[]=[];
  let renderedNodes:Point[]=[];
  let shapePoints:Vertex[]=[];

  const animated=()=>!motion.matches&&!saveData;
  const stop=()=>{
   if(timer!==null){window.clearTimeout(timer);timer=null}
   if(frame!==null){window.cancelAnimationFrame(frame);frame=null}
  };
  const draw=(timestamp:number)=>{
   if(!width||!height)return;
   ctx.clearRect(0,0,width,height);
   const reduced=!animated();
   const time=reduced?0:timestamp/1000;
   const firstX=width*(mobile?.53:.43);
   const active=productRef.current;
   const rgb=COLORS[active||"idle"].join(",");
   const idleNodes:Point[]=particles.map(p=>{
    let x=firstX+p.x*(width-firstX);
    let y=12+p.y*Math.max(1,height-24);
    if(!reduced){
     x+=Math.sin(time*p.speed+p.phase)*8;
     y+=Math.cos(time*p.speed*.8+p.phase)*8;
     if(pointer){
      const dx=pointer.x-x,dy=pointer.y-y;
      const strength=Math.max(0,1-Math.hypot(dx,dy)/150);
      x+=dx*strength*strength*.16;
      y+=dy*strength*strength*.16;
     }
    }
    return {x,y,size:p.size};
   });
   // Snapshot the current positions for interruption-safe transitions between all three icons.
   if(active!==previousProduct){
    fromNodes=(renderedNodes.length===idleNodes.length?renderedNodes:idleNodes).map(p=>({...p}));
    shapePoints=active?sampleGlyph(active,particles.length):[];
    morphStart=timestamp;
    previousProduct=active;
   }
   const duration=active?420:620;
   const progress=reduced?1:Math.min(1,Math.max(0,(timestamp-morphStart)/duration));
   const eased=smoothstep(progress);
   const centerX=width*(mobile?.5:.75),centerY=height*(mobile?.77:.5);
   const glyphScale=Math.min(height*.048,width*(mobile?.013:.01),mobile?5.6:7.5);
   const nodes:Point[]=idleNodes.map((idle,index)=>{
    const target=active?{
     x:centerX+(shapePoints[index][0]-12)*glyphScale,
     y:centerY+(shapePoints[index][1]-12)*glyphScale,
     size:Math.max(2.1,idle.size)
    }:idle;
    if(progress>=1)return target;
    const from=fromNodes[index]||idle;
    return {x:from.x+(target.x-from.x)*eased,y:from.y+(target.y-from.y)*eased,
     size:from.size+(target.size-from.size)*eased};
   });
   renderedNodes=nodes;
   // Neural links retreat as the particles assemble into the recognizable silhouette.
   const linkAlpha=active?Math.pow(1-eased,2):Math.pow(eased,2);
   const reach=mobile?66:88;
   ctx.lineWidth=.9;
   for(let i=0;i<nodes.length;i++){
    const a=nodes[i];
    let links=0;
    for(let j=i+1;j<nodes.length&&links<3;j++){
     const b=nodes[j];
     const distance=Math.hypot(a.x-b.x,a.y-b.y);
     if(distance>reach)continue;
     const intensity=(1-distance/reach)*.27*linkAlpha;
     ctx.strokeStyle="rgba("+rgb+","+intensity.toFixed(3)+")";
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
     if(!reduced&&linkAlpha>.15&&(i+j)%7===0){
      const travel=(time*.3+i*.17+j*.11)%1;
      ctx.fillStyle="rgba("+rgb+",.7)";
      ctx.beginPath();
      ctx.arc(a.x+(b.x-a.x)*travel,a.y+(b.y-a.y)*travel,1.35,0,Math.PI*2);
      ctx.fill();
     }
     links++;
    }
   }
   // A faint continuous trace gives the dot-based icon definition without replacing it.
   if(active&&progress>.58){
    const opacity=Math.min(1,(progress-.58)/.42);
    ctx.lineWidth=1.2;ctx.lineJoin="round";ctx.lineCap="round";
    ctx.strokeStyle="rgba("+rgb+","+(opacity*.3).toFixed(3)+")";
    for(const stroke of GLYPH_STROKES[active]){
     ctx.beginPath();
     stroke.forEach(([x,y],i)=>{
      const px=centerX+(x-12)*glyphScale,py=centerY+(y-12)*glyphScale;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
     });
     ctx.stroke();
    }
   }
   nodes.forEach((point,index)=>{
    if(index%6===0){
     ctx.fillStyle="rgba("+rgb+",.10)";
     ctx.beginPath();ctx.arc(point.x,point.y,point.size*3.5,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle="rgba("+rgb+","+(active?.94:.68)+")";
    ctx.beginPath();ctx.arc(point.x,point.y,point.size,0,Math.PI*2);ctx.fill();
   });
   if(ripple){
    const progress=(timestamp-ripple.start)/850;
    if(progress>=1)ripple=null;
    else{
     ctx.strokeStyle="rgba("+rgb+","+(0.28*(1-progress)).toFixed(3)+")";
     ctx.lineWidth=1.5;
     ctx.beginPath();ctx.arc(ripple.x,ripple.y,10+progress*105,0,Math.PI*2);ctx.stroke();
    }
   }
  };
  const schedule=()=>{
   if(!animated()||!visible||document.hidden||timer!==null||frame!==null)return;
   timer=window.setTimeout(()=>{
    timer=null;
    frame=window.requestAnimationFrame(time=>{
     frame=null;
     draw(time);
     schedule();
    });
   },mobile?1000/18:1000/30);
  };
  const resize=()=>{
   const bounds=scene.getBoundingClientRect();
   const nextWidth=Math.round(bounds.width),nextHeight=Math.round(bounds.height);
   if(nextWidth<=0||nextHeight<=0)return;
   mobile=window.innerWidth<=640;
   if(nextWidth!==width||nextHeight!==height||!particles.length){
    width=nextWidth;height=nextHeight;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    particles=createParticles(mobile?22:52);
    renderedNodes=[];fromNodes=[];shapePoints=productRef.current?sampleGlyph(productRef.current,particles.length):[];
    previousProduct=null;
   }
   draw(performance.now());
  };
  const onPointerMove=(event:PointerEvent)=>{
   if(!finePointer.matches||!animated())return;
   const rect=scene.getBoundingClientRect();
   pointer={x:event.clientX-rect.left,y:event.clientY-rect.top};
   scene.style.setProperty("--crew-parallax-x",((pointer.x/rect.width-.5)*9).toFixed(1)+"px");
   scene.style.setProperty("--crew-parallax-y",((pointer.y/rect.height-.5)*7).toFixed(1)+"px");
  };
  const onPointerLeave=()=>{
   pointer=null;
   scene.style.removeProperty("--crew-parallax-x");
   scene.style.removeProperty("--crew-parallax-y");
  };
  const onPointerDown=(event:PointerEvent)=>{
   if(!finePointer.matches||!animated())return;
   const rect=scene.getBoundingClientRect();
   ripple={x:event.clientX-rect.left,y:event.clientY-rect.top,start:performance.now()};
  };
  const onVisibility=()=>{
   if(document.hidden)stop();
   else{resize();schedule()}
  };
  const onMotion=()=>{
   if(!animated()){stop();onPointerLeave()}
   resize();schedule();
  };
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;
  observer?.observe(scene);
  const intersection=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(entries=>{
   visible=Boolean(entries[0]?.isIntersecting);
   if(!visible)stop();
   else{resize();schedule()}
  }):null;
  intersection?.observe(scene);
  hero.addEventListener("pointermove",onPointerMove,{passive:true});
  hero.addEventListener("pointerleave",onPointerLeave);
  hero.addEventListener("pointerdown",onPointerDown,{passive:true});
  document.addEventListener("visibilitychange",onVisibility);
  motion.addEventListener("change",onMotion);
  window.addEventListener("resize",resize,{passive:true});
  refreshRef.current=()=>{ripple={x:width*(mobile?.5:.75),y:height*(mobile?.77:.5),start:performance.now()};draw(performance.now());schedule()};
  resize();schedule();

  return ()=>{
   refreshRef.current=null;
   stop();observer?.disconnect();intersection?.disconnect();
   hero.removeEventListener("pointermove",onPointerMove);
   hero.removeEventListener("pointerleave",onPointerLeave);
   hero.removeEventListener("pointerdown",onPointerDown);
   document.removeEventListener("visibilitychange",onVisibility);
   motion.removeEventListener("change",onMotion);
   window.removeEventListener("resize",resize);
   onPointerLeave();
  };
 },[]);

 return <div className="crew-home-atmosphere" data-product={activeProduct||"idle"} aria-hidden="true">
  <span className="crew-home-aurora first"/>
  <span className="crew-home-aurora second"/>
  <canvas ref={canvasRef} className="crew-home-network"/>
  <span className="crew-home-atmosphere-halo"/>
  <span className="crew-home-atmosphere-ring outer"/>
  <span className="crew-home-atmosphere-ring inner"/>
  <span className="crew-home-atmosphere-core"/>
 </div>;
}
