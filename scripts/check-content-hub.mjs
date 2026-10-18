#!/usr/bin/env node
/** Offline gate across both public editorial pipelines, including future media contracts. */
import {readFileSync,existsSync} from "node:fs";
import {resolve,join} from "node:path";
import {asMomentRecord,asArticleRecord} from "./content-hub.mjs";
const root=resolve(import.meta.dirname,"..");
const read=path=>JSON.parse(readFileSync(join(root,path),"utf8"));
const approved=read("content/crew-shorts/approved/posts.json");
if(approved.schema!==1||approved.kind!=="crew-shorts"||!Array.isArray(approved.posts))throw Error("Invalid approved Shorts");
const shorts=new Set();
let scheduled=0;
for(const post of approved.posts){
 if(shorts.has(post.id))throw Error("Duplicate approved Shorts ID: "+post.id);
 shorts.add(post.id);
 const state=Date.parse(post.publishedAt)>Date.now()?"scheduled":"approved";
 asMomentRecord(post,state);
 if(state==="scheduled")scheduled++;
}
const researchIndex=read("web-spa/public/briefings/index.json");
if(!Array.isArray(researchIndex.days))throw Error("Invalid research index");
let articles=0;
const dates=new Set();
for(const day of researchIndex.days){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||dates.has(day))throw Error("Invalid research day: "+day);
 dates.add(day);
 const path="web-spa/public/briefings/"+day+".json";
 if(!existsSync(join(root,path)))throw Error("Missing research issue: "+path);
 const issue=read(path);
 if(issue.date!==day||!Array.isArray(issue.items))throw Error("Invalid research issue: "+day);
 const ids=new Set();
 for(const item of issue.items){
  if(ids.has(item.id))throw Error("Duplicate research item: "+day+"/"+item.id);
  ids.add(item.id);
  asArticleRecord(item,day);articles++;
 }
}
const publishedPath="features/teacher/shorts/posts.json";
let legacy=0;
if(existsSync(join(root,publishedPath))){
 const published=read(publishedPath);
 if(published.schema!==1||!Array.isArray(published.posts)||published.posts.length>100)throw Error("Invalid legacy Shorts feed");
 legacy=published.posts.length;
}
console.log("Crew Content Hub v2 validated: "+approved.posts.length+" approved/scheduled moments ("+scheduled+" scheduled), "+articles+" research items, "+legacy+" legacy public Shorts.");
