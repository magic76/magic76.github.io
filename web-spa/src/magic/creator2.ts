import type {MagicCreatorColor,MagicLifeBlueprint} from "./world";

/** Creator 2 deliberately separates design intent from render geometry.
 * AI may select only these bounded semantic values. The renderer/compiler owns
 * every mesh, material, rig and executable behavior.
 */
export type MagicEntityArchetype="quadruped"|"humanoid"|"flying"|"machine"|"architecture";
export type MagicEntityStyle="sleek"|"sturdy"|"mystic";
export type MagicStructureRole="root"|"spine"|"chest"|"head"|"neck"|"hip"|"shoulder"|"limb"|"foot"|"tail"|"wing"|"core"|"tower"|"roof";
export type MagicStructureNode={
 id:string;role:MagicStructureRole;parent:string|null;
 at:readonly [number,number,number];radius:number;length:number;
 mirror?:boolean
};
export type MagicEntityBlueprint2={
 version:2;archetype:MagicEntityArchetype;style:MagicEntityStyle;palette:MagicCreatorColor;
 proportions:{body:number;head:number;limbs:number;tail:number;wings:number};
 silhouette:{stance:"low"|"neutral"|"tall";mass:"light"|"balanced"|"heavy"};
};
export type MagicStructureGraph={archetype:MagicEntityArchetype;nodes:MagicStructureNode[]};

const clamp=(n:number,min=.6,max=1.5)=>Math.max(min,Math.min(max,n));
const node=(id:string,role:MagicStructureRole,parent:string|null,at:readonly [number,number,number],radius:number,length:number,mirror=false):MagicStructureNode=>
 ({id,role,parent,at,radius,length,...(mirror?{mirror}: {})});

/** Compatibility adapter: old saves remain valid, but rendering can move to the
 * structure compiler instead of extending MagicCreatorPart forever. */
export function upgradeLegacyLifeBlueprint(b:MagicLifeBlueprint):MagicEntityBlueprint2{
 const archetype:MagicEntityArchetype=b.kind==="fox"?"quadruped":b.kind==="dragon"?"flying":"humanoid";
 return {version:2,archetype,style:b.style,palette:b.palette,
  proportions:{body:clamp(b.body),head:clamp(b.head),limbs:1,tail:clamp(b.tail),wings:clamp(b.wings)},
  silhouette:{stance:b.style==="sleek"?"tall":"neutral",mass:b.style==="sturdy"?"heavy":"balanced"}};
}

/** Compile semantic intent to a bounded skeleton/structure graph. No model can
 * submit coordinates, meshes, URLs, shader text or scripts to this graph. */
export function compileMagicStructure(b:MagicEntityBlueprint2):MagicStructureGraph{
 const p=b.proportions,heavy=b.silhouette.mass==="heavy"?1.18:b.silhouette.mass==="light"?.86:1;
 const tall=b.silhouette.stance==="tall"?1.18:b.silhouette.stance==="low"?.82:1;
 const r=.28*p.body*heavy;
 if(b.archetype==="quadruped")return {archetype:b.archetype,nodes:[
  node("root","root",null,[0,.72*tall,0],r,.2),node("spine","spine","root",[0,.78*tall,0],r,1.45*p.body),
  node("chest","chest","spine",[0,.84*tall,.42],r*1.2,.55),node("hip","hip","spine",[0,.72*tall,-.48],r*1.05,.45),
  node("neck","neck","chest",[0,1.02*tall,.72],r*.72,.55),node("head","head","neck",[0,1.16*tall,1.03],r*.92*p.head,.58*p.head),
  node("frontLeg","limb","chest",[.28,.58*tall,.38],r*.42,.78*p.limbs*tall,true),node("frontFoot","foot","frontLeg",[.28,.12,.48],r*.4,.32,true),
  node("rearLeg","limb","hip",[.3,.52*tall,-.48],r*.46,.82*p.limbs*tall,true),node("rearFoot","foot","rearLeg",[.3,.11,-.35],r*.42,.34,true),
  node("tail","tail","hip",[0,.78*tall,-.82],r*.55,1.35*p.tail)]};
 if(b.archetype==="flying")return {archetype:b.archetype,nodes:[
  ...compileMagicStructure({...b,archetype:"quadruped"}).nodes,
  node("wing","wing","chest",[.34,1.02*tall,.05],r*.28,1.8*p.wings,true)]};
 if(b.archetype==="humanoid")return {archetype:b.archetype,nodes:[
  node("root","root",null,[0,.9*tall,0],r,.2),node("spine","spine","root",[0,1.18*tall,0],r,1.05*p.body),
  node("chest","chest","spine",[0,1.45*tall,0],r*1.28,.68),node("head","head","chest",[0,1.95*tall,.02],r*.9*p.head,.5*p.head),
  node("arm","limb","chest",[.5,1.45*tall,0],r*.38,.95*p.limbs,true),node("leg","limb","root",[.25,.7*tall,0],r*.45,1.15*p.limbs*tall,true),
  node("foot","foot","leg",[.25,.08,.18],r*.45,.38,true)]};
 if(b.archetype==="machine")return {archetype:b.archetype,nodes:[
  node("root","root",null,[0,.62,0],r*1.3,.25),node("core","core","root",[0,.82,0],r*1.55,.9*p.body),
  node("shoulder","shoulder","core",[.55,.9,0],r*.5,.55,true),node("limb","limb","shoulder",[.75,.52,0],r*.38,.9*p.limbs,true),
  node("head","head","core",[0,1.42,.08],r*.82*p.head,.48)]};
 return {archetype:b.archetype,nodes:[
  node("root","root",null,[0,0,0],r*1.8,.25),node("core","core","root",[0,.48,0],r*1.65,.85*p.body),
  node("tower","tower","core",[0,1.15,0],r*1.25,1.6*p.body),node("roof","roof","tower",[0,2.05*p.body,0],r*1.7,.55),
  node("wing","wing","tower",[.7,1.1,0],r*.55,.9*p.wings,true)]};
}

export function validateMagicBlueprint2(value:unknown):value is MagicEntityBlueprint2{
 if(!value||typeof value!=="object")return false;
 const b=value as Partial<MagicEntityBlueprint2>,p=b.proportions,s=b.silhouette;
 const archetypes:MagicEntityArchetype[]=["quadruped","humanoid","flying","machine","architecture"];
 const styles:MagicEntityStyle[]=["sleek","sturdy","mystic"];
 const palettes:MagicCreatorColor[]=["gold","rose","azure","mint","violet","coral","ivory","slate"];
 const bounded=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)&&n>=.6&&n<=1.5;
 return b.version===2&&archetypes.includes(b.archetype as MagicEntityArchetype)&&styles.includes(b.style as MagicEntityStyle)&&
  palettes.includes(b.palette as MagicCreatorColor)&&!!p&&bounded(p.body)&&bounded(p.head)&&bounded(p.limbs)&&bounded(p.tail)&&bounded(p.wings)&&
  !!s&&["low","neutral","tall"].includes(s.stance as string)&&["light","balanced","heavy"].includes(s.mass as string);
}
