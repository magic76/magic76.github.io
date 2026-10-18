/**
 * Invite-only, small-group book exchange board. Pages Functions: /api/books.
 * Bind BOOKS_DB (D1) and BOOKS_INVITE_CODE (secret) before enabling live mode.
 * This API intentionally stores no phone numbers, addresses, emails or payment data.
 */
const KINDS = new Set(["swap", "sell", "give", "want"]);
const STATES = new Set(["open", "reserved", "closed"]);
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
    const id = new URL(request.url).searchParams.get("postId");
    if(id) {
      if(!/^[0-9a-f-]{36}$/i.test(id)) return reply({error:"INVALID_POST"},400);
      const comments=await env.BOOKS_DB.prepare(
        "SELECT id,post_id AS postId,author,message,created_at AS createdAt FROM book_comments WHERE post_id=? ORDER BY created_at ASC LIMIT 100"
      ).bind(id).all();
      return reply({comments:comments.results||[]});
    }
    const posts=await env.BOOKS_DB.prepare(
      "SELECT id,author,title,description,kind,price,status,created_at AS createdAt,updated_at AS updatedAt, (SELECT count(*) FROM book_comments c WHERE c.post_id=p.id) AS commentCount FROM book_posts p ORDER BY created_at DESC LIMIT 100"
    ).all();
    return reply({posts:posts.results||[]});
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
      const kind=str(body.kind,10);
      const price=body.price === null || body.price === "" || body.price === undefined ? null : Number(body.price);
      if(!valid(author,20,2)||!valid(title,80,2)||description.length>600||!KINDS.has(kind)
        || (kind==="sell" && (!Number.isSafeInteger(price)||price<0||price>100000))
        || (kind!=="sell" && price!==null)) return reply({error:"INVALID_POST"},400);
      const id=crypto.randomUUID(),ownerToken=crypto.randomUUID()+crypto.randomUUID();
      const ownerHash=await hash(ownerToken);
      await env.BOOKS_DB.prepare(
        "INSERT INTO book_posts (id,author,title,description,kind,price,status,owner_hash) VALUES (?,?,?,?,?,?,?,?)"
      ).bind(id,author,title,description,kind,price,"open",ownerHash).run();
      return reply({id,ownerToken},201);
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
  } catch {return reply({error:"BOOKS_DATABASE_ERROR"},503);}
}
export async function onRequest() {
  return new Response(null,{status:405,headers:{Allow:"GET, POST",...noStore}});
}
