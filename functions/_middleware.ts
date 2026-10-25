/**
 * A root-only Cloudflare Pages Function. Avoid sending first-time English
 * visitors the Chinese SSG home and then waiting for JS to redirect them.
 * Every other URL keeps its existing static/SPA routing behavior.
 */
type CrewPagesContext={request:Request;next:()=>Promise<Response>};
const BOTS=/bot|crawl|spider|slurp|facebookexternalhit|twitterbot|whatsapp|telegrambot|discordbot|linkedinbot|googleother|bingpreview|lighthouse|headlesschrome|prerender/i;
const LOCALE_COOKIE="crew_ui_locale_v1";

function cookieLocale(cookieHeader:string|null):string|null{
 const entry=cookieHeader?.match(/(?:^|;\s*)crew_ui_locale_v1=([^;]*)/);
 if(!entry)return null;
 try{return decodeURIComponent(entry[1])}catch{return ""}
}
function firstLanguage(header:string|null):string{
 if(!header)return "";
 return header.split(",").map((item,index)=>{
  const [tag,...params]=item.trim().split(";");
  const raw=params.find(p=>p.trim().startsWith("q="));
  const quality=raw?Number(raw.trim().slice(2)):1;
  return {tag:tag.toLowerCase(),q:Number.isFinite(quality)&&quality>=0&&quality<=1?quality:0,index};
 }).filter(x=>x.tag&&x.q>0).sort((a,b)=>b.q-a.q||a.index-b.index)[0]?.tag||"";
}
export function shouldRedirectRootToEnglish(request:Request):boolean{
 const url=new URL(request.url);
 if(request.method!=="GET"||url.pathname!=="/"||BOTS.test(request.headers.get("user-agent")||""))return false;
 const preference=cookieLocale(request.headers.get("cookie"));
 // Never override a manual language choice, including a Chinese choice.
 if(preference!==null)return preference==="en";
 return /^en(?:-|$)/.test(firstLanguage(request.headers.get("accept-language")));
}
export async function onRequest({request,next}:CrewPagesContext):Promise<Response>{
 if(!shouldRedirectRootToEnglish(request))return next();
 const destination=new URL(request.url);
 destination.pathname="/en/";
 const headers=new Headers({
  Location:destination.toString(),
  Vary:"Accept-Language, Cookie",
  "Cache-Control":"private, no-store, max-age=0"
 });
 return new Response(null,{status:302,headers});
}
