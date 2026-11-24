export type Body={id:string;shape:"circle"|"box";x:number;y:number;w:number;h:number;color:string;vx:number;vy:number;fixed:boolean;bounce:number};
type Rule={a:string;b:string;remove:boolean;points:number};
export type World={bodies:Body[];gravity:number;score:number;rules:Rule[];revision:number};
export const fresh=():World=>({bodies:[],gravity:0.6,score:0,rules:[],revision:0});
const record=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=="object"||Array.isArray(v))throw Error("invalid-object");return v as Record<string,unknown>};
const num=(v:unknown,min:number,max:number)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw Error("invalid-number");return v};
const id=(v:unknown)=>{if(typeof v!=="string"||!/^[a-zA-Z0-9_-]{1,32}$/.test(v))throw Error("invalid-id");return v};
const color=(v:unknown)=>{if(typeof v!=="string"||!/^#[0-9a-fA-F]{6}$/.test(v))throw Error("invalid-color");return v};
const bool=(v:unknown)=>{if(typeof v!=="boolean")throw Error("invalid-boolean");return v};
export function observe(w:World){return {revision:w.revision,gravity:w.gravity,score:w.score,rules:w.rules,bodies:w.bodies.map(b=>({...b,x:+b.x.toFixed(3),y:+b.y.toFixed(3),vx:+b.vx.toFixed(2),vy:+b.vy.toFixed(2)}))}}
export function apply(w:World,input:unknown):World{
 const args=record(input),ops=args.operations;if(!Array.isArray(ops)||ops.length<1||ops.length>32)throw Error("invalid-batch");
 if(args.revision!==undefined&&args.revision!==w.revision)throw Error("stale-revision");
 const next:World={...w,bodies:w.bodies.map(b=>({...b})),rules:w.rules.map(r=>({...r}))};
 const find=(key:unknown)=>{const b=next.bodies.find(b=>b.id===id(key));if(!b)throw Error("missing-body");return b};
 for(const raw of ops){const o=record(raw);
 switch(o.op){
 case "spawn":{const key=id(o.id);if(next.bodies.length>=64||next.bodies.some(b=>b.id===key))throw Error("body-limit-or-duplicate");
 if(o.shape!=="circle"&&o.shape!=="box")throw Error("invalid-shape");
 const width=num(o.w??0.09,.025,.5),height=o.shape==="circle"?width:num(o.h??width,.025,.5);
 next.bodies.push({id:key,shape:o.shape,x:num(o.x??.5,0,1),y:num(o.y??.2,0,1),w:width,h:height,color:color(o.color??"#80cbc4"),vx:num(o.vx??0,-3,3),vy:num(o.vy??0,-3,3),fixed:bool(o.fixed??false),bounce:num(o.bounce??.8,0,1)});break;}
 case "patch":{const b=find(o.id);for(const k of ["x","y","vx","vy","w","h","bounce"] as const)if(o[k]!==undefined)b[k]=num(o[k],k==="vx"||k==="vy"?-3:k==="w"||k==="h"?.025:0,k==="vx"||k==="vy"?3:k==="w"||k==="h"?.5:1);
 if(o.color!==undefined)b.color=color(o.color);if(o.fixed!==undefined)b.fixed=bool(o.fixed);if(b.shape==="circle")b.h=b.w;break;}
 case "remove":{const b=find(o.id);next.bodies=next.bodies.filter(x=>x!==b);next.rules=next.rules.filter(r=>r.a!==b.id&&r.b!==b.id);break;}
 case "set_world":next.gravity=num(o.gravity,-2,2);break;
 case "add_rule":{const a=find(o.a).id,b=find(o.b).id;if(a===b||next.rules.length>=16||next.rules.some(r=>r.a===a&&r.b===b))throw Error("invalid-rule");
 next.rules.push({a,b,remove:bool(o.remove??true),points:num(o.points??1,0,100)});break;}
 case "clear":next.bodies=[];next.rules=[];next.score=0;break;
 default:throw Error("unknown-operation");
 }}
 next.revision++;return next;
}
export function step(w:World,dt:number,held:string|null,contacts:Set<string>,aspect=1){
 const elapsed=Math.min(.025,Math.max(0,dt));const active=new Set<string>(),events:string[]=[];
 for(const b of w.bodies){if(b.fixed||b.id===held)continue;b.vy=Math.max(-3,Math.min(3,b.vy+w.gravity*elapsed));b.x+=b.vx*elapsed;b.y+=b.vy*elapsed;
 const rx=b.w/2,ry=b.h*aspect/2;
 if(b.x<rx){b.x=rx;b.vx=Math.abs(b.vx)*b.bounce}if(b.x>1-rx){b.x=1-rx;b.vx=-Math.abs(b.vx)*b.bounce}
 if(b.y<ry){b.y=ry;b.vy=Math.abs(b.vy)*b.bounce}if(b.y>1-ry){b.y=1-ry;b.vy=-Math.abs(b.vy)*b.bounce}}
 const removed=new Set<string>();
 for(let i=0;i<w.bodies.length;i++)for(let j=i+1;j<w.bodies.length;j++){
 const a=w.bodies[i],b=w.bodies[j];if(removed.has(a.id)||removed.has(b.id))continue;
 const dx=b.x-a.x,dy=(b.y-a.y)/aspect;
 let nx=0,ny=0,depth=0;
 if(a.shape==="circle"&&b.shape==="circle"){const d=Math.hypot(dx,dy),r=(a.w+b.w)/2;if(d>=r)continue;nx=d>1e-6?dx/d:1;ny=d>1e-6?dy/d:0;depth=r-d}
 else if(a.shape!==b.shape){
 const c=a.shape==="circle"?a:b,q=c===a?b:a,s=c===a?1:-1,px=q.x-c.x,py=(q.y-c.y)/aspect;
 const cx=Math.max(-q.w/2,Math.min(q.w/2,-px))+px,cy=Math.max(-q.h/2,Math.min(q.h/2,-py))+py,d=Math.hypot(cx,cy);
 if(d>=c.w/2)continue;
 if(d>1e-6){nx=s*cx/d;ny=s*cy/d;depth=c.w/2-d}else{const ox=q.w/2-Math.abs(px),oy=q.h/2-Math.abs(py);if(ox<oy){nx=s*(Math.sign(px)||1);depth=c.w/2+ox}else{ny=s*(Math.sign(py)||1);depth=c.w/2+oy}}
 }else{const ox=(a.w+b.w)/2-Math.abs(dx),oy=(a.h+b.h)/2-Math.abs(dy);if(ox<=0||oy<=0)continue;if(ox<oy){nx=Math.sign(dx)||1;depth=ox}else{ny=Math.sign(dy)||1;depth=oy}}
 const key=[a.id,b.id].sort().join(":");active.add(key);
 if(!contacts.has(key)){for(const r of w.rules){if(!((r.a===a.id&&r.b===b.id)||(r.b===a.id&&r.a===b.id)))continue;w.score+=r.points;if(r.remove)removed.add(r.b);events.push("collision "+r.a+" / "+r.b+" score "+w.score)}}
 const ia=a.fixed||held===a.id?0:1,ib=b.fixed||held===b.id?0:1,sum=ia+ib;if(!sum)continue;
 a.x-=nx*depth*ia/sum;b.x+=nx*depth*ib/sum;a.y-=ny*depth*aspect*ia/sum;b.y+=ny*depth*aspect*ib/sum;
 const v=(b.vx-a.vx)*nx+(b.vy-a.vy)/aspect*ny;if(v<0){const impulse=-(1+Math.min(a.bounce,b.bounce))*v/sum;a.vx-=impulse*nx*ia;b.vx+=impulse*nx*ib;a.vy-=impulse*ny*aspect*ia;b.vy+=impulse*ny*aspect*ib}
 }
 if(removed.size){w.bodies=w.bodies.filter(b=>!removed.has(b.id));w.rules=w.rules.filter(r=>!removed.has(r.a)&&!removed.has(r.b))}
 if(events.length)w.revision++;
 contacts.clear();active.forEach(k=>contacts.add(k));return events;
}
