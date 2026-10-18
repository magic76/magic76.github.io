/**
 * Invite-only, small-group family circle board (legacy /api/books endpoint retained for compatibility). Pages Functions: /api/books.
 * Bind BOOKS_DB (D1) and BOOKS_INVITE_CODE (secret) before enabling live mode.
 * This API intentionally stores no phone numbers, addresses, emails or payment data.
 */
const KINDS = new Set(["swap", "sell", "give", "want", "share", "ask"]);
const CATEGORIES = new Set(["books", "toys", "school", "clothes", "events", "life", "other"]);
// The pre-existing D1 kind column has a four-value CHECK constraint. Retain
// that representation while post_type carries the full new intent.
const legacyKind = kind => kind === "share" ? "give" : kind === "ask" ? "want" : kind;
const STATES = new Set(["open", "reserved", "closed"]);
const isUuid = id => /^[0-9a-f-]{36}$/i.test(id);
const adminAllowed = (request,env,body) => Boolean(
  typeof env.CIRCLE_ADMIN_CODE==="string"&&env.CIRCLE_ADMIN_CODE.length>=16 &&
  (request.headers.get("x-crew-circle-admin-code")||body?.adminCode)===env.CIRCLE_ADMIN_CODE
);
const owns = async (db,id,token) => {
  if(!isUuid(id)||!valid(token,120,40))return false;
  const row=await db.prepare("SELECT owner_hash FROM book_posts WHERE id=?").bind(id).first();
  return Boolean(row&&row.owner_hash===await hash(token));
};
const deletePost = async(env,id) => {
  const photos=await env.BOOKS_DB.prepare("SELECT object_key AS objectKey FROM book_images WHERE post_id=?").bind(id).all();
  // Clean associated rows explicitly; never rely on SQLite FK pragma.
  await env.BOOKS_DB.batch([
    env.BOOKS_DB.prepare("DELETE FROM book_reports WHERE post_id=?").bind(id),
    env.BOOKS_DB.prepare("DELETE FROM book_comments WHERE post_id=?").bind(id),
    env.BOOKS_DB.prepare("DELETE FROM book_images WHERE post_id=?").bind(id),
    env.BOOKS_DB.prepare("DELETE FROM book_posts WHERE id=?").bind(id)
  ]);
  if(env.CIRCLE_IMAGES)await Promise.allSettled((photos.results||[]).map(x=>env.CIRCLE_IMAGES.delete(x.objectKey)));
};
const limitReason = value => str(value,200);

const reply = (data, status=200) => new Response(JSON.stringify(data), {
  status, headers: {"Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff"}
});
const str = (value, max) => typeof value === "string" ? value.trim().slice(0,max+1) : "";
const valid = (value, max, min=1) => value.length >= min && value.length <= max;
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest(
  "SHA-256",new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,"0")).join("");
const configured = env => Boolean(env.BOOKS_DB && env.BOOKS_INVITE_CODE && env.BOOKS_INVITE_CODE.length >= 12);
function authorized(request,env) {
  return configured(env) && request.headers.get("x-crew-books-invite") === env.BOOKS_INVITE_CODE;
}
async function loadBody(request) {
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||"")) return null;
  if(Number(request.headers.get("content-length")||"0")>4096) return null;
  const raw=await request.text();
  if(raw.length>4096) return null;
  try { const data=JSON.parse(raw); return data && typeof data==="object" && !Array.isArray(data) ? data : null; }
  catch {return null;}
}
const noStore = {"Cache-Control":"no-store"};
export async function onRequestGet({request,env}) {
  if(!configured(env)) return reply({error:"BOOKS_NOT_CONFIGURED"},503);
  if(!authorized(request,env)) return reply({error:"INVITE_REQUIRED"},401);
  try {
    const params=new URL(request.url).searchParams;
    if(params.get("view")==="reports"){
      if(!adminAllowed(request,env))return reply({error:"ADMIN_REQUIRED"},403);
      const reports=await env.BOOKS_DB.prepare(
        "SELECT r.id,r.post_id AS postId,r.reason,r.created_at AS createdAt,p.title,p.author FROM book_reports r JOIN book_posts p ON p.id=r.post_id ORDER BY r.created_at DESC LIMIT 100"
      ).all();
      return reply({reports:reports.results||[]});
    }
    const id = params.get("postId");
    if(id) {
      if(!/^[0-9a-f-]{36}$/i.test(id)) return reply({error:"INVALID_POST"},400);
      const comments=await env.BOOKS_DB.prepare(
        "SELECT id,post_id AS postId,author,message,created_at AS createdAt FROM book_comments WHERE post_id=? ORDER BY created_at ASC LIMIT 100"
      ).bind(id).all();
      return reply({comments:comments.results||[]});
    }
    let posts;
    try { posts=await env.BOOKS_DB.prepare(
      "SELECT id,author,title,description,COALESCE(post_type,kind) AS kind,category,price,status,created_at AS createdAt,updated_at AS updatedAt, (SELECT count(*) FROM book_comments c WHERE c.post_id=p.id) AS commentCount FROM book_posts p ORDER BY created_at DESC LIMIT 100"
    ).all(); }
    catch {
      // Old D1 installations remain readable until migration 0002 runs.
      const legacy=await env.BOOKS_DB.prepare("SELECT id,author,title,description,kind,price,status,created_at AS createdAt,updated_at AS updatedAt, (SELECT count(*) FROM book_comments c WHERE c.post_id=p.id) AS commentCount FROM book_posts p ORDER BY created_at DESC LIMIT 100").all();
      return reply({posts:(legacy.results||[]).map(p=>({...p,category:"books"}))});
    }
    const result=posts.results||[];
    // Until 0003 is applied existing text-only posts remain readable.
    let images=[];
    try{const photos=await env.BOOKS_DB.prepare("SELECT id,post_id AS postId FROM book_images ORDER BY created_at ASC LIMIT 300").all();images=photos.results||[];}catch{/* upgrade not yet installed */}
    const byPost=new Map();
    for(const photo of images){const list=byPost.get(photo.postId)||[];list.push(photo.id);byPost.set(photo.postId,list);}
    return reply({posts:result.map(post=>({...post,photoIds:byPost.get(post.id)||[]}))});
  } catch {return reply({error:"BOOKS_DATABASE_ERROR"},503);}
}
export async function onRequestPost({request,env}) {
  if(!configured(env)) return reply({error:"BOOKS_NOT_CONFIGURED"},503);
  if(!authorized(request,env)) return reply({error:"INVITE_REQUIRED"},401);
  const url=new URL(request.url);
  const origin=request.headers.get("origin");
  if(origin!==url.origin || request.headers.get("sec-fetch-site")==="cross-site")
    return reply({error:"ORIGIN_REJECTED"},403);
  const body=await loadBody(request);
  if(!body) return reply({error:"INVALID_JSON"},400);
  const action=str(body.action,20);
  try {
    if(action==="post") {
      const author=str(body.author,20),title=str(body.title,80),description=str(body.description,600);
      const kind=str(body.kind,10),category=str(body.category||"books",12);
      const price=body.price === null || body.price === "" || body.price === undefined ? null : Number(body.price);
      if(!valid(author,20,2)||!valid(title,80,2)||description.length>600||!KINDS.has(kind)||!CATEGORIES.has(category)
        || (kind==="sell" && (!Number.isSafeInteger(price)||price<0||price>100000))
        || (kind!=="sell" && price!==null)) return reply({error:"INVALID_POST"},400);
      const id=crypto.randomUUID(),ownerToken=crypto.randomUUID()+crypto.randomUUID();
      const ownerHash=await hash(ownerToken);
      await env.BOOKS_DB.prepare(
        "INSERT INTO book_posts (id,author,title,description,kind,post_type,category,price,status,owner_hash) VALUES (?,?,?,?,?,?,?,?,?,?)"
      ).bind(id,author,title,description,legacyKind(kind),kind,category,price,"open",ownerHash).run();
      return reply({id,ownerToken},201);
    }
    if(action==="edit") {
      const id=str(body.postId,36),token=str(body.ownerToken,120);
      if(!await owns(env.BOOKS_DB,id,token))return reply({error:"NOT_OWNER"},403);
      const author=str(body.author,20),title=str(body.title,80),description=str(body.description,600);
      const kind=str(body.kind,10),category=str(body.category,12);
      const price=body.price===null||body.price===""||body.price===undefined?null:Number(body.price);
      if(!valid(author,20,2)||!valid(title,80,2)||description.length>600||!KINDS.has(kind)||!CATEGORIES.has(category)
      ||(kind==="sell"&&(!Number.isSafeInteger(price)||price<0||price>100000))||(kind!=="sell"&&price!==null))
        return reply({error:"INVALID_POST"},400);
      await env.BOOKS_DB.prepare(
        "UPDATE book_posts SET author=?,title=?,description=?,kind=?,post_type=?,category=?,price=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(author,title,description,legacyKind(kind),kind,category,price,id).run();
      return reply({ok:true});
    }
    if(action==="delete"||action==="moderateDelete"){
      const id=str(body.postId,36);
      if(!isUuid(id))return reply({error:"INVALID_POST"},400);
      const permitted=action==="moderateDelete" ? adminAllowed(request,env,body) : await owns(env.BOOKS_DB,id,str(body.ownerToken,120));
      if(!permitted)return reply({error:action==="moderateDelete"?"ADMIN_REQUIRED":"NOT_OWNER"},403);
      await deletePost(env,id);
      return reply({ok:true});
    }
    if(action==="report"){
      const id=str(body.postId,36),reason=limitReason(body.reason);
      if(!isUuid(id)||!valid(reason,200,5))return reply({error:"INVALID_REPORT"},400);
      const found=await env.BOOKS_DB.prepare("SELECT id FROM book_posts WHERE id=?").bind(id).first();
      if(!found)return reply({error:"NOT_FOUND"},404);
      // Keep the anonymous group pilot small. Moderators can inspect reports.
      await env.BOOKS_DB.prepare("INSERT INTO book_reports(id,post_id,reason) VALUES(?,?,?)")
        .bind(crypto.randomUUID(),id,reason).run();
      return reply({ok:true},201);
    }
    if(action==="comment") {
      const postId=str(body.postId,36),author=str(body.author,20),message=str(body.message,300);
      if(!/^[0-9a-f-]{36}$/i.test(postId)||!valid(author,20,2)||!valid(message,300,1)) return reply({error:"INVALID_COMMENT"},400);
      const target=await env.BOOKS_DB.prepare("SELECT status FROM book_posts WHERE id=?").bind(postId).first();
      if(!target) return reply({error:"NOT_FOUND"},404);
      if(target.status==="closed") return reply({error:"POST_CLOSED"},409);
      await env.BOOKS_DB.prepare(
        "INSERT INTO book_comments(id,post_id,author,message) VALUES(?,?,?,?)"
      ).bind(crypto.randomUUID(),postId,author,message).run();
      return reply({ok:true},201);
    }
    if(action==="status") {
      const postId=str(body.postId,36),ownerToken=str(body.ownerToken,120),status=str(body.status,10);
      if(!/^[0-9a-f-]{36}$/i.test(postId)||!valid(ownerToken,120,40)||!STATES.has(status))
        return reply({error:"INVALID_STATUS"},400);
      const owner=await env.BOOKS_DB.prepare("SELECT owner_hash FROM book_posts WHERE id=?").bind(postId).first();
      if(!owner || owner.owner_hash!==await hash(ownerToken))return reply({error:"NOT_OWNER"},403);
      await env.BOOKS_DB.prepare("UPDATE book_posts SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,postId).run();
      return reply({ok:true});
    }
    return reply({error:"UNKNOWN_ACTION"},400);
  } catch (error) {
    if(/no such column|has no column named/i.test(String(error)))return reply({error:"BOOKS_SCHEMA_UPGRADE_REQUIRED"},503);
    return reply({error:"BOOKS_DATABASE_ERROR"},503);
  }
}
export async function onRequest() {
  return new Response(null,{status:405,headers:{Allow:"GET, POST",...noStore}});
}
