const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {webcrypto}=require("node:crypto");
globalThis.crypto ||= webcrypto;
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"functions/api/books.js"),"utf8");
const imported=import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const url="https://www.3sssi.com/api/books";
const invite="test-very-long-invite-code";
const mkReq=(body,code=invite,origin=new URL(url).origin)=>new Request(url,{
 method:"POST",headers:{"x-crew-books-invite":code,"Content-Type":"application/json","origin":origin},
 body:JSON.stringify(body)
});
function createDb(){
 const posts=new Map(),comments=[];
 return {prepare(sql){
  let args=[];return {
   bind(...values){args=values;return this},
   async run(){
    if(sql.startsWith("INSERT INTO book_posts")){
     const [id,author,title,description,kind,price,status,owner_hash]=args;
     posts.set(id,{id,author,title,description,kind,price,status,owner_hash,createdAt:new Date().toISOString(),commentCount:0});
    } else if(sql.startsWith("INSERT INTO book_comments")){
     const [id,postId,author,message]=args;comments.push({id,postId,author,message,createdAt:new Date().toISOString()});
     posts.get(postId).commentCount++;
    } else if(sql.startsWith("UPDATE book_posts")){
     const [status,id]=args;posts.get(id).status=status;
    }else throw Error("Unrecognized SQL write: "+sql);
   },
   async all(){
    if(sql.startsWith("SELECT id,author,title"))return {results:Array.from(posts.values()).map(({owner_hash,...p})=>p)};
    if(sql.startsWith("SELECT id,post_id"))return {results:comments.filter(c=>c.postId===args[0])};
    throw Error("Unrecognized SQL read: "+sql);
   },
   async first(){
    if(sql.startsWith("SELECT status"))return posts.get(args[0])||null;
    if(sql.startsWith("SELECT owner_hash"))return posts.get(args[0])||null;
    throw Error("Unrecognized SQL lookup: "+sql);
   }
  };
 }};
}
test("book board is opt-in and never public-by-default",async()=>{
 const {onRequestGet,onRequestPost}=await imported;
 const req=new Request(url);
 assert.equal((await onRequestGet({request:req,env:{}})).status,503);
 const env={BOOKS_DB:createDb(),BOOKS_INVITE_CODE:invite};
 assert.equal((await onRequestGet({request:req,env})).status,401);
 assert.equal((await onRequestPost({request:mkReq({action:"post",author:"小安媽媽",title:"童書"},invite,"https://evil.example"),env})).status,403);
 assert.equal((await onRequestPost({request:mkReq({action:"post",author:"小安媽媽",title:"童書"},"wrong"),env})).status,401);
});
test("members can post, comment and close; only the creator controls status",async()=>{
 const {onRequestGet,onRequestPost}=await imported;
 const env={BOOKS_DB:createDb(),BOOKS_INVITE_CODE:invite};
 const first=await onRequestPost({request:mkReq({action:"post",author:"小安媽媽",title:"三本童書",description:"希望交換",kind:"swap",price:null}),env});
 assert.equal(first.status,201);const {id,ownerToken}=await first.json();assert.ok(id&&ownerToken);
 const req=new Request(url,{headers:{"x-crew-books-invite":invite}});
 const list=await (await onRequestGet({request:req,env})).json();
 assert.equal(list.posts.length,1);assert.equal(list.posts[0].owner_hash,undefined);
 const comment=await onRequestPost({request:mkReq({action:"comment",postId:id,author:"晴晴媽媽",message:"可以交換嗎？"}),env});
 assert.equal(comment.status,201);
 const threads=await(await onRequestGet({request:new Request(url+"?postId="+id,{headers:{"x-crew-books-invite":invite}}),env})).json();
 assert.equal(threads.comments[0].message,"可以交換嗎？");
 const bad=await onRequestPost({request:mkReq({action:"status",postId:id,ownerToken:"not-an-owner-token-that-can-ever-be-correct",status:"closed"}),env});
 assert.equal(bad.status,403);
 const good=await onRequestPost({request:mkReq({action:"status",postId:id,ownerToken,status:"closed"}),env});
 assert.equal(good.status,200);
 const closed=await onRequestPost({request:mkReq({action:"comment",postId:id,author:"晴晴媽媽",message:"還能換嗎？"}),env});
 assert.equal(closed.status,409);
});
test("private route has no main nav or indexable SEO page",()=>{
 const app=fs.readFileSync(path.join(root,"web-spa/src/App.tsx"),"utf8");
 const build=fs.readFileSync(path.join(root,"scripts/prepare-cloudflare.mjs"),"utf8");
 const routes=JSON.parse(fs.readFileSync(path.join(root,"_routes.json"),"utf8"));
 assert.match(app,/path="\/books"/);
 assert.match(app,/!pathname\.startsWith\("\/books"\)/);
 assert.ok(routes.include.includes("/api/books")&&routes.include.includes("/api/usage/*"));
 assert.match(build,/join\(out,"books","index\.html"\)/);
 assert.match(build,/Book pilot must remain noindex/);
 assert.ok(!fs.readFileSync(path.join(root,"sitemap.xml"),"utf8").includes("/books/"));
});
