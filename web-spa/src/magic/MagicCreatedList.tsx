import type {MagicWorld,MagicObjectKind} from './world';
import {OBJECT_ICONS,OBJECT_LABELS,magicCreationSummary} from './magicPresentation';
export function MagicCreatedList({world,zh,has3D,focusCreationId,onInteract,onFocus}:{
 world:MagicWorld;zh:boolean;has3D:boolean;focusCreationId:number|null;
 onInteract:(kind:MagicObjectKind)=>void;onFocus:(id:number)=>void;
}){
 const t=(a:string,b:string)=>zh?a:b;
 return <>
  {has3D&&world.objects.length>0&&<section className="magic-3d-access" aria-label={t('世界中的魔法物件','Objects in the world')}>
   <strong>{t('探索島上的魔法物件','Explore the creatures and objects')}</strong>
   <div>{world.objects.map(obj=><button type="button" key={obj.id} onClick={()=>onInteract(obj.kind)}>
    {OBJECT_ICONS[obj.kind]} {zh?OBJECT_LABELS[obj.kind][0]:OBJECT_LABELS[obj.kind][1]}
   </button>)}</div>
  </section>}
  <section className="magic-created-list" aria-label={t('已創造的魔法生命','Your magic creations')}>
   <strong>{t('你的造物','Your creations')} · {world.creations.length}/3</strong>
   {world.creations.length>0?<div>{world.creations.map(c=><button key={c.id} type="button"
    onClick={()=>onFocus(c.id)} aria-pressed={focusCreationId===c.id}>
    {c.label}{magicCreationSummary(c,zh)}
   </button>)}</div>:<p className="magic-created-empty">
    {t('還沒有造物。點「創造流線機器人」，或對 Lumi 說出你想要的生物。','No creations yet. Try Sculpt a robot or tell Lumi what you imagine.')}
   </p>}
  </section>
 </>;
}
