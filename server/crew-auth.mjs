/** Minimal server-side OAuth for Cloudflare Pages. Provider tokens are never stored. */
const ORIGIN="https://www.3sssi.com",NEW_ORIGIN="https://koolo.app",OAUTH="__Host-crew_oauth",SESSION="__Host-crew_session";
const MEMBER_TRIAL_LIMIT=3;
const TAIPEI_OFFSET_SECONDS=8*3600;
const taipeiDayStart=now=>Math.floor((now+TAIPEI_OFFSET_SECONDS)/86400)*86400-TAIPEI_OFFSET_SECONDS;
const TTL=30*86400,PROVIDERS=["google","github"],COOKIE="Path=/; Secure; HttpOnly; SameSite=Lax";
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
const go=(url,cookie)=>{const h=new Headers({"Location":url,"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY"});if(cookie)h.append("Set-Cookie",cookie);return new Response(null,{status:302,headers:h})};
const set=(name,value,age)=>name+"="+value+"; Max-Age="+age+"; "+COOKIE;
const read=(req,name)=>(req.headers.get("Cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(name+"="))?.slice(name.length+1)||"";
const requestOrigin=req=>{const origin=new URL(req.url).origin;return origin===ORIGIN||origin===NEW_ORIGIN?origin:null};
const validHost=req=>Boolean(requestOrigin(req));
const b64=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const digest=async s=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
const hash=async s=>Array.from(await digest(s),b=>b.toString(16).padStart(2,"0")).join("");
const equal=(a,b)=>typeof a==="string"&&typeof b==="string"&&a.length===b.length&&a.length>0&&Array.from(a).reduce((n,c,i)=>n|(c.charCodeAt(0)^b.charCodeAt(i)),0)===0;
function creds(env,p){
 const provider=p==="google"?"GOOGLE":"GITHUB";
 // Accept both the already documented Crew names and the original setup
 // guide's GOOGLE_OAUTH_*/GITHUB_OAUTH_* secrets. Keep each pair together.
 for(const prefix of ["CREW_AUTH_"+provider,provider+"_OAUTH"]){
  const id=env?.[prefix+"_CLIENT_ID"],secret=env?.[prefix+"_CLIENT_SECRET"];
  if(typeof id==="string"&&id.trim()&&typeof secret==="string"&&secret.trim())
   return {id:id.trim(),secret:secret.trim()};
 }
 return null;
}
const callback=(p,origin=ORIGIN)=>origin+"/api/auth/"+p+"/callback";
const fail=(why,origin=ORIGIN)=>go(origin+"/account?auth_error="+why);
// Public diagnostic codes contain no credentials, account data, or provider errors.
const authStages=new Set(["state","token","profile","account","session"]);
// Only allow fixed, provider-neutral error identifiers. Never expose response bodies,
// OAuth codes, access tokens, or credentials to the browser or logs.
const oauthTokenReasons=new Set([
 "invalid_client","invalid_grant","invalid_request","unauthorized_client",
 "redirect_uri_mismatch","incorrect_client_credentials","bad_verification_code",
 "expired_token","unsupported_grant_type","provider_rejected","provider_unavailable",
 "provider_rate_limited","invalid_token_response","token_transport"
]);
const failStage=(bounce,provider,stage,tokenReason)=>{
 const reason=stage==="token"&&oauthTokenReasons.has(tokenReason)?tokenReason:null;
 console.warn("crew_auth_callback_failure",{provider,stage,...(reason?{reason}:{})});
 return bounce("failed",stage,reason);
};
export async function health({request,env}){
 if(!validHost(request))return json({error:"Not found"},404);
 const providers={google:Boolean(creds(env,"google")),github:Boolean(creds(env,"github"))};
 const result={providers,database:{binding:Boolean(env?.CREW_AUTH_DB),tables:{}}};
 if(!env?.CREW_AUTH_DB)return json(result,503);
 let allReady=true;
 // Check the database actually bound to Pages, not just the D1 Console DB.
 for(const table of ["crew_auth_users","crew_auth_identities","crew_auth_sessions"]){
  try{
   await env.CREW_AUTH_DB.prepare("SELECT 1 FROM "+table+" LIMIT 1").first();
   result.database.tables[table]=true;
  }catch{
   result.database.tables[table]=false;
   allReady=false;
  }
 }
 return json(result,allReady?200:503);
}
export async function start({request,env},provider){
 if(!validHost(request))return json({error:"Not found"},404);
 const origin=requestOrigin(request);
 const c=PROVIDERS.includes(provider)?creds(env,provider):null;
 if(!c||!env?.CREW_AUTH_DB)return fail("unavailable",origin);
 const state=random(),verifier=random(),challenge=b64(await digest(verifier));
 const q=new URLSearchParams({client_id:c.id,redirect_uri:callback(provider,origin),state,response_type:"code",code_challenge:challenge,code_challenge_method:"S256"});
 if(provider==="google")q.set("scope","openid email profile");
 const url=provider==="google"?"https://accounts.google.com/o/oauth2/v2/auth":"https://github.com/login/oauth/authorize";
 return go(url+"?"+q,set(OAUTH,state+"."+verifier+"."+provider,600));
}
async function exchange(provider,c,code,verifier,origin=ORIGIN){
 const q=new URLSearchParams({client_id:c.id,client_secret:c.secret,code,redirect_uri:callback(provider,origin),code_verifier:verifier});
 if(provider==="google")q.set("grant_type","authorization_code");
 const url=provider==="google"?"https://oauth2.googleapis.com/token":"https://github.com/login/oauth/access_token";
 let r;
 try{
  r=await fetch(url,{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/x-www-form-urlencoded"},body:q,redirect:"manual"});
 }catch{return {token:null,reason:"token_transport"}}
 // Cloudflare supports only 'follow' and 'manual'. Never follow a provider
 // redirect with credentials or accept a token in a 3xx response body.
 if(r.status>=300&&r.status<400)return {token:null,reason:"provider_rejected"};
 let body;
 try{body=await r.json()}catch{return {token:null,reason:"invalid_token_response"}}
 if(r.ok&&typeof body?.access_token==="string"&&body.access_token)
  return {token:body.access_token,reason:null};
 const known=typeof body?.error==="string"&&oauthTokenReasons.has(body.error)?body.error:null;
 return {token:null,reason:known||(r.status===429?"provider_rate_limited":r.status>=500?"provider_unavailable":r.ok?"invalid_token_response":"provider_rejected")};
}
async function profile(provider,token){
 const url=provider==="google"?"https://openidconnect.googleapis.com/v1/userinfo":"https://api.github.com/user";
 const r=await fetch(url,{headers:{"Authorization":"Bearer "+token,"Accept":"application/json",...(provider==="github"?{"User-Agent":"Crew-Web-Auth","X-GitHub-Api-Version":"2022-11-28"}:{})},redirect:"manual"});
 if(!r.ok)return null;
 const info=await r.json(),id=provider==="google"?info?.sub:info?.id;
 if(provider==="google"?(typeof id!=="string"||!id||id.length>180):(!Number.isSafeInteger(id)||id<=0))return null;
 return {id:String(id),name:String(info.name||info.login||"Crew member").trim().slice(0,100)||"Crew member",verifiedEmail:provider==="google"&&info.email_verified===true&&typeof info.email==="string"?info.email.trim().toLowerCase():null};
}
async function account(db,provider,p){
 let row=await db.prepare("SELECT user_id FROM crew_auth_identities WHERE provider=? AND provider_id=?").bind(provider,p.id).first();
 if(!row){
  const uid=crypto.randomUUID(),now=Math.floor(Date.now()/1000);
  await db.batch([
   db.prepare("INSERT INTO crew_auth_users(id,display_name,created_at) VALUES(?,?,?)").bind(uid,p.name,now),
   db.prepare("INSERT OR IGNORE INTO crew_auth_identities(provider,provider_id,user_id,created_at) VALUES(?,?,?,?)").bind(provider,p.id,uid,now)
  ]);
  row=await db.prepare("SELECT user_id FROM crew_auth_identities WHERE provider=? AND provider_id=?").bind(provider,p.id).first();
 }
 if(typeof row?.user_id!=="string")throw Error("Account unavailable");
 return row.user_id;
}
export async function callbackHandler({request,env},provider){
 if(!validHost(request))return json({error:"Not found"},404);
 const origin=requestOrigin(request);
 const h=new Headers({"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY"});
 h.append("Set-Cookie",set(OAUTH,"",0));
 const bounce=(reason,stage,tokenReason)=>{
  const dest=new URL(origin+"/account");
  dest.searchParams.set("auth_error",reason);
  if(authStages.has(stage))dest.searchParams.set("auth_stage",stage);
  if(stage==="token"&&oauthTokenReasons.has(tokenReason))
   dest.searchParams.set("auth_reason",tokenReason);
  h.set("Location",dest.toString());
  return new Response(null,{status:302,headers:h});
 };
 const args=new URL(request.url).searchParams,parts=read(request,OAUTH).split("."),code=args.get("code"),state=args.get("state");
 if(parts.length!==3||parts[2]!==provider||!PROVIDERS.includes(provider)||!equal(parts[0],state)||
    !/^[A-Za-z0-9_-]{43}$/.test(parts[1]||"")||!code||code.length>2048)
  return args.has("error")?bounce("cancelled"):failStage(bounce,provider,"state");
 const c=creds(env,provider);
 if(!c||!env?.CREW_AUTH_DB)return bounce("unavailable");
 let stage="token";
 try{
  const exchangeResult=await exchange(provider,c,code,parts[1],origin);
  if(!exchangeResult.token)return failStage(bounce,provider,stage,exchangeResult.reason);
  stage="profile";
  const info=await profile(provider,exchangeResult.token);
  if(!info)return failStage(bounce,provider,stage);
  stage="account";
  const uid=await account(env.CREW_AUTH_DB,provider,info);
  if(provider==="google"&&info.verifiedEmail){
   // Only Google-verified email is eligible for admin access; never trust a client claim.
   try{
    await env.CREW_AUTH_DB.prepare("INSERT INTO crew_auth_verified_emails(provider,provider_id,email,verified_at) VALUES(?,?,?,?) ON CONFLICT(provider,provider_id) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at")
     .bind("google",info.id,info.verifiedEmail,Math.floor(Date.now()/1000)).run();
   }catch{/* Migration may not be applied yet; keep ordinary sign-in working, admin access stays denied. */}
  }
  stage="session";
  const session=random(),now=Math.floor(Date.now()/1000);
  await env.CREW_AUTH_DB.prepare("INSERT INTO crew_auth_sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)")
   .bind(await hash(session),uid,now,now+TTL).run();
  h.set("Location",origin+"/account");h.append("Set-Cookie",set(SESSION,session,TTL));
  return new Response(null,{status:302,headers:h});
 }catch{return failStage(bounce,provider,stage)}
}
export async function sessionInfo({request,env}){
 if(!validHost(request))return json({error:"Not found"},404);
 const providers={google:Boolean(creds(env,"google")),github:Boolean(creds(env,"github"))};
 if(!env?.CREW_AUTH_DB||(!providers.google&&!providers.github))return json({enabled:false,providers:{google:false,github:false},user:null});
 const token=read(request,SESSION);let user=null;
 if(/^[A-Za-z0-9_-]{43}$/.test(token)){
  try{
   const row=await env.CREW_AUTH_DB.prepare("SELECT u.id AS id,u.display_name AS name,i.provider AS provider FROM crew_auth_sessions s JOIN crew_auth_users u ON u.id=s.user_id JOIN crew_auth_identities i ON i.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? ORDER BY i.created_at ASC LIMIT 1")
    .bind(await hash(token),Math.floor(Date.now()/1000)).first();
   if(row&&typeof row.id==="string"&&typeof row.name==="string")user={id:row.id,name:row.name,provider:row.provider};
  }catch{return json({enabled:false,providers:{google:false,github:false},user:null},503)}
 }
 let trial=null;
 if(user){
  try{
   const usage=await env.CREW_AUTH_DB.prepare("SELECT used,updated_at FROM crew_guest_usage WHERE user_id=?").bind(user.id).first();
   const updatedAt=Number(usage?.updated_at);
   const currentDay=Number.isFinite(updatedAt)&&updatedAt>=taipeiDayStart(Math.floor(Date.now()/1000));
   trial={used:currentDay?Math.max(0,Math.min(MEMBER_TRIAL_LIMIT,Number(usage?.used)||0)):0,
    limit:MEMBER_TRIAL_LIMIT,
    ...(currentDay&&Number(usage?.used)>0?{lastUsedAt:updatedAt}:{})};
  }catch{/* Phase 3 migration is optional until rollout; never break existing login. */}
 }
 let textTrial=null;
 if(user){
  try{
   const policy=await env.CREW_AUTH_DB.prepare("SELECT id FROM crew_free_quota_policy WHERE id=1").first();
   if(policy){
    const day=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
    const usage=await env.CREW_AUTH_DB.prepare("SELECT used FROM crew_guest_text_usage WHERE visitor_hash=? AND day=?").bind("member:"+user.id,day).first();
    textTrial={used:Math.max(0,Math.min(50,Number(usage?.used)||0)),limit:50};
   }
  }catch{/* No quota schema yet; do not invent a balance. */}
 }
 return json({enabled:true,providers,user,...(trial?{trial}:{}),...(textTrial?{textTrial}:{})});
}
export async function logout({request,env}){
 if(!validHost(request))return json({error:"Not found"},404);
 if(request.headers.get("Origin")!==requestOrigin(request)||request.headers.get("Sec-Fetch-Site")==="cross-site")return json({error:"Origin rejected"},403);
 const token=read(request,SESSION);
 if(env?.CREW_AUTH_DB&&/^[A-Za-z0-9_-]{43}$/.test(token)){
  try{await env.CREW_AUTH_DB.prepare("DELETE FROM crew_auth_sessions WHERE token_hash=?").bind(await hash(token)).run()}
  catch{return json({error:"Sign-out failed"},503)}
 }
 const r=json({ok:true});r.headers.append("Set-Cookie",set(SESSION,"",0));return r;
}
