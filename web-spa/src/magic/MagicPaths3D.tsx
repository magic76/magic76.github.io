import {useMemo} from 'react';
import {BufferAttribute,BufferGeometry,FrontSide} from 'three';
import {islandSurfaceHeight} from './magicNavigation';
import {MAGIC_DISTRICTS} from './magicLayout';
import {MAGIC_MATERIALS,type MagicPalette} from './magicPalette';
const routes=[
 [[0,2.5],[0,5],[2.5,7.5],[5.7,8.2]],
 [[0,2.5],[-2,5.4],[-4.6,8]],
 [[0,2.5],[1.5,2.8],[5,2.1],[9.5,1.7]],
] as number[][][];
// End exactly at each district's plaza edge (toward castle).
const toPlaza=(index:number)=>{const d=MAGIC_DISTRICTS[index];const t=Math.hypot(d.x,d.z);return [d.x-d.x/t*1.35,d.z-d.z/t*1.35];};
/** Three ribbons in a shared geometry, plus narrow edges in the same draw call. */
export function MagicPaths3D({colors}:{colors:MagicPalette}){
 const geometry=useMemo(()=>{
  const g=new BufferGeometry(),positions:number[]=[],indices:number[]=[];
  const paths=routes.map((p,i)=>[...p,toPlaza([1,3,0][i])]);
  paths.forEach(points=>{
   const start=positions.length/3,n=points.length;
   for(let i=0;i<=40;i++){
    const t=i/40*(n-1),k=Math.min(n-2,Math.floor(t)),f=t-k,a=points[k],b=points[k+1];
    const x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1;
    for(const side of [-1,1]){
     const px=x-side*dz/length*.42,pz=z+side*dx/length*.42;
     positions.push(px,islandSurfaceHeight(px,pz)+.048,pz);
    }
    if(i){const h=start+(i-1)*2;indices.push(h,h+1,h+2,h+1,h+3,h+2);}
   }
  });
  g.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));g.setIndex(indices);g.computeVertexNormals();return g;
 },[]);
 return <mesh geometry={geometry} renderOrder={1}>
  <meshStandardMaterial color={colors.detail} {...MAGIC_MATERIALS.grass} side={FrontSide} polygonOffset polygonOffsetFactor={-1}/>
 </mesh>;
}
