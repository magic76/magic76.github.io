/** Private Feedback inbox. Independently validates Cloudflare Access JWT
 * even if the Access route is accidentally left unprotected.
 */
type Stmt={bind(...values:unknown[]):Stmt;all<T=Record<string,unknown>>():Promise<{results:T[]}>;first<T=Record<string,unknown>>():Promise<T|null>;run():Promise<{meta?:{changes?:number}}>};
type DB={prepare(sql:string):Stmt};
type Env={FEEDBACK_DB?:DB;CREW_USAGE_ACCESS_ISS?:string;CREW_USAGE_ACCESS_AUD?:string;CREW_USAGE_ADMIN_EMAIL?:string};
type Context={request:Request;env:Env};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const decode=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"=")),x=>x.charCodeAt(0));
async function authorized(request:Request,env:Env):Promise<boolean>{
 const issuer=env.CREW_USAGE_ACCESS_ISS?.replace(/\/+$/,"");
 const audience=env.CREW_USAGE_ACCESS_AUD;
 const email=env.CREW_USAGE_ADMIN_EMAIL?.toLowerCase();
 if(!issuer||!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)||!audience||!email)return false;
 const token=request.headers.get("cf-access-jwt-assertion");
 if(!token||token.length>16000)return false;
 const parts=token.split(".");
 if(parts.length!==3)return false;
 try{
  const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
  const payload=JSON.parse(new TextDecoder().decode(decode(parts[1])));
  const now=Date.now()/1000;
  if(header.alg!=="RS256"||typeof header.kid!=="string"||
   payload.iss!==issuer||!Array.isArray(payload.aud)||!payload.aud.includes(audience)||
   String(payload.email||"").toLowerCase()!==email||
   typeof payload.exp!=="number"||payload.exp<=now||
   (typeof payload.nbf==="number"&&payload.nbf>now))return false;
  const response=await fetch(issuer+"/cdn-cgi/access/certs");
  if(!response.ok)return false;
  const keys=await response.json() as {keys?:Array<JsonWebKey&{kid?:string}>};
  const jwk=keys.keys?.find(x=>x.kid===header.kid&&x.kty==="RSA");
  if(!jwk)return false;
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
 }catch{return false}
}
async function check(request:Request,env:Env):Promise<Response|null>{
 if(!await authorized(request,env))return respond({error:"Access denied"},403);
 if(!env.FEEDBACK_DB)return respond({error:"Database not configured"},503);
 return null;
}
export async function onRequestGet({request,env}:Context):Promise<Response>{
 const failed=await check(request,env);if(failed)return failed;
 const params=new URL(request.url).searchParams;
 const status=params.get("status")||"all";
 if(!["all","new","reviewed","closed"].includes(status))return respond({error:"Invalid filter"},400);
 const offsetRaw=params.get("offset")||"0";
 if(!/^\d{1,6}$/.test(offsetRaw))return respond({error:"Invalid offset"},400);
 const offset=Math.min(Number(offsetRaw),100000);
 try{
  const where=status==="all"?"":" WHERE status = ?";
  const stmt=env.FEEDBACK_DB!.prepare("SELECT id,kind,rating,reason,message,product,platform,page,role_id AS roleId,model,error_code AS errorCode,locale,build_version AS buildVersion,status,created_at AS createdAt FROM feedback"+where+" ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET ?");
  const rows=status==="all"?await stmt.bind(offset).all():await stmt.bind(status,offset).all();
  const countStmt=env.FEEDBACK_DB!.prepare("SELECT COUNT(*) AS total FROM feedback"+where);
  const count=status==="all"?await countStmt.first<{total:number}>():await countStmt.bind(status).first<{total:number}>();
  return respond({items:rows.results,total:count?.total||0,offset});
 }catch{return respond({error:"Unable to load feedback"},503)}
}
export async function onRequestPatch({request,env}:Context):Promise<Response>{
 const failed=await check(request,env);if(failed)return failed;
 const url=new URL(request.url);
 if(request.headers.get("origin")!==url.origin||request.headers.get("sec-fetch-site")==="cross-site")
  return respond({error:"Origin rejected"},403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))
  return respond({error:"JSON required"},415);
 let value:unknown;
 try{const raw=await request.text();if(raw.length>256)throw Error();value=JSON.parse(raw)}catch{return respond({error:"Invalid JSON"},400)}
 if(!value||typeof value!=="object"||Array.isArray(value))return respond({error:"Invalid payload"},400);
 const item=value as Record<string,unknown>;
 if(Object.keys(item).some(k=>!["id","status"].includes(k))||typeof item.id!=="string"||
   !/^[0-9a-f-]{36}$/i.test(item.id)||!["new","reviewed","closed"].includes(String(item.status)))
  return respond({error:"Invalid update"},400);
 try{
  const result=await env.FEEDBACK_DB!.prepare(
   "UPDATE feedback SET status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?"
  ).bind(item.status,item.id).run();
  if(!result.meta?.changes)return respond({error:"Feedback not found"},404);
  return respond({ok:true});
 }catch{return respond({error:"Unable to update feedback"},503)}
}
export async function onRequest(){return new Response(null,{status:405,headers:{Allow:"GET, PATCH","Cache-Control":"no-store"}})}
