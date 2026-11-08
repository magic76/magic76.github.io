/** Cloudflare Pages Function: private user feedback, checked server-side. */
const REPO="magic76/magic76.github.io";
const TYPES={bug:"Problem report",idea:"Feature suggestion",other:"General feedback"};
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const configured=env=>Boolean(typeof env?.FEEDBACK_GITHUB_TOKEN==="string"&&env.FEEDBACK_GITHUB_TOKEN.length>=20&&typeof env?.FEEDBACK_TURNSTILE_SECRET==="string"&&env.FEEDBACK_TURNSTILE_SECRET.length>=10&&typeof env?.FEEDBACK_TURNSTILE_SITE_KEY==="string"&&env.FEEDBACK_TURNSTILE_SITE_KEY.length>=10);
const limited=(value,max)=>typeof value==="string"&&value.trim().length<=max?value.trim():null;
export async function onRequestGet({env}){
 const enabled=configured(env);
 return reply({enabled,siteKey:enabled?env.FEEDBACK_TURNSTILE_SITE_KEY:null});
}
export async function onRequestPost({request,env}){
 if(!configured(env))return reply({error:"NOT_CONFIGURED"},503);
 const url=new URL(request.url);
 if(request.headers.get("origin")!==url.origin||request.headers.get("sec-fetch-site")==="cross-site")return reply({error:"ORIGIN_REJECTED"},403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))return reply({error:"INVALID_CONTENT_TYPE"},415);
 if(Number(request.headers.get("content-length")||"0")>6000)return reply({error:"TOO_LARGE"},413);
 let data;
 try{
  const raw=await request.text();
  if(raw.length>6000)return reply({error:"TOO_LARGE"},413);
  data=JSON.parse(raw);
 }catch{return reply({error:"INVALID_JSON"},400)}
 if(!data||typeof data!=="object"||Array.isArray(data))return reply({error:"INVALID_JSON"},400);
 if(data.website)return reply({error:"INVALID_SUBMISSION"},400);
 const kind=data.kind,message=limited(data.message,1500),contact=limited(data.contact??"",160),page=limited(data.page??"",160),captcha=limited(data.captcha,2048);
 if(!Object.hasOwn(TYPES,kind)||message===null||message.length<10||contact===null||
    (contact!==""&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))||
    page===null||(page!==""&&!/^\/[a-zA-Z0-9_\-/]*$/.test(page))||!captcha)return reply({error:"INVALID_SUBMISSION"},400);
 try{
  const verification=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
   method:"POST",body:new URLSearchParams({secret:env.FEEDBACK_TURNSTILE_SECRET,response:captcha}),signal:AbortSignal.timeout(10000)
  });
  const result=verification.ok?await verification.json():null;
  if(!result?.success||result.hostname!==url.hostname)return reply({error:"VERIFICATION_FAILED"},403);
  const summary=message.split(/\r?\n/).find(Boolean)?.replace(/[<>\r\n]/g," ").slice(0,75)||"Feedback";
  const quoted=message.replace(/\r/g,"").split("\n").map(line=>"> "+line).join("\n");
  const body=["### Feedback type",TYPES[kind],"### Submitted feedback",quoted,"### Source page",page||"(not provided)","### Contact (optional)",contact||"(not provided)","","_Submitted from the public Crew feedback form; review before routing to ux-auto._"].join("\n\n");
  const created=await fetch("https://api.github.com/repos/"+REPO+"/issues",{
   method:"POST",headers:{"Authorization":"Bearer "+env.FEEDBACK_GITHUB_TOKEN,"Accept":"application/vnd.github+json","Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"Crew-Web-Feedback"},
   body:JSON.stringify({title:"[user-feedback]["+kind+"] "+summary,body}),signal:AbortSignal.timeout(12000)
  });
  if(!created.ok)return reply({error:"SUBMISSION_UNAVAILABLE"},503);
  const issue=await created.json();
  if(!Number.isSafeInteger(issue.number)||issue.number<=0)return reply({error:"SUBMISSION_UNAVAILABLE"},503);
  return reply({ok:true,reference:"FB-"+issue.number},201);
 }catch{return reply({error:"SUBMISSION_UNAVAILABLE"},503)}
}
export function onRequest(){return new Response(null,{status:405,headers:{...headers,Allow:"GET, POST"}})}
