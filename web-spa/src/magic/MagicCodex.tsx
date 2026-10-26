import {useEffect,useId,useState} from "react";
import {useMagicT} from "./useMagicT";
import {MAGIC_REACTIONS} from "./magicReactions";
import {readMagicCodex,recordMagicReaction,subscribeMagicCodex} from "./magicCodexStore";
export function MagicCodex(){
 const {t}=useMagicT(),[found,setFound]=useState<string[]>(()=>readMagicCodex().found.map(x=>x.id)),[open,setOpen]=useState(false);
 const id=useId();useEffect(()=>subscribeMagicCodex(()=>setFound(readMagicCodex().found.map(x=>x.id))),[]);
 return <section className="magic-codex"><button type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{t("Magic Codex")} {found.length}/{MAGIC_REACTIONS.length}</button>
 {open&&<div id={id} className="magic-codex-content"><p>{t("Discovered {{count}} of {{total}}",{count:found.length,total:MAGIC_REACTIONS.length})}</p><progress max={MAGIC_REACTIONS.length} value={found.length}/>
 <ul role="list">{MAGIC_REACTIONS.map(r=>{const yes=found.includes(r.id);return <li key={r.id} aria-label={yes?t(r.id):t("Locked reaction")}><strong>{yes?t(r.id):"???"}</strong><p>{t(yes?r.id+" description":r.id+" hint")}</p></li>})}</ul></div>}
 </section>
}
export function MagicReactionToast({announce}:{announce:(message:string)=>void}){
 const {t}=useMagicT(),[list,setList]=useState<string[]>([]);
 useEffect(()=>{const onReaction=(ev:Event)=>{const id=(ev as CustomEvent<{id?:unknown}>).detail?.id;
  if(typeof id!=="string"||!MAGIC_REACTIONS.some(r=>r.id===id)||!recordMagicReaction(id))return;
  setList(old=>[...old,id]);announce(t("New magic discovered! {{name}}",{name:t(id)}));};
 window.addEventListener("crew-magic-reaction",onReaction);return()=>window.removeEventListener("crew-magic-reaction",onReaction)},[announce,t]);
 useEffect(()=>{if(!list.length)return;const timer=window.setTimeout(()=>setList(old=>old.slice(1)),3200);return()=>clearTimeout(timer)},[list]);
 return <div className="magic-reaction-toast" aria-hidden="true">{list[0]&&<div>✨ {t("New magic discovered!")} {t(list[0])}</div>}</div>
}
