import {useMemo} from "react";
import {BufferAttribute,BufferGeometry,Color,DoubleSide} from "three";
import {islandSurfaceHeight} from "./magicNavigation";
import {MAGIC_MATERIALS,type MagicPalette} from "./magicPalette";

const RX=5.65*Math.sqrt(10),RZ=5.65*.84*Math.sqrt(10);
const N=48,RINGS=12;

/** The ground top is literally sampled from the same function used by character navigation.
 * Two opaque meshes, no realtime shadows and no separate rock top overlapping grass.
 */
export function MagicTerrain3D({colors}:{colors:MagicPalette}){
 const {grass,cliffs}=useMemo(()=>{
  const grass=new BufferGeometry(),gp:number[]=[],gn:number[]=[];
  const row=(r:number,a:number)=>[Math.cos(a)*RX*r,Math.sin(a)*RZ*r] as const;
  for(let j=0;j<=RINGS;j++){
   const r=.985*j/RINGS;
   for(let k=0;k<=N;k++){
    const a=k/N*Math.PI*2,[x,z]=row(r,a);
    gp.push(x,islandSurfaceHeight(x,z),z);
   }
  }
  for(let j=0;j<RINGS;j++)for(let k=0;k<N;k++){
   const a=j*(N+1)+k,b=a+N+1;
   gn.push(a,a+1,b,b,a+1,b+1);
  }
  grass.setAttribute("position",new BufferAttribute(new Float32Array(gp),3));
  grass.setIndex(gn);grass.computeVertexNormals();
  // Cliffs follow the land rim at the top; lower rings taper toward a rock tip.
  const cliffs=new BufferGeometry(),cp:number[]=[],cc:number[]=[],ci:number[]=[];
  const layers=[{r:.985,y:0},{r:.985,y:-.30},{r:.86,y:-1.08},{r:.54,y:-2.1},{r:.14,y:-3.4}];
  const rock=new Color(colors.side),rim=rock.clone().lerp(new Color("#C6B3A5"),.32),deep=rock.clone().multiplyScalar(.64);
  layers.forEach((layer,j)=>{
   for(let k=0;k<=N;k++){
    const a=k/N*Math.PI*2;
    const jag=1+.023*Math.sin(k*3.7)+.014*Math.sin(k*8.3);
    const x=Math.cos(a)*RX*layer.r*jag,z=Math.sin(a)*RZ*layer.r*jag;
    cp.push(x,j===0?islandSurfaceHeight(Math.cos(a)*RX*.985,Math.sin(a)*RZ*.985)-.035:layer.y,z);
    const c=j===0?rim:j<3?rock:deep;
    cc.push(c.r,c.g,c.b);
   }
  });
  for(let j=0;j<layers.length-1;j++)for(let k=0;k<N;k++){
   const a=j*(N+1)+k,b=a+N+1;ci.push(a,a+1,b,a+1,b+1,b);
  }
  cliffs.setAttribute("position",new BufferAttribute(new Float32Array(cp),3));
  cliffs.setAttribute("color",new BufferAttribute(new Float32Array(cc),3));
  cliffs.setIndex(ci);cliffs.computeVertexNormals();
  return {grass,cliffs};
 },[colors.side]);
 // Dispose old geometries on biome change / unmount.
 // R3F owns geometry cleanup when detached.
 return <group>
  <mesh geometry={cliffs}>
   <meshStandardMaterial vertexColors {...MAGIC_MATERIALS.stone} side={DoubleSide}/>
  </mesh>
  <mesh geometry={grass}>
   <meshStandardMaterial color={colors.ground} {...MAGIC_MATERIALS.grass} side={DoubleSide}/>
  </mesh>
 </group>;
}
