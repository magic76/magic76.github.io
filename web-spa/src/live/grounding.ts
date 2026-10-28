/** Safe Gemini grounding citations: model-provided HTML is never rendered. */
export type GroundingSource={title:string;url:string};
type Obj=Record<string,unknown>;
const obj=(v:unknown):Obj=>v&&typeof v==="object"&&!Array.isArray(v)?v as Obj:{};
export function safeGroundingUrl(value:unknown):string|null{
 if(typeof value!=="string")return null;
 try{const url=new URL(value);return url.protocol==="https:"&&url.hostname?url.href:null}catch{return null}
}
/** Search Suggestions are returned by Google for required attribution. Display in a sandboxed frame. */
export function extractSearchSuggestions(value:unknown):string{
 const entry=obj(obj(value).searchEntryPoint);
 const html=entry.renderedContent||entry.rendered_content;
 return typeof html==="string"?html.slice(0,24000):"";
}
export function extractGroundingSources(value:unknown):GroundingSource[]{
 const meta=obj(value),chunks=Array.isArray(meta.groundingChunks)?meta.groundingChunks:Array.isArray(meta.grounding_chunks)?meta.grounding_chunks:[];
 const seen=new Set<string>(),sources:GroundingSource[]=[];
 for(const raw of chunks){
  const web=obj(obj(raw).web),url=safeGroundingUrl(web.uri||web.url);
  if(!url||seen.has(url))continue;
  seen.add(url);sources.push({url,title:String(web.title||new URL(url).hostname).slice(0,140)});
  if(sources.length===8)break;
 }
 return sources;
}
export function mergeGroundingSources(previous:GroundingSource[],incoming:GroundingSource[]){
 const seen=new Set<string>();return [...incoming,...previous].filter(v=>{if(seen.has(v.url))return false;seen.add(v.url);return true}).slice(0,12);
}
