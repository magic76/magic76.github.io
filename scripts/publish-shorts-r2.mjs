#!/usr/bin/env node
/**
 * Crew Shorts approved-content publisher.
 * - Dry-run does not need secrets or network access.
 * - Never generate AI content in the browser.
 * - Upload fingerprinted assets, immutable feed, backup current pointer,
 *   then switch the stable feed as the very last operation.
 *
 * node scripts/publish-shorts-r2.mjs --feed content/crew-shorts/approved/posts.json
 *   --origin https://media.3sssi.com --dry-run --as-of 2026-10-15
 */
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync, readFileSync, realpathSync, statSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from "node:fs";
import {basename, dirname, isAbsolute, join, relative, resolve, sep} from "node:path";
import {tmpdir} from "node:os";

function arg(name, fallback=""){
 const i=process.argv.indexOf("--"+name);
 if(i<0)return fallback;
 const v=process.argv[i+1];
 if(!v||v.startsWith("--"))throw Error("Missing --"+name+" value");
 return v;
}
const dryRun=process.argv.includes("--dry-run");
const inputFile=resolve(arg("feed","content/crew-shorts/approved/posts.json"));
const origin=arg("origin",process.env.CREW_SHORTS_MEDIA_ORIGIN||"").replace(/\/+$/,"");
const bucket=process.env.CREW_SHORTS_R2_BUCKET||"";
const account=process.env.CREW_SHORTS_R2_ACCOUNT_ID||"";
const output=arg("output","");
const asOf=arg("as-of",new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()));
const prefix="shorts";
const maxMediaBytes=350*1024;
const knownFriends=new Set(["zoe","noah","iris","max","yuna","felix","luna","theo","isla","hugo","ada","finn","maya","oscar","bella","ryan"]);
function check(ok,message){if(!ok)throw Error("Crew Shorts publish: "+message)}
check(/^\d{4}-\d{2}-\d{2}$/.test(asOf)&&new Date(asOf+"T00:00:00Z").toISOString().slice(0,10)===asOf,"invalid --as-of date");
check(/^https:\/\/[a-z0-9.-]+(?::443)?(?:\/[a-z0-9._/-]+)?$/i.test(origin)&&!origin.includes(".."),"public HTTPS --origin required");
check(existsSync(inputFile)&&statSync(inputFile).isFile(),"approved feed not found");
const source=JSON.parse(readFileSync(inputFile,"utf8"));
check(source.schema===1&&source.kind==="crew-shorts"&&(source.source==="seed"||source.source==="daily"),"source must be approved seed/daily Crew Shorts JSON");
check(Array.isArray(source.posts)&&source.posts.length>0&&source.posts.length<=100,"invalid post list (1..100)");
const ids=new Set(),storyOwners=new Map();
const folder=realpathSync(dirname(inputFile));
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const plannedMedia=new Map();
const selected=[];
for(const post of source.posts){
 check(post&&typeof post==="object","invalid post");
 for(const field of ["id","friendId","friendName","caption","imageAlt","publishedAt","language","storyId"]){
  check(typeof post[field]==="string"&&post[field].trim(),post.id+" missing "+field);
 }
 check(/^[a-z0-9][a-z0-9_-]{2,95}$/i.test(post.id),post.id+" invalid id");
 check(!ids.has(post.id),post.id+" duplicate id");ids.add(post.id);
 check(knownFriends.has(post.friendId),post.id+" invalid friend");
 check(post.friendName.length<=65&&post.caption.length<=500&&post.imageAlt.length<=180&&post.storyId.length<=110,post.id+" text too long");
 check(post.storyContext===undefined||(typeof post.storyContext==="string"&&post.storyContext.length<=650),post.id+" invalid story context");
 check(post.translationZh===undefined||(typeof post.translationZh==="string"&&post.translationZh.length<=500),post.id+" invalid translation");
 check(post.mediaCredit===undefined||(typeof post.mediaCredit==="string"&&post.mediaCredit.length<=160),post.id+" invalid credit");
 check(/^[a-z]{2}(?:-[A-Za-z]{2,5})?$/.test(post.language),post.id+" invalid language");
 check(!Number.isNaN(Date.parse(post.publishedAt)),post.id+" invalid time");
 const owner=storyOwners.get(post.storyId);
 check(!owner||owner===post.friendId,post.id+" mixed friend story");
 storyOwners.set(post.storyId,post.friendId);
 if(post.publishedAt.slice(0,10)>asOf)continue;
 const originalPath=post.image;
 check(typeof originalPath==="string"&&/^(?:media\/)?[a-zA-Z0-9][a-zA-Z0-9_.\/-]*\.webp$/.test(originalPath)&&!originalPath.split("/").includes(".."),
  post.id+" requires a local WebP image path (no external placeholder photo)");
 const mediaPath=resolve(folder,originalPath);
 const real=realpathSync(mediaPath);
 check(real.startsWith(folder+sep)&&statSync(real).isFile(),post.id+" unsafe media path");
 const bytes=readFileSync(real);
 check(bytes.length>=16&&bytes.length<=maxMediaBytes,post.id+" image must be 16 B..350 KiB");
 check(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP",
  post.id+" is not a real WebP file");
 const sha=digest(bytes).slice(0,24);
 const key=prefix+"/media/"+sha+".webp";
 plannedMedia.set(key,real);
 selected.push({...post,image:origin+"/"+key});
}
selected.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
if(!selected.length){
 console.log("No due approved Crew Shorts for "+asOf+". Leaving previously published feed unchanged.");
 process.exit(0);
}
const published={
 schema:1,kind:"crew-shorts",source:source.source,
 generatedAt:new Date().toISOString(),
 posts:selected
};
const json=JSON.stringify(published,null,2)+"\n";
const version=digest(json).slice(0,24);
const versionKey=prefix+"/feeds/"+asOf+"-"+version+".json";
const latestKey=prefix+"/posts.json";
if(output){
 const dest=resolve(output);
 mkdirSync(dirname(dest),{recursive:true});
 writeFileSync(dest,json);
}
console.log("Approved: "+source.posts.length+", due: "+selected.length+", unique images: "+plannedMedia.size);
console.log("Version: "+versionKey+"; live pointer: "+origin+"/"+latestKey);
if(dryRun){
 console.log("DRY RUN — R2 was not touched.");
 process.exit(0);
}
check(/^[a-f0-9]{32}$/.test(account),"CREW_SHORTS_R2_ACCOUNT_ID required");
check(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket),"CREW_SHORTS_R2_BUCKET required");
check(Boolean(process.env.AWS_ACCESS_KEY_ID&&process.env.AWS_SECRET_ACCESS_KEY),"R2 S3 credentials required");
const endpoint="https://"+account+".r2.cloudflarestorage.com";
const aws=(args,options={})=>execFileSync("aws",["--endpoint-url",endpoint,...args],{
 encoding:"utf8",stdio:["ignore","pipe","pipe"],maxBuffer:2*1024*1024,...options
});
function uploadFile(key,file,mime,cache){
 aws(["s3api","put-object","--bucket",bucket,"--key",key,
  "--body",file,"--content-type",mime,"--cache-control",cache]);
}
const temp=mkdtempSync(join(tmpdir(),"crew-shorts-publish-"));
try{
 // Media is immutable and content-addressed: unchanged pictures can be re-uploaded harmlessly.
 for(const [key,file] of plannedMedia)uploadFile(key,file,"image/webp","public, max-age=31536000, immutable");
 const manifestFile=join(temp,"new-feed.json");
 writeFileSync(manifestFile,json);
 uploadFile(versionKey,manifestFile,"application/json; charset=utf-8","public, max-age=31536000, immutable");
 // Confirm the R2 manifest exists before switching the stable pointer.
 aws(["s3api","head-object","--bucket",bucket,"--key",versionKey]);
 // Save prior live pointer as a rollback object. Only a genuine missing key is acceptable.
 const previousFile=join(temp,"prior-feed.json");
 let hadPrevious=false;
 try{
  aws(["s3api","get-object","--bucket",bucket,"--key",latestKey,previousFile]);
  hadPrevious=true;
 }catch(err){
  const stderr=String(err.stderr||"");
  if(!/NoSuchKey|404|Not Found/i.test(stderr))throw err;
 }
 if(hadPrevious){
  const backupKey=prefix+"/backups/"+new Date().toISOString().replace(/[:.]/g,"-")+"-"+digest(readFileSync(previousFile)).slice(0,16)+".json";
  uploadFile(backupKey,previousFile,"application/json; charset=utf-8","public, max-age=31536000, immutable");
  console.log("Prior feed backed up at "+backupKey);
 }
 // LAST step: atomic switch of the single stable public feed object.
 uploadFile(latestKey,manifestFile,"application/json; charset=utf-8","public, max-age=60, must-revalidate");
 console.log("PUBLISHED "+origin+"/"+latestKey+" ("+selected.length+" stories)");
}finally{rmSync(temp,{recursive:true,force:true})}
