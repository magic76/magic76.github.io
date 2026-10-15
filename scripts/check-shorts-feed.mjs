#!/usr/bin/env node
// Fast, offline gate for Crew Shorts JSON before CDN upload. No AI keys required.
import {readFileSync,existsSync} from "node:fs";
import {resolve} from "node:path";
const file=resolve(process.argv[2]||"features/teacher/shorts/posts.json");
const draft=process.argv.includes("--allow-drafts");
const known=new Set(["zoe","noah","iris","max","yuna","felix","luna","theo","isla","hugo","ada","finn","maya","oscar","bella","ryan"]);
const bad=message=>{throw Error("Crew Shorts: "+message)};
if(!existsSync(file))bad("file not found: "+file);
let root;
try{root=JSON.parse(readFileSync(file,"utf8"))}catch{bad("invalid JSON: "+file)}
if(root.schema!==1||root.kind!=="crew-shorts"||!Array.isArray(root.posts)||root.posts.length<1||root.posts.length>100)bad("invalid schema/posts");
const ids=new Set(),stories=new Map();
const httpsOrPath=value=>/^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(value)||/^\/(?!\/)(?!.*\.\.)[^\s]*$/.test(value);
for(const [index,post] of root.posts.entries()){
 const at="post["+(index+1)+"]";
 const req=["id","friendId","friendName","caption","imageAlt","publishedAt","language","storyId"];
 for(const field of req)if(typeof post?.[field]!=="string"||!post[field].trim())bad(at+" missing "+field);
 if(!/^[A-Za-z0-9][\w-]{2,95}$/.test(post.id))bad(at+" unsafe ID");
 if(!known.has(post.friendId))bad(at+" unknown friend "+post.friendId);
 if(ids.has(post.id))bad(at+" duplicate ID");ids.add(post.id);
 if(post.caption.length>500||post.imageAlt.length>180)bad(at+" exceeds text limit");
 if(post.translationZh!==undefined&&(typeof post.translationZh!=="string"||post.translationZh.length>500))bad(at+" invalid translationZh");
 if(post.storyContext!==undefined&&(typeof post.storyContext!=="string"||post.storyContext.length>650))bad(at+" invalid storyContext");
 if(!/^[a-z]{2}(?:-[A-Za-z]{2,5})?$/.test(post.language))bad(at+" invalid language");
 if(!Number.isFinite(Date.parse(post.publishedAt)))bad(at+" invalid publishedAt");
 if(post.image){
  if(typeof post.image!=="string"||!httpsOrPath(post.image))bad(at+" invalid HTTPS/path image");
 }else if(!draft)bad(at+" missing published image (use --allow-drafts only before photos exist)");
 const owner=stories.get(post.storyId);
 if(owner&&owner!==post.friendId)bad(at+" storyId reused across different friends");
 stories.set(post.storyId,post.friendId);
}
if(!draft&&root.source==="seed"&&root.posts.some(p=>p.image.includes("unsplash.com")))bad("seed media must not silently reuse Unsplash demo photos");
console.log("Crew Shorts "+(draft?"draft":"published")+" validated: "+root.posts.length+" posts / "+stories.size+" storylines / "+new Set(root.posts.map(x=>x.friendId)).size+" friends");
