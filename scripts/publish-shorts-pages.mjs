#!/usr/bin/env node
/**
 * Publish an approved Crew Shorts seed to first-party Cloudflare Pages assets.
 * No R2 account, extra tokens, AI calls or browser-side bundling are required.
 *
 * node scripts/publish-shorts-pages.mjs --dry-run
 * node scripts/publish-shorts-pages.mjs --feed content/crew-shorts/approved/posts.json --as-of 2026-10-15
 */
import {createHash} from "node:crypto";
import {existsSync, readFileSync, realpathSync, statSync, mkdirSync, writeFileSync, copyFileSync} from "node:fs";
import {dirname,join,resolve,sep} from "node:path";
import {createShortsArchive} from "./shorts-v2.mjs";

const get=(key,fallback)=>{
 const i=process.argv.indexOf("--"+key);
 if(i===-1)return fallback;
 const v=process.argv[i+1];
 if(!v||v.startsWith("--"))throw Error("Missing --"+key+" value");
 return v;
};
const fail=message=>{throw Error("Crew Shorts Pages: "+message)};
const requireValid=(ok,message)=>{if(!ok)fail(message)};
const dryRun=process.argv.includes("--dry-run");
const feedFile=resolve(get("feed","content/crew-shorts/approved/posts.json"));
const outDir=resolve(get("out-dir","features/teacher/shorts"));
const asOf=get("as-of",new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()));
requireValid(/^\d{4}-\d{2}-\d{2}$/.test(asOf)&&new Date(asOf+"T00:00:00Z").toISOString().slice(0,10)===asOf,"invalid release date");
// Dry runs simulate the full editorial day. Real publications never expose a
// post scheduled after the current instant, even when manually dispatched early.
const dayEndMs=Date.parse(asOf+"T23:59:59.999+08:00");
const releaseCutoffMs=dryRun?dayEndMs:Math.min(dayEndMs,Date.now());
requireValid(existsSync(feedFile),"approved posts.json missing; original seed pack and WebP images must be imported first");
const srcDir=realpathSync(dirname(feedFile));
const source=JSON.parse(readFileSync(feedFile,"utf8"));
requireValid(source.schema===1&&source.kind==="crew-shorts"&&(source.source==="seed"||source.source==="daily"),"source must be an approved seed or daily feed");
requireValid(Array.isArray(source.posts)&&source.posts.length>0&&source.posts.length<=50000,"approved feed must contain 1–100 posts");
const friends=new Set(["zoe","noah","iris","max","yuna","felix","luna","theo","isla","hugo","ada","finn","maya","oscar","bella","ryan"]);
const ids=new Set(),stories=new Map(),images=new Map(),posts=[];
const sha=bytes=>createHash("sha256").update(bytes).digest("hex").slice(0,24);
for(const item of source.posts){
 requireValid(item&&typeof item==="object","post is not an object");
 for(const k of ["id","friendId","friendName","caption","imageAlt","publishedAt","language","storyId"])
  requireValid(typeof item[k]==="string"&&item[k].trim(),"post missing "+k);
 requireValid(/^[a-zA-Z0-9][\w-]{2,95}$/.test(item.id),"invalid post id");
 requireValid(!ids.has(item.id),"duplicate id "+item.id);ids.add(item.id);
 requireValid(friends.has(item.friendId),"unknown friend "+item.friendId);
 requireValid(item.friendName.length<=65&&item.caption.length<=500&&item.imageAlt.length<=180&&item.storyId.length<=110,"post exceeds text limits "+item.id);
 requireValid(/^[a-z]{2}(?:-[A-Za-z]{2,5})?$/.test(item.language),"invalid language "+item.id);
 requireValid(Number.isFinite(Date.parse(item.publishedAt)),"invalid publishedAt "+item.id);
 requireValid(item.translationZh===undefined||(typeof item.translationZh==="string"&&item.translationZh.length<=500),"invalid translation "+item.id);
 requireValid(item.storyContext===undefined||(typeof item.storyContext==="string"&&item.storyContext.length<=650),"invalid story context "+item.id);
 const owner=stories.get(item.storyId);
 requireValid(!owner||owner===item.friendId,"story belongs to a different friend "+item.id);
 stories.set(item.storyId,item.friendId);
 if(Date.parse(item.publishedAt)>releaseCutoffMs)continue;
 requireValid(typeof item.image==="string"&&/^(?:media\/)?[A-Za-z0-9][A-Za-z0-9_.\/-]*\.webp$/i.test(item.image)
  &&!item.image.split("/").includes(".."),"due post needs a relative local WebP file "+item.id);
 const imagePath=realpathSync(resolve(srcDir,item.image));
 requireValid(imagePath.startsWith(srcDir+sep)&&statSync(imagePath).isFile(),"image outside approved seed "+item.id);
 const bytes=readFileSync(imagePath);
 requireValid(bytes.length>=16&&bytes.length<=350*1024,"image must be 16B–350KiB "+item.id);
 requireValid(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP","invalid WebP signature "+item.id);
 const filename=sha(bytes)+".webp";
 images.set(filename,imagePath);
 posts.push({...item,image:"/features/teacher/shorts/media/"+filename});
}
posts.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id));
const legacyPosts=posts.slice(0,100);
const generatedAt=asOf+"T00:00:00+08:00";
const archive=createShortsArchive(posts,{source:source.source,generatedAt});
const v2Dir=join(outDir,"v2");
const v2IndexFile=join(v2Dir,"index.json");
const sameJson=(path,value)=>{
 if(!existsSync(path))return false;
 try{return JSON.stringify(JSON.parse(readFileSync(path,"utf8")))===JSON.stringify(value)}
 catch{return false}
};
const archiveSame=sameJson(v2IndexFile,archive.index)&&archive.pages.every(page=>
 sameJson(join(v2Dir,"pages",page.file),page.data));

if(posts.length===0){console.log("No approved posts due on "+asOf+"; retaining existing feed.");process.exit(0)}
const dest=join(outDir,"posts.json");
let old=null;
if(existsSync(dest)){try{old=JSON.parse(readFileSync(dest,"utf8"))}catch{fail("existing published feed is not JSON; refuse to overwrite")}}
const same=old&&old.kind==="crew-shorts"&&old.source===source.source&&JSON.stringify(old.posts)===JSON.stringify(legacyPosts)
 &&[...images.keys()].every(filename=>existsSync(join(outDir,"media",filename)))&&archiveSame;
if(same){console.log("No feed changes: "+posts.length+" due posts. No deployment needed.");process.exit(0)}
const feed={schema:1,kind:"crew-shorts",source:source.source,generatedAt,posts:legacyPosts};
if(dryRun){
 console.log("DRY RUN: "+posts.length+" due posts, "+archive.pages.length+" v2 pages, "+images.size+" optimized images, date "+asOf);
 console.log(JSON.stringify(feed,null,2));
 process.exit(0);
}
// Write media first. The Git commit makes the new feed and media visible together.
const mediaDir=join(outDir,"media");
mkdirSync(mediaDir,{recursive:true});
for(const [filename,file] of images){
 const target=join(mediaDir,filename);
 if(!existsSync(target))copyFileSync(file,target);
 else requireValid(readFileSync(target).equals(readFileSync(file)),"media digest collision "+filename);
}
mkdirSync(outDir,{recursive:true});
writeFileSync(dest,JSON.stringify(feed,null,2)+String.fromCharCode(10));
mkdirSync(join(v2Dir,"pages"),{recursive:true});
for(const page of archive.pages)
 writeFileSync(join(v2Dir,"pages",page.file),JSON.stringify(page.data,null,2)+String.fromCharCode(10));
writeFileSync(v2IndexFile,JSON.stringify(archive.index,null,2)+String.fromCharCode(10));
console.log("Published "+posts.length+" approved posts ("+legacyPosts.length+" v1/latest, "+archive.pages.length+" v2 pages) and "+images.size+" referenced images in "+outDir);
