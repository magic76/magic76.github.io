/** Bounded in-memory lesson journal; caller supplies only allowlisted fields. */
const LIMIT=100;
const redact=text=>text.replace(/AIza[0-9A-Za-z_-]{30,}/g,"[redacted]").replace(/\b(?:sk|rk)-[A-Za-z0-9_-]{16,}/g,"[redacted]").replace(/\bBearer\s+[A-Za-z0-9._~-]{12,}/gi,"[redacted]").replace(/((?:api[_ -]?key|access[_ -]?token|authorization|password)\s*[:=]\s*)[^\s,;]+/gi,"$1[redacted]");
function bounded(value,depth=0){
 if(depth>7)return null;
 if(typeof value==="string")return redact(value.slice(0,8000));
 if(value===null||typeof value==="boolean"||typeof value==="number")return value;
 if(Array.isArray(value))return value.slice(0,32).map(v=>bounded(v,depth+1));
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).slice(0,32).filter(([key])=>!/^(api[_-]?key|authorization|password|access[_-]?token|cookie|secret)$/i.test(key)).map(([key,v])=>[key,bounded(v,depth+1)]));
 return null;
}
export function createBoardDiagnostics(now=()=>Date.now()){
 const start=now();let dropped=0,seq=0;const events=[];
 return {
  record(kind,data={},detail){
   const event={seq:++seq,ms:Math.max(0,now()-start),kind,data:bounded(data)};
   if(detail!==undefined)event.detail=bounded(detail);
   events.push(event);if(events.length>LIMIT){events.shift();dropped++;}
  },
  exportReport(includeContent,context={}){
   return {version:1,kind:"teacher-board-diagnostics",elapsedMs:Math.max(0,now()-start),includesContent:includeContent,dropped,context:bounded(context),events:events.map(({detail,...event})=>includeContent&&detail!==undefined?{...event,detail}:event)};
  }
 };
}
export function boardViewport(){
 if(typeof window==="undefined"||typeof document==="undefined")return null;
 const rect=selector=>{const element=document.querySelector(selector);if(!element)return null;const r=element.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),bottom:Math.round(r.bottom)}};
 return {width:window.innerWidth,height:window.innerHeight,visualHeight:window.visualViewport?.height??null,scrollY:window.scrollY,header:rect(".teaching-board-top"),stage:rect(".teaching-board-stage"),dock:rect(".teaching-board-quick"),voice:rect(".teaching-board-voice"),footer:rect(".teaching-board-footer")};
}
