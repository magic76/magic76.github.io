import {useMemo} from 'react';
import {BufferAttribute,BufferGeometry,DoubleSide} from 'three';
import {islandSurfaceHeight} from './magicNavigation';
import {MAGIC_MATERIALS,type MagicPalette} from './magicPalette';
const routes=[
 [[0,2.5],[0,5],[2.5,7.5],[5.7,8.2],[8.8,7.5]],
 [[0,2.5],[-2,5.4],[-4.6,8],[-8.8,7.5]],
 [[0,2.5],[1.5,2.8],[5,2.1],[9.5,1.7],[12.2,1.9]],
];
/** All routes are stitched into a single geometry, one draw call. */
export function MagicPaths3D({colors}:{colors:MagicPalette}){
 const geometry=useMemo(()=>{
  const g=new BufferGeometry(),positions:number[]=[],indices:number[]=[];
  routes.forEach(points=>{
   const n=points.length;
   for(let i=0;i<=36;i++){
    const t=i/36*(n-1),k=Math.min(n-2,Math.floor(t)),f=t-k;
    const a=points[k],b=points[k+1];
    const x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;
    const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;
    for(const side of [-1,1]){
     const px=x-side*dz/l*.3,pz=z+side*dx/l*.3;
     positions.push(px,islandSurfaceHeight(px,pz)+.045,pz);
    }
    if(i){const h=positions.length/3-2;indices.push(h-2,h-1,h,h-1,h+1,h);}
   }
  });
  g.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));g.setIndex(indices);g.computeVertexNormals();return g;
 },[]);
 return <mesh geometry={geometry} renderOrder={1}>
  <meshStandardMaterial color={colors.detail} {...MAGIC_MATERIALS.grass} side={DoubleSide} polygonOffset polygonOffsetFactor={-1}/>
 </mesh>;
}
