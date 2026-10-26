import {useMagicT} from "./useMagicT";
import type {MagicWorld,MagicObjectKind} from './world';
import {OBJECT_ICONS,OBJECT_LABELS,magicCreationSummary} from './magicPresentation';
export function MagicCreatedList({world,zh,has3D,focusCreationId,onInteract,onFocus}:{
 world:MagicWorld;zh:boolean;has3D:boolean;focusCreationId:number|null;
 onInteract:(kind:MagicObjectKind)=>void;onFocus:(id:number)=>void;
}){
 const {t:tr}=useMagicT();
 
 return <>
  {has3D&&world.objects.length>0&&<section className="magic-3d-access" aria-label={tr("Objects in the world")}>
   <strong>{tr("Explore the creatures and objects")}</strong>
   <div>{world.objects.map(obj=><button type="button" key={obj.id} onClick={()=>onInteract(obj.kind)}>
    {OBJECT_ICONS[obj.kind]} {tr(OBJECT_LABELS[obj.kind][1])}
   </button>)}</div>
  </section>}
  <section className="magic-created-list" aria-label={tr("Your magic creations")}>
   <strong>{tr("Your creations")} · {world.creations.length}/3</strong>
   {world.creations.length>0?<div>{world.creations.map(c=><button key={c.id} type="button"
    onClick={()=>onFocus(c.id)} aria-pressed={focusCreationId===c.id}>
    {c.label}{magicCreationSummary(c,zh,tr)}
   </button>)}</div>:<p className="magic-created-empty">
    {tr("No creations yet. Try Sculpt a robot or tell Lumi what you imagine.")}
   </p>}
  </section>
 </>;
}
