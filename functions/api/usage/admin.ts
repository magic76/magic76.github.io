import {verifyAccess} from "./report";
type Env=Parameters<typeof verifyAccess>[1];
export async function onRequestGet({request,env}:{request:Request;env:Env}){
 const authorized=await verifyAccess(request,env);
 return new Response(JSON.stringify({admin:authorized}),{status:200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
