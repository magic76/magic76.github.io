// Optional offline-authoring experiments. Never part of the Crew Tree runtime.
const $=id=>document.getElementById(id);
const coreUrl='./vendor/rigby2d/src/core/interop.js';
const poseUrl='./vendor/rigby2d/src/core/pose.js';
const stateUrl='./vendor/rigby2d/src/core/state.js';
let generated=null;
function fail(id,error){$(id).textContent='驗證失敗（未生成）：'+String(error?.message||error);}
$('bakeBtn').addEventListener('click',async()=>{
 const report=$('bakeReport'),seed=Number($('bakeSeed').value);
 if(!Number.isSafeInteger(seed)||seed<1||seed>999999){report.textContent='Seed 不合法';return;}
 report.textContent='載入 Paper.js 與 p5.brush 3.0.0…';
 try{
  if(!window.paper?.PaperScope)throw Error('無法載入 Paper.js 0.17.0');
  const {default:unused,...brush}=await import('https://cdn.jsdelivr.net/npm/p5.brush@3.0.0/dist/brush.esm.js');
  void unused;
  const scope=new window.paper.PaperScope();
  scope.setup(document.createElement('canvas'));
  const path=new scope.Path();
  path.moveTo(new scope.Point(48,160));
  path.cubicCurveTo(new scope.Point(140,102),new scope.Point(245,119),new scope.Point(405,135));
  const old=$('brushTarget');old.replaceChildren();
  const cv=brush.createCanvas(500,310,{parent:old,id:'brush-baked'});
  brush.seed(seed);brush.noiseSeed(seed);brush.clear();
  brush.push();brush.translate(-250,-155);
  // Paper.js supplies a smooth hand-drawn contour; p5.brush supplies ink grain.
  brush.set('HB','#5f8577',1);
  for(let t=0;t<path.length;t+=5){
   const a=path.getPointAt(t),b=path.getPointAt(Math.min(path.length,t+5));
   if(a&&b)brush.line(a.x,a.y,b.x,b.y);
  }
  for(let i=0;i<21;i++){
   const xx=55+(i*73+seed%41)%394,yy=128+(i*19)%100;
   brush.set('HB',i%3===0?'#ceb18f':'#789786',.44);
   brush.line(xx,yy,xx-5-(i%6),yy+11+(i%3)*3);
  }
  brush.pop();brush.render();
  // Blend only at export, keeping transparency of the authored SVG.
  const out=document.createElement('canvas');out.width=500;out.height=310;
  const cx=out.getContext('2d');const img=$('islandPlate');
  await img.decode();cx.drawImage(img,0,0,500,310);cx.drawImage(cv,0,0,500,310);
  generated=out;$('saveBake').disabled=false;
  report.textContent='完成：Paper.js 曲線 '+Math.round(path.length)+' 單位；p5.brush HB 畫筆 21 道紋理，500×310 透明 PNG 可匯出。';
 }catch(error){generated=null;$('saveBake').disabled=true;fail('bakeReport',error);}
});
$('saveBake').addEventListener('click',()=>{
 if(!generated)return;const a=document.createElement('a');
 a.download='crew-original-island-brush-'+$('bakeSeed').value+'.png';a.href=generated.toDataURL('image/png');
 document.body.appendChild(a);a.click();a.remove();
});
$('checkRig').addEventListener('click',async()=>{
 $('rigReport').textContent='載入 Rigby2D 官方 Runtime…';
 try{
  const [{readSkeletonJson},{Pose},{AnimationState}]=await Promise.all([import(coreUrl),import(poseUrl),import(stateUrl)]);
  const response=await fetch('./rig/jelly-tree.skeleton.json');
  if(!response.ok)throw Error('骨架 JSON HTTP '+response.status);
  const fixture=await response.json();
  const {skeleton,warnings}=readSkeletonJson(fixture,'crew-jelly-tree');
  const pose=new Pose(skeleton),state=new AnimationState();
  state.play(skeleton,'sway',true,0.1);
  state.update(skeleton,.5);state.apply(skeleton,pose);
  $('rigReport').textContent='Rigby2D 實際 Runtime 驗證成功。bones='+skeleton.bones.length+
  ', animations='+skeleton.animations.length+', warnings='+warnings.length+
  '；sway 在 0.5 秒完成 pose evaluation。';
 }catch(error){fail('rigReport',error);}
});
