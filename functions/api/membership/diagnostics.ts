import {verifyAccess} from "../usage/report";
type Db={prepare(sql:string):{first():Promise<unknown>}};
type Env={CREW_AUTH_DB?:Db;CREW_USAGE_ACCESS_ISS?:string;CREW_USAGE_ACCESS_AUD?:string;CREW_USAGE_ADMIN_EMAIL?:string};
const expected=["crew_auth_users","crew_auth_identities","crew_auth_sessions","koolo_memberships","koolo_purchases","koolo_entitlement_events","koolo_usage_ledger","koolo_subscriptions","koolo_voice_sessions","koolo_account_link_challenges"];
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function onRequestGet({request,env}:{request:Request;env:Env}){
 if(!await verifyAccess(request,env))return response({error:"Forbidden"},403);
 if(!env.CREW_AUTH_DB)return response({database:"unavailable",tables:[]},503);
 const tables=[];
 for(const name of expected){
  try{
   await env.CREW_AUTH_DB.prepare("SELECT 1 FROM "+name+" LIMIT 1").first();
   tables.push({name,ready:true});
  }catch{tables.push({name,ready:false})}
 }
 return response({database:tables.every(t=>t.ready)?"ready":"incomplete",tables},tables.every(t=>t.ready)?200:503);
}
