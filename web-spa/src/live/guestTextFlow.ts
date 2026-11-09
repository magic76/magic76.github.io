/** One renewal at most. The Worker remains the authority for grants and quotas. */
export async function sendGuestTextWithRenewal<T extends {code?:string}>(options:{
 token:string;
 acquire:()=>Promise<string>;
 invalidate:()=>void;
 send:(token:string)=>Promise<T>;
}):Promise<T>{
 let token=options.token;
 for(let attempt=0;attempt<2;attempt++){
  if(!token)token=await options.acquire();
  const result=await options.send(token);
  if(result.code!=="SESSION_EXPIRED")return result;
  options.invalidate(); // Never send another request using the rejected grant.
  token="";
 }
 throw Error("SESSION_EXPIRED");
}
