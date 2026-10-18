/**
 * Private photos for /circle, stored in R2. No public bucket URL.
 * GET uses the same invite header as posts; POST/DELETE require creator token.
 * Images are re-encoded by the client to strip original metadata before upload.
 */
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const idOk=value=>typeof value==="string"&&/^[0-9a-f-]{36}$/i.test(value);
const header=(req,name)=>req.headers.get(name)||"";
const authorized=({request,env})=>Boolean(env.BOOKS_DB&&env.BOOKS_INVITE_CODE?.length>=12&&header(request,"x-crew-books-invite")===env.BOOKS_INVITE_CODE);
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,"0")).join("");
const MAX_BYTES=750*1024;
const originOk=request=>{const url=new URL(request.url);return request.headers.get("origin")===url.origin&&request.headers.get("sec-fetch-site")!=="cross-site";};
async function isOwner(env,postId,token){
 if(!idOk(postId)||token.length<40||token.length>120)return false;
 const owner=await env.BOOKS_DB.prepare("SELECT owner_hash FROM book_posts WHERE id=?").bind(postId).first();
 return Boolean(owner?.owner_hash&&owner.owner_hash===await hash(token));
}
async function readLimited(request){
 if(Number(header(request,"content-length")||0)>MAX_BYTES)return null;
 if(!request.body)return null;
 const reader=request.body.getReader(),chunks=[];let length=0;
 try{
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;
   if(length>MAX_BYTES){await reader.cancel();return null;}chunks.push(value);}
 }finally{reader.releaseLock();}
 if(length<20)return null;
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return bytes;
}
function mediaType(bytes){
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return "image/jpeg";
 if(bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50)return "image/webp";
 return null;
}
export async function onRequestGet(context){
 if(!authorized(context))return reply({error:"INVITE_REQUIRED"},401);
 const {request,env}=context,params=new URL(request.url).searchParams;
 const postId=params.get("postId"),photoId=params.get("photoId");
 if(!idOk(postId)||!idOk(photoId))return reply({error:"INVALID_PHOTO"},400);
 if(!env.CIRCLE_IMAGES)return reply({error:"IMAGES_NOT_CONFIGURED"},503);
 try{
  const row=await env.BOOKS_DB.prepare("SELECT object_key AS objectKey FROM book_images WHERE id=? AND post_id=?").bind(photoId,postId).first();
  if(!row)return reply({error:"NOT_FOUND"},404);
  const object=await env.CIRCLE_IMAGES.get(row.objectKey);
  if(!object)return reply({error:"NOT_FOUND"},404);
  const type=object.httpMetadata?.contentType==="image/png"?"image/png":object.httpMetadata?.contentType==="image/jpeg"?"image/jpeg":"image/webp";
  return new Response(object.body,{headers:{"Content-Type":type,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"}});
 }catch{return reply({error:"MEDIA_UNAVAILABLE"},503);}
}
export async function onRequestPost(context){
 const {request,env}=context;
 if(!authorized(context))return reply({error:"INVITE_REQUIRED"},401);
 if(!originOk(request))return reply({error:"ORIGIN_REJECTED"},403);
 if(!env.CIRCLE_IMAGES)return reply({error:"IMAGES_NOT_CONFIGURED"},503);
 const postId=header(request,"x-crew-circle-post-id"),token=header(request,"x-crew-circle-owner-token");
 try{
  if(!await isOwner(env,postId,token))return reply({error:"NOT_OWNER"},403);
  const count=await env.BOOKS_DB.prepare("SELECT COUNT(*) AS count FROM book_images WHERE post_id=?").bind(postId).first();
  if(Number(count?.count||0)>=3)return reply({error:"PHOTO_LIMIT"},409);
  const bytes=await readLimited(request);if(!bytes)return reply({error:"PHOTO_TOO_LARGE"},413);
  const type=mediaType(bytes);
  if(!type||header(request,"content-type")!==type)return reply({error:"INVALID_IMAGE"},415);
  const id=crypto.randomUUID(),key="circle/"+postId+"/"+id+(type==="image/jpeg"?".jpg":".webp");
  await env.CIRCLE_IMAGES.put(key,bytes,{httpMetadata:{contentType:type}});
  try{
   await env.BOOKS_DB.prepare("INSERT INTO book_images(id,post_id,object_key) VALUES(?,?,?)").bind(id,postId,key).run();
  }catch(e){
   await env.CIRCLE_IMAGES.delete(key).catch(()=>{});
   if(/no such table/i.test(String(e)))return reply({error:"MEDIA_SCHEMA_REQUIRED"},503);
   throw e;
  }
  return reply({photoId:id},201);
 }catch{return reply({error:"MEDIA_UNAVAILABLE"},503);}
}
export async function onRequestDelete(context){
 const {request,env}=context;
 if(!authorized(context))return reply({error:"INVITE_REQUIRED"},401);
 if(!originOk(request))return reply({error:"ORIGIN_REJECTED"},403);
 if(!env.CIRCLE_IMAGES)return reply({error:"IMAGES_NOT_CONFIGURED"},503);
 const postId=header(request,"x-crew-circle-post-id"),token=header(request,"x-crew-circle-owner-token");
 const photoId=new URL(request.url).searchParams.get("photoId");
 if(!idOk(photoId))return reply({error:"INVALID_PHOTO"},400);
 try{
  if(!await isOwner(env,postId,token))return reply({error:"NOT_OWNER"},403);
  const row=await env.BOOKS_DB.prepare("SELECT object_key AS objectKey FROM book_images WHERE id=? AND post_id=?").bind(photoId,postId).first();
  if(!row)return reply({error:"NOT_FOUND"},404);
  await env.CIRCLE_IMAGES.delete(row.objectKey);
  await env.BOOKS_DB.prepare("DELETE FROM book_images WHERE id=? AND post_id=?").bind(photoId,postId).run();
  return reply({ok:true});
 }catch{return reply({error:"MEDIA_UNAVAILABLE"},503);}
}
export async function onRequest(){return new Response(null,{status:405,headers:{Allow:"GET, POST, DELETE"}});}
