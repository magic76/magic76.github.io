/** Persistent, device-local diversity memory. No API keys or chat transcripts. */
export type PuzzleKind="mystery"|"twenty";
type PuzzleHistoryRow={kind:PuzzleKind;category:string;name:string;key:string;summary:string};
const STORAGE_KEY="crew_play_puzzle_diversity_v2";
const MAX_HISTORY=50;
const themes={
 mystery:[
  {id:"logic",label:"logic paradox and a hidden condition"},
  {id:"time",label:"timing, order, or an apparently impossible chronology"},
  {id:"space",label:"perspective, location, or physical orientation"},
  {id:"identity",label:"mistaken roles, identity, or relationships"},
  {id:"work",label:"a surprising professional process or work practice"},
  {id:"technology",label:"a misunderstood gadget or everyday technology"},
  {id:"journey",label:"a journey, transit, luggage, or unexpected travel circumstance"},
  {id:"humor",label:"a playful but logically sound misinterpretation"}
 ],
 twenty:[
  {id:"animal",label:"an animal"},
  {id:"food",label:"food or an ingredient"},
  {id:"tool",label:"a hand tool or household object"},
  {id:"transport",label:"a vehicle or transport-related object"},
  {id:"nature",label:"a naturally occurring thing, plant, or landscape feature"},
  {id:"technology",label:"a gadget or technological product"},
  {id:"sport",label:"sports, leisure, or musical equipment"},
  {id:"special",label:"an unusual but recognizable real-world physical object"}
 ]
} as const;
let memory:PuzzleHistoryRow[]=[];
function storage(){
 try{return typeof localStorage!=="undefined"?localStorage:null}catch{return null}
}
function clean(v:unknown,max=210){return typeof v==="string"?v.slice(0,max).trim():""}
function normal(v:string){return v.toLowerCase().normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu,"")}
function lastIndex<T>(rows:T[],match:(row:T)=>boolean){for(let i=rows.length-1;i>=0;i--)if(match(rows[i]))return i;return -1}
function unique(history:PuzzleHistoryRow[]){
 const counts={mystery:0,twenty:0};const output:PuzzleHistoryRow[]=[];
 for(const row of history.slice().reverse()){
  if(counts[row.kind]>=MAX_HISTORY)continue;
  output.push(row);counts[row.kind]++;
 }
 return output.reverse();
}
export function historyFor(kind:PuzzleKind):PuzzleHistoryRow[]{
 const store=storage();
 if(store){
  try{
   const parsed=JSON.parse(store.getItem(STORAGE_KEY)||"[]") as unknown;
   if(Array.isArray(parsed)){
    memory=unique(parsed.filter((r):r is PuzzleHistoryRow=>Boolean(r&&typeof r==="object"&&
      (r.kind==="mystery"||r.kind==="twenty")&&typeof r.category==="string"&&
      typeof r.name==="string"&&typeof r.key==="string"&&typeof r.summary==="string"))
     .map(r=>({kind:r.kind,category:clean(r.category,30),name:clean(r.name,90),key:clean(r.key,120),summary:clean(r.summary)})));
   }
  }catch{/* Private browsing or legacy records: use in-memory history. */}
 }
 return memory.filter(row=>row.kind===kind);
}
export function rememberPuzzle(kind:PuzzleKind,category:string,name:string,key:string,summary:string){
 const previous=historyFor(kind);
 const all=memory.filter(row=>row.kind!==kind);
 const next=unique([...all,...previous,{kind,category:clean(category,30),name:clean(name,90),
  key:clean(key,120),summary:clean(summary)}]);
 memory=next;
 try{storage()?.setItem(STORAGE_KEY,JSON.stringify(next))}catch{/* Play continues if storage is unavailable. */}
}
export function nextPuzzleTheme(kind:PuzzleKind,attempt=0){
 const options=themes[kind];
 const recent=historyFor(kind).slice(-12);
 const scored=options.map((theme,index)=>{
  const last=lastIndex(recent,r=>r.category===theme.id);
  const used=recent.filter(r=>r.category===theme.id).length;
  return {theme,index,score:used*100+(last<0?-100:last)};
 });
 scored.sort((a,b)=>a.score-b.score||a.index-b.index);
 return scored[attempt%scored.length].theme;
}
export function recentPuzzleSummaries(kind:PuzzleKind,limit=12){
 return historyFor(kind).slice(-limit).map(r=>
  (kind==="mystery"?r.category+": "+r.key+" — "+r.summary:r.category+": "+r.name+" ("+r.key+")"));
}
function tokens(value:string){
 const words=value.toLowerCase().normalize("NFKC").match(/[a-z]{3,}|[\p{Script=Han}]{2,}/gu)||[];
 const stop=new Set(["the","and","with","from","into","that","this","person","someone","because","when","where","what","which","their","then","have","after","before","they","there","just"]);
 const out:string[]=[];
 for(const w of words){
  if(stop.has(w))continue;
  if(/[\p{Script=Han}]/u.test(w)){for(let i=0;i<w.length-1;i++)out.push(w.slice(i,i+2))}
  else out.push(w);
 }
 return new Set(out);
}
function overlap(a:string,b:string){
 const aa=tokens(a),bb=tokens(b);
 if(!aa.size||!bb.size)return 0;
 const both=[...aa].filter(k=>bb.has(k)).length;
 return both/Math.min(aa.size,bb.size);
}
/** AI-supplied mechanism/family keys catch paraphrased stories, while lexical
 * similarity catches near copies even when the model changes the metadata.
 * It is conservative, and intentionally makes no unsupported embedding claim.
 */
export function isNearDuplicate(kind:PuzzleKind,candidate:{name:string;key:string;summary:string}){
 const n=normal(candidate.name),k=normal(candidate.key),summary=normal(candidate.summary);
 return historyFor(kind).some(previous=>{
  const pn=normal(previous.name),pk=normal(previous.key),ps=normal(previous.summary);
  if(n&&pn&&(n===pn||(n.length>3&&pn.length>3&&(n.includes(pn)||pn.includes(n)))))return true;
  if(k&&pk&&(k===pk||(k.length>7&&pk.length>7&&overlap(candidate.key,previous.key)>=.85)))return true;
  if(summary&&ps&&(summary===ps||overlap(candidate.summary,previous.summary)>=.75))return true;
  return false;
 });
}
export function chooseFallbackPuzzle<T>(kind:PuzzleKind,items:T[],describe:(item:T)=>{name:string;key:string;summary:string},category="fallback"):T{
 if(!items.length)throw new Error("No fallback puzzles");
 const history=historyFor(kind);
 const ordered=items.map((item,index)=>{
  const data=describe(item);
  const key=normal(data.name);
  const latest=lastIndex(history,h=>normal(h.name)===key);
  return {item,index,latest,data};
 }).sort((a,b)=>a.latest-b.latest||a.index-b.index);
 const chosen=ordered[0];
 rememberPuzzle(kind,category,chosen.data.name,chosen.data.key,chosen.data.summary);
 return chosen.item;
}
