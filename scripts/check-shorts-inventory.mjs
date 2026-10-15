#!/usr/bin/env node
/** Alert when approved Crew Shorts photos/captions run out; never synthesize unreviewed posts. */
import {readFileSync,appendFileSync} from "node:fs";
import {resolve} from "node:path";
const arg=(name,fallback)=>{
 const i=process.argv.indexOf("--"+name);
 return i<0?fallback:process.argv[i+1];
};
const file=resolve(arg("feed","content/crew-shorts/approved/posts.json"));
const today=arg("today",new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()));
if(!/^\d{4}-\d{2}-\d{2}$/.test(today))throw Error("Invalid editorial date");
const feed=JSON.parse(readFileSync(file,"utf8"));
if(feed.schema!==1||feed.kind!=="crew-shorts"||!Array.isArray(feed.posts)||!feed.posts.length)throw Error("No approved Shorts");
const latest=feed.posts.map(p=>p.publishedAt?.slice(0,10)).sort().at(-1);
if(!/^\d{4}-\d{2}-\d{2}$/.test(latest))throw Error("Invalid approved schedule");
const offset=Math.round((Date.parse(latest+"T00:00:00+08:00")-Date.parse(today+"T00:00:00+08:00"))/86400000);
const remaining=Math.max(0,offset);
const message="Crew Shorts approved queue: "+feed.posts.length+" posts, final release "+latest+" (Taipei), "+remaining+" future day(s) beyond today";
console.log(message);
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,message+"\n");
if(offset<=2)console.log("::warning::Crew Shorts approved content runs out on "+latest+". Add reviewed posts and WebP images before this date; publisher will retain existing feed.");
