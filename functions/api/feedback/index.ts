/** Anonymous, privacy-conscious feedback ingestion.
 * Only structured diagnostics approved by the sender are stored.
 * Never accept transcripts, prompts, recordings, IPs or API keys.
 */
type Stmt={bind(...values:unknown[]):Stmt;run():Promise<{meta?:{changes?:number}}>};
type DB={prepare(sql:string):Stmt};
type Env={FEEDBACK_DB?:DB;CREW_FEEDBACK_RATE_SECRET?:string};
type Context={request:Request;env:Env};
const kinds=["bug","idea","other","rating"] as const;
const products=["teacher","friend","play","story","shorts","site"] as const;
const reasons=["","wrong_language","repeated_question","interrupted","bad_response","connection","game_logic","other"] as const;
const allowed=new Set(["kind","rating","reason","message","product","platform","includeDiagnostics","page","roleId","model","errorCode","locale","buildVersion","website"]);
const respond=(body:unknown,status:number)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const isString=(v:unknown,max:number)=>typeof v==="string"&&v.length<=max;
function isAllowed<T extends string>(value:unknown,values:readonly T[]):value is T{
 return typeof value==="string"&&(values as readonly string[]).includes(value);
}
async function rateBucket(secret:string,ip:string):Promise<string>{
 const hour=new Date().toISOString().slice(0,13);
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signature=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(hour+":"+ip)));
 return hour+":"+Array.from(signature,b=>b.toString(16).padStart(2,"0")).join("");
}
export async function onRequestPost({request,env}:Context):Promise<Response>{
 if(!env.FEEDBACK_DB||!env.CREW_FEEDBACK_RATE_SECRET||env.CREW_FEEDBACK_RATE_SECRET.length<24)
  return respond({error:"Feedback service is not configured"},503);
 const current=new URL(request.url);
 const origin=request.headers.get("origin");
 if((origin&&origin!==current.origin)||request.headers.get("sec-fetch-site")==="cross-site")
  return respond({error:"Origin rejected"},403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))
  return respond({error:"JSON required"},415);
 if(Number(request.headers.get("content-length")||0)>5000)return respond({error:"Payload too large"},413);
 let value:Record<string,unknown>;
 try{
  const raw=await request.text();
  if(raw.length>5000)return respond({error:"Payload too large"},413);
  const parsed:unknown=JSON.parse(raw);
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw Error("Invalid payload");
  value=parsed as Record<string,unknown>;
 }catch{return respond({error:"Invalid JSON"},400)}
 if(Object.keys(value).some(k=>!allowed.has(k)))return respond({error:"Unknown field"},400);
 // Honeypot: return success but do not persist automated submissions.
 if(value.website)return respond({ok:true},201);
 if(!isAllowed(value.kind,kinds)||!isAllowed(value.product,products)||!["web","android"].includes(String(value.platform))||
  !isAllowed(value.reason??"",reasons)||!isString(value.message??"",1600)||
  (value.kind!=="rating"&&!(value.message as string||"").trim())||
  (value.kind==="rating"&&![1,5].includes(Number(value.rating)))||
  (value.kind!=="rating"&&value.rating!==undefined)||
  (value.includeDiagnostics!==undefined&&typeof value.includeDiagnostics!=="boolean"))
  return respond({error:"Invalid feedback"},400);
 const diagnostics=value.includeDiagnostics===true;
 const safe=(name:string,max:number,pattern:RegExp)=>{
  const v=diagnostics?value[name]??"":"";
  return isString(v,max)&&pattern.test(v)?v:null;
 };
 const page=safe("page",128,/^\/?[a-zA-Z0-9/_-]*$/);
 const roleId=safe("roleId",40,/^[a-zA-Z0-9_-]*$/);
 const model=safe("model",80,/^[a-zA-Z0-9_.-]*$/);
 const errorCode=safe("errorCode",64,/^[a-zA-Z0-9_-]*$/);
 const locale=safe("locale",20,/^[a-zA-Z0-9-]*$/);
 const version=safe("buildVersion",60,/^[a-zA-Z0-9_.-]*$/);
 if([page,roleId,model,errorCode,locale,version].some(x=>x===null))
  return respond({error:"Invalid diagnostics"},400);
 // Server-side atomic hourly limit. Only a rotating, salted HMAC is saved,
 // never the user's raw IP, user-agent, API key or conversation.
 const bucket=await rateBucket(env.CREW_FEEDBACK_RATE_SECRET,request.headers.get("CF-Connecting-IP")||"unknown");
 try{
  const rate=await env.FEEDBACK_DB.prepare(
   "INSERT INTO feedback_rate_limits(bucket,hits) VALUES (?1,1) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits<5"
  ).bind(bucket).run();
  if(!rate.meta?.changes)return respond({error:"Rate limit exceeded"},429);
  const id=crypto.randomUUID();
  await env.FEEDBACK_DB.prepare(
   "INSERT INTO feedback(id,kind,rating,reason,message,product,platform,page,role_id,model,error_code,locale,build_version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(id,value.kind,value.kind==="rating"?value.rating:null,value.reason??"",
   String(value.message??"").trim(),value.product,value.platform,page,roleId,model,errorCode,locale,version).run();
  // Opportunistic cleanup; the oldest rotating HMAC buckets have no use.
  if(Math.random()<0.05){
   try{await env.FEEDBACK_DB.prepare("DELETE FROM feedback_rate_limits WHERE created_at < datetime('now','-2 days')").run()}catch{/* best effort */}
  }
  return respond({ok:true,id},201);
 }catch{return respond({error:"Feedback temporarily unavailable"},503)}
}
export async function onRequest(){return new Response(null,{status:405,headers:{Allow:"POST","Cache-Control":"no-store"}})}
