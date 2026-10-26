import {useMemo} from 'react';
import {BufferAttribute,BufferGeometry,Color,DoubleSide} from 'three';
import {islandSurfaceHeight} from './magicNavigation';
import {MAGIC_MATERIALS,type MagicPalette} from './magicPalette';
const RX=5.65*Math.sqrt(10),RZ=5.65*.84*Math.sqrt(10),N=56,RINGS=13;
const noise=(a:number,b:number)=>Math.sin(a*1.28+b*.71)*.5+Math.sin(a*.47-b*1.13)*.3;
export function MagicTerrain3D({colors}:{colors:MagicPalette}){
 const {grass,cliffs}=useMemo(()=>{
  const grass=new BufferGeometry(),gp:number[]=[],gc:number[]=[],gn:number[]=[];
  const base=new Color(colors.ground),shade=base.clone().multiplyScalar(.78),highlight=base.clone().lerp(new Color('#D9E8AA'),.25);
  for(let j=0;j<=RINGS;j++)for(let k=0;k<=N;k++){
   const r=j/RINGS*.985,a=k/N*Math.PI*2,x=Math.cos(a)*RX*r,z=Math.sin(a)*RZ*r;
   gp.push(x,islandSurfaceHeight(x,z),z);
   const factor=Math.min(1,Math.max(0,.5+noise(x*.3,z*.3)*.52));
   const c=shade.clone().lerp(highlight,factor);gc.push(c.r,c.g,c.b);
  }
  for(let j=0;j<RINGS;j++)for(let k=0;k<N;k++){
   const a=j*(N+1)+k,b=a+N+1;gn.push(a,a+1,b,b,a+1,b+1);
  }
  grass.setAttribute('position',new BufferAttribute(new Float32Array(gp),3));
  grass.setAttribute('color',new BufferAttribute(new Float32Array(gc),3));
  grass.setIndex(gn);grass.computeVertexNormals();
  const cliffs=new BufferGeometry(),cp:number[]=[],cc:number[]=[],ci:number[]=[];
  const layers=[{r:.985,y:0},{r:.985,y:-.40},{r:.95,y:-1.2},{r:.85,y:-2.4},{r:.7,y:-4.6},{r:.46,y:-7.5},{r:.16,y:-10.6},{r:.025,y:-11.3}];
  const rock=new Color(colors.side),soil=new Color('#B49B76');
  layers.forEach((layer,j)=>{
   for(let k=0;k<=N;k++){
    const a=k/N*Math.PI*2;
    const jag=1+.025*Math.sin(k*3.7+j*.9)+.035*Math.sin(k*8.3-j*1.7)+.018*Math.cos(k*2.7+j*2.3);
    const x=Math.cos(a)*RX*layer.r*jag,z=Math.sin(a)*RZ*layer.r*jag;
    const y=j===0?islandSurfaceHeight(Math.cos(a)*RX*.985,Math.sin(a)*RZ*.985)-.045:layer.y+Math.sin(k*2.13+j*.71)*.17;
    cp.push(x,y,z);
    const c=j<=1?soil.clone().lerp(rock,j*.25):rock.clone().multiplyScalar(1-(j-2)*.095);
    cc.push(c.r,c.g,c.b);
   }
  });
  for(let j=0;j<layers.length-1;j++)for(let k=0;k<N;k++){
   const a=j*(N+1)+k,b=a+N+1;ci.push(a,a+1,b,a+1,b+1,b);
  }
  cliffs.setAttribute('position',new BufferAttribute(new Float32Array(cp),3));
  cliffs.setAttribute('color',new BufferAttribute(new Float32Array(cc),3));cliffs.setIndex(ci);cliffs.computeVertexNormals();
  return {grass,cliffs};
 },[colors.ground,colors.side]);
 return <group>
  <mesh geometry={cliffs}><meshStandardMaterial vertexColors {...MAGIC_MATERIALS.stone} side={DoubleSide}/></mesh>
  <mesh geometry={grass}><meshStandardMaterial vertexColors {...MAGIC_MATERIALS.grass} side={DoubleSide}/></mesh>
 </group>;
}
