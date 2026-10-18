const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {webcrypto}=require("node:crypto");
globalThis.crypto ||=webcrypto;
const load=file=>import("data:text/javascript;base64,"+Buffer.from(fs.readFileSync(path.join(__dirname,"..",file),"utf8")).toString("base64"));
const circle=load("functions/api/books.js"),photos=load("functions/api/circle/photo.js");
const base="https://www.3sssi.com",secret="a-long-enough-shared-invite-code",admin="a-separate-long-admin-code";
const req=(body,extra={})=>new Request(base+"/api/books",{method:"POST",headers:{"content-type":"application/json","origin":base,"x-crew-books-invite":secret,...extra},body:JSON.stringify(body)});
function mock(){
 const postList=new Map(),pictureList=new Map(),reports=[],comments=[],bucket=new Map();
 const db={
  prepare(sql){
   let args=[];return {bind(...values){args=values;return this},
    async all(){
     if(sql.startsWith("SELECT id,author,title"))return {results:[...postList.values()].map(({owner_hash,...x})=>x)};
     if(sql.startsWith("SELECT id,post_id AS postId FROM book_images"))return {results:[...pictureList.values()].map(x=>({id:x.id,postId:x.post_id}))};
     if(sql.startsWith("SELECT object_key AS objectKey FROM book_images WHERE post_id"))return {results:[...pictureList.values()].filter(x=>x.post_id===args[0]).map(x=>({objectKey:x.object_key}))};
     if(sql.startsWith("SELECT r.id,r.post_id"))return {results:reports.map(r=>({...r,postId:r.post_id,title:postList.get(r.post_id)?.title,author:postList.get(r.post_id)?.author}))};
     if(sql.startsWith("SELECT id,post_id"))return {results:comments.filter(x=>x.post_id===args[0])};
     throw Error("Mock SELECT: "+sql);
    },
    async first(){
     if(sql.startsWith("SELECT COUNT(*) AS count FROM book_images"))return {count:[...pictureList.values()].filter(x=>x.post_id===args[0]).length};
     if(sql.startsWith("SELECT object_key AS objectKey FROM book_images")){const p=pictureList.get(args[0]);return p?.post_id===args[1]?{objectKey:p.object_key}:null;}
     if(sql.startsWith("SELECT owner_hash"))return postList.get(args[0])||null;
     if(sql.startsWith("SELECT status")||sql.startsWith("SELECT id FROM book_posts"))return postList.get(args[0])||null;
     throw Error("Mock FIRST: "+sql);
    },
    async run(){
     if(sql.startsWith("INSERT INTO book_posts")){const [id,author,title,description,kindOld,kind,category,price,status,owner_hash]=args;postList.set(id,{id,author,title,description,kind,category,price,status,owner_hash,createdAt:new Date().toISOString(),commentCount:0});}
     else if(sql.startsWith("UPDATE book_posts SET author")){const [author,title,description,,kind,category,price,id]=args;Object.assign(postList.get(id),{author,title,description,kind,category,price});}
     else if(sql.startsWith("UPDATE book_posts SET status"))postList.get(args[1]).status=args[0];
     else if(sql.startsWith("INSERT INTO book_images")){const [id,post_id,object_key]=args;pictureList.set(id,{id,post_id,object_key});}
     else if(sql.startsWith("INSERT INTO book_reports")){const [id,post_id,reason]=args;reports.push({id,post_id,reason,createdAt:new Date().toISOString()});}
     else if(sql.startsWith("INSERT INTO book_comments")){const [id,post_id,author,message]=args;comments.push({id,post_id,author,message});postList.get(post_id).commentCount++;}
     else if(sql.startsWith("DELETE FROM book_reports")){for(let i=reports.length-1;i>=0;i--)if(reports[i].post_id===args[0])reports.splice(i,1);}
     else if(sql.startsWith("DELETE FROM book_comments")){for(let i=comments.length-1;i>=0;i--)if(comments[i].post_id===args[0])comments.splice(i,1);}
     else if(sql.startsWith("DELETE FROM book_images WHERE id"))pictureList.delete(args[0]);
     else if(sql.startsWith("DELETE FROM book_images")){for(const [id,p] of pictureList)if(p.post_id===args[0])pictureList.delete(id);}
     else if(sql.startsWith("DELETE FROM book_posts"))postList.delete(args[0]);
     else throw Error("Mock RUN: "+sql);
    }
   };
  },
  async batch(queries){for(const q of queries)await q.run();}
 };
 const r2={
  async put(key,data,options){bucket.set(key,{bytes:new Uint8Array(data),httpMetadata:options.httpMetadata});},
  async get(key){const obj=bucket.get(key);return obj?{body:new Blob([obj.bytes]).stream(),httpMetadata:obj.httpMetadata}:null;},
  async delete(key){bucket.delete(key);}
 };
 return {env:{BOOKS_DB:db,BOOKS_INVITE_CODE:secret,CIRCLE_ADMIN_CODE:admin,CIRCLE_IMAGES:r2},posts:postList,bucket};
}
test("owner can edit and delete; non-owner and unconfigured admin are blocked",async()=>{
 const {onRequestPost,onRequestGet}=await circle,{env,posts,bucket}=mock();
 const created=await onRequestPost({request:req({action:"post",author:"安安媽媽",title:"玩具一盒",description:"積木",kind:"give",category:"toys",price:null}),env});
 assert.equal(created.status,201);const {id,ownerToken}=await created.json();
 assert.equal((await onRequestPost({request:req({action:"edit",postId:id,ownerToken:"invalid",author:"安安媽媽"}),env})).status,403);
 const edited=await onRequestPost({request:req({action:"edit",postId:id,ownerToken,author:"安安媽媽",title:"已整理的積木",description:"可交換",kind:"swap",category:"toys",price:null}),env});
 assert.equal(edited.status,200);assert.equal(posts.get(id).title,"已整理的積木");
 const badAdmin=await onRequestPost({request:req({action:"moderateDelete",postId:id,adminCode:"wrong"}),env});
 assert.equal(badAdmin.status,403);
 assert.equal((await onRequestPost({request:req({action:"delete",postId:id,ownerToken}),env})).status,200);
 assert.equal(posts.size,0);assert.equal(bucket.size,0);
 const data=await(await onRequestGet({request:new Request(base+"/api/books",{headers:{"x-crew-books-invite":secret}}),env})).json();
 assert.equal(data.posts.length,0);
});
test("reports visible to admin only and can be moderated",async()=>{
 const {onRequestPost,onRequestGet}=await circle,{env}=mock();
 const created=await onRequestPost({request:req({action:"post",author:"晴晴媽媽",title:"週末分享",description:"活動",kind:"share",category:"events",price:null}),env});
 const {id}=await created.json();
 assert.equal((await onRequestPost({request:req({action:"report",postId:id,reason:"廣告內容不適合這個群組"}),env})).status,201);
 const normal=new Request(base+"/api/books?view=reports",{headers:{"x-crew-books-invite":secret}});
 assert.equal((await onRequestGet({request:normal,env})).status,403);
 const authorized=new Request(base+"/api/books?view=reports",{headers:{"x-crew-books-invite":secret,"x-crew-circle-admin-code":admin}});
 const result=await(await onRequestGet({request:authorized,env})).json();assert.equal(result.reports.length,1);
 assert.equal((await onRequestPost({request:req({action:"moderateDelete",postId:id,adminCode:admin}),env})).status,200);
});
test("private R2 images require invite, owner, type limit; max three per post",async()=>{
 const books=await circle,image=await photos,{env,bucket}=mock();
 const newPost=await books.onRequestPost({request:req({action:"post",author:"Emma媽媽",title:"三張照片",description:"分享",kind:"share",category:"life",price:null}),env});
 const {id,ownerToken}=await newPost.json();
 const jpeg=new Uint8Array([0xff,0xd8,0xff,...Array(40).fill(7)]);
 const upload=(token=ownerToken,content=jpeg,type="image/jpeg")=>new Request(base+"/api/circle/photo",{
  method:"POST",headers:{"origin":base,"x-crew-books-invite":secret,"x-crew-circle-post-id":id,"x-crew-circle-owner-token":token,"content-type":type},body:content
 });
 assert.equal((await image.onRequestPost({request:upload("wrong"),env})).status,403);
 assert.equal((await image.onRequestPost({request:upload(ownerToken,new Uint8Array(100).fill(8)),env})).status,415);
 const photoIds=[];
 for(let i=0;i<3;i++){const result=await image.onRequestPost({request:upload(),env});assert.equal(result.status,201);photoIds.push((await result.json()).photoId);}
 assert.equal((await image.onRequestPost({request:upload(),env})).status,409);
 assert.equal(bucket.size,3);
 const imageUrl=base+"/api/circle/photo?postId="+id+"&photoId="+photoIds[0];
 assert.equal((await image.onRequestGet({request:new Request(imageUrl),env})).status,401);
 const res=await image.onRequestGet({request:new Request(imageUrl,{headers:{"x-crew-books-invite":secret}}),env});
 assert.equal(res.status,200);assert.equal(res.headers.get("cache-control"),"private, no-store");
 const data=await(await books.onRequestGet({request:new Request(base+"/api/books",{headers:{"x-crew-books-invite":secret}}),env})).json();
 assert.equal(data.posts[0].photoIds.length,3);
 const removed=await image.onRequestDelete({request:new Request(base+"/api/circle/photo?photoId="+photoIds[0],{
  method:"DELETE",headers:{"origin":base,"x-crew-books-invite":secret,"x-crew-circle-post-id":id,"x-crew-circle-owner-token":ownerToken}
 }),env});assert.equal(removed.status,200);
 assert.equal(bucket.size,2);
});
