import {verifyAccess} from "./report";
type Db={prepare(sql:string):{bind(...values:unknown[]):{first():Promise<unknown>}}};
type Env={CREW_USAGE_ACCESS_ISS?:string;CREW_USAGE_ACCESS_AUD?:string;CREW_USAGE_ADMIN_EMAIL?:string;KOOLO_ADMIN_EMAILS?:string;CREW_AUTH_DB?:Db};
export async function onRequestGet({request,env}:{request:Request;env:Env}){
 const authorized=await verifyAccess(request,env);
 return new Response(JSON.stringify({admin:authorized}),{status:200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
