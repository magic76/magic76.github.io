/** A one-shot probe for an already-failed Vite asset. Never import a URL from
 * arbitrary error text: only same-origin, fingerprinted build JS is allowed. */
const BUILD_CHUNK=/^\/assets\/build\/[^/?#]+\.js$/;

export function bustedChunkUrl(error:unknown,base:string,nonce:string):string|null{
 const message=String(error instanceof Error?error.message:error);
 const candidate=message.match(/(?:https?:\/\/[^\s"'<>()[\]]+|\/assets\/build\/[^\s"'<>()[\]]+)\.js(?:\?[^\s"'<>()[\]]*)?/i)?.[0];
 if(!candidate)return null;
 try{
  const url=new URL(candidate,base);
  if(url.origin!==new URL(base).origin||!BUILD_CHUNK.test(url.pathname))return null;
  url.searchParams.set("__crew_chunk_retry",nonce);
  return url.toString();
 }catch{return null;}
}

export async function retryFailedChunkOnce(error:unknown,nonce:string):Promise<boolean>{
 const url=bustedChunkUrl(error,window.location.href,nonce);
 if(!url)return false;
 try{
  // The original import() is permanently rejected in this document's module
  // map; this probes the fresh URL, but a full navigation is still required.
  // Static imports inside this chunk keep their unbusted URLs.
  await import(/* @vite-ignore */ url);
  return true;
 }catch{return false;}
}

/** First-visit rescue: if the optional PWA chunk itself failed, register the
 * worker without importing it. A newly installed worker claims this tab and
 * can repair poisoned static dependencies on the next navigation. */
export async function prepareChunkRecoveryWorker():Promise<void>{
 if(!(typeof navigator!=="undefined"&&"serviceWorker" in navigator))return;
 if(window.location.pathname.startsWith("/crew-app/")||
  !(window.location.protocol==="https:"||window.location.hostname==="localhost"))return;
 try{
  const sw=navigator.serviceWorker;
  const timeout=()=>new Promise<null>(resolve=>setTimeout(()=>resolve(null),2500));
  const registration=await Promise.race([sw.register("/sw.js",{scope:"/",updateViaCache:"none"}),timeout()]);
  if(!registration||sw.controller)return;
  await new Promise<void>(resolve=>{
   const finish=()=>{clearTimeout(timer);sw.removeEventListener("controllerchange",finish);resolve();};
   const timer=setTimeout(finish,2500);
   sw.addEventListener("controllerchange",finish,{once:true});
   if(sw.controller)finish();
  });
 }catch{/* Worker unavailable: the guarded navigation remains the fallback. */}
}
