import {useMemo} from 'react';
import {BufferAttribute,BufferGeometry,Color,FrontSide} from 'three';
import {islandSurfaceHeight} from './magicNavigation';
import {MAGIC_MATERIALS,type MagicPalette} from './magicPalette';
const RX=5.65*Math.sqrt(10),RZ=5.65*.84*Math.sqrt(10),N=48,RINGS=9;
const outer=(k:number)=>{const a=k/N*Math.PI*2,r=.985;return [Math.cos(a)*RX*r,Math.sin(a)*RZ*r] as const;};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** Shared edge ring, outward winding and front-facing grass. No double-sided fill. */
export function MagicTerrain3D({colors}:{colors:MagicPalette}){
 const {grass,cliffs}=useMemo(()=>{
  const grass=new BufferGeometry(),gp:number[]=[],gc:number[]=[],gi:number[]=[];
  const base=new Color(colors.ground),lighter=base.clone().lerp(new Color('#E4E5A6'),.36),darker=base.clone().multiplyScalar(.78);
  for(let j=0;j<=RINGS;j++)for(let k=0;k<=N;k++){
   const a=k/N*Math.PI*2,r=j/RINGS*.985,x=Math.cos(a)*RX*r,z=Math.sin(a)*RZ*r;
   gp.push(x,islandSurfaceHeight(x,z),z);
   const n=Math.sin(x*.27+z*.13)*Math.cos(z*.22-x*.11)+.5*Math.sin(x*.13-z*.28);
   const patch=clamp(.48+n*.22-(r>.79?(r-.79)*.9:0));
   const c=darker.clone().lerp(lighter,patch);gc.push(c.r,c.g,c.b);
  }
  for(let j=0;j<RINGS;j++)for(let k=0;k<N;k++){
   const a=j*(N+1)+k,b=a+N+1;
   // Cross product points upward in world Y.
   gi.push(a,a+1,b,b,a+1,b+1);
  }
  grass.setAttribute('position',new BufferAttribute(new Float32Array(gp),3));
  grass.setAttribute('color',new BufferAttribute(new Float32Array(gc),3));
  grass.setIndex(gi);grass.computeVertexNormals();
  const cliffs=new BufferGeometry(),cp:number[]=[],cc:number[]=[],ci:number[]=[];
  const layers=[
   {r:1,y:0},{r:.995,y:-.42},{r:.96,y:-1.4},
   {r:.88,y:-2.6},{r:.68,y:-4.6},{r:.37,y:-7.9},{r:0,y:-10.0},
  ];
  const rock=new Color(colors.side),soil=new Color('#B89A72');
  layers.forEach((layer,j)=>{
   for(let k=0;k<=N;k++){
    const [ex,ez]=outer(k),a=k/N*Math.PI*2;
    const variation=j===0?1:1+.018*Math.sin(a*4+j*.6)+.012*Math.cos(a*7-j); // periodic in a: k=0 and k=N weld
    const x=ex*layer.r*variation,z=ez*layer.r*variation;
    const y=j===0?islandSurfaceHeight(ex,ez):
     j===layers.length-1?-10:layer.y+Math.sin(a*5+j)*.12;
    cp.push(x,y,z);
    const col=j<2?soil.clone().lerp(rock,j*.48):rock.clone().multiplyScalar(Math.max(.48,1-(j-2)*.115));
    cc.push(col.r,col.g,col.b);
   }
  });
  for(let j=0;j<layers.length-1;j++)for(let k=0;k<N;k++){
   const a=j*(N+1)+k,b=a+N+1;
   // From +X, tangent points toward +Z and downward points toward -Y.
   // triangle (a,a+1,b) has outward normal +X at angle 0.
   ci.push(a,a+1,b,a+1,b+1,b);
  }
  cliffs.setAttribute('position',new BufferAttribute(new Float32Array(cp),3));
  cliffs.setAttribute('color',new BufferAttribute(new Float32Array(cc),3));
  cliffs.setIndex(ci);cliffs.computeVertexNormals();
  // FrontSide grass overlaps exact x/z of cliff ring; triangles connect down to sealed tip.
  return {grass,cliffs};
 },[colors.ground,colors.side]);
 return <group>
  <mesh geometry={cliffs}><meshStandardMaterial vertexColors {...MAGIC_MATERIALS.stone} side={FrontSide}/></mesh>
  <mesh geometry={grass}><meshStandardMaterial vertexColors {...MAGIC_MATERIALS.grass} side={FrontSide}/></mesh>
 </group>;
}
