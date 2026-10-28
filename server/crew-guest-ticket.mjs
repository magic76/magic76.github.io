/** Short-lived, non-replayable account assertion; never store provider tokens. */
const TTL_SECONDS=90;
const encoder=new TextEncoder();
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
async function macKey(secret){
 if(typeof secret!=="string"||secret.length<32)throw Error("Guest signer is unavailable");
 return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
export async function createGuestTicket(uid,secret){
 if(typeof uid!=="string"||!/^[-0-9a-f]{36}$/i.test(uid))throw Error("Invalid user");
 const body={v:1,sub:uid,nonce:encode(crypto.getRandomValues(new Uint8Array(32))),exp:Math.floor(Date.now()/1000)+TTL_SECONDS};
 const payload=encode(encoder.encode(JSON.stringify(body)));
 const sig=await crypto.subtle.sign("HMAC",await macKey(secret),encoder.encode(payload));
 return payload+"."+encode(new Uint8Array(sig));
}
