#!/usr/bin/env node
/** Read-only exact Bella/Shorts identity/prompt inspection. No AI, no API key, no files written. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadIdentity,imagePrompt} from './shorts-character-identity.mjs';
import {approvedPostScene,storyHistory,FRIENDS} from './generate-shorts-daily.mjs';

function assert(value,message){if(!value)throw Error('Crew Shorts preflight: '+message)}
export function inspectApprovedCharacter({root=resolve(fileURLToPath(new URL('..',import.meta.url))),friend='bella',date='2026-10-17'}={}){
 assert(FRIENDS.includes(friend),'unsupported Shorts Friend');
 assert(/^\\d{4}-\\d{2}-\\d{2}$/.test(date),'invalid YYYY-MM-DD date');
 const feed=JSON.parse(readFileSync(resolve(root,'content/crew-shorts/approved/posts.json'),'utf8'));
 const p=feed.posts.filter(x=>x.friendId===friend&&x.publishedAt.slice(0,10)===date);
 assert(p.length===1,'expected exactly one approved post for '+friend+' on '+date);
 const master=loadIdentity(root,'friend',friend);
 const scene=approvedPostScene(p[0],storyHistory(feed,friend,date));
 const prompt=imagePrompt(scene,master.identity);
 assert(prompt.includes(master.identity.visualIdentity.block),'missing locked description');
 assert(prompt.includes(master.identity.visualIdentity.negativeIdentity),'missing identity negative constraints');
 return {
  date,friend,identityId:master.identityId,identityVersion:master.identity.version,
  caption:p[0].caption,translationZh:p[0].translationZh,scene:scene.scene,
  master:{path:master.identity.source.path,gitBlobSha:master.sha,mimeType:master.reference.mimeType,byteLength:master.reference.data.length,integrity:'verified'},
  prompt,referenceImagePolicy:'one authentic canonical master image attached as inlineData when generating',
  previousShortsImageUsedAsReference:false,
  paidApiCalls:0,imagesGenerated:0,imagesPublished:0,
  note:'This validates input only. It cannot establish actual facial consistency until a model generates a photo and a human reviews it.'
 };
}
function option(name,fallback){const n=process.argv.indexOf('--'+name);return n<0?fallback:process.argv[n+1]}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{console.log(JSON.stringify(inspectApprovedCharacter({friend:option('friend','bella'),date:option('date','2026-10-17')}),null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
