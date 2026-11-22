#!/usr/bin/env node
"use strict";

// Identical verifier in Android and Web. Android owns the canonical contract;
// Web checks an exact copy and its local implementation anchors.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const contractPath=path.join(root,"contracts/crew-teacher/v1.json");
const platform=fs.existsSync(path.join(root,"app/src/main/java/com/crewpocket/teacher/NativeLiveActivity.java"))
 ?"android":"web";
const allowed=new Set(["supported","limited","not-applicable"]);
const problems=[];

function fail(message){problems.push(message)}
function readSource(relative){
 if(typeof relative!=="string"||!relative.trim()||path.isAbsolute(relative)||relative.includes("\\"))
  throw new Error("Invalid relative path: "+relative);
 const resolved=path.resolve(root,relative);
 if(!resolved.startsWith(root+path.sep))throw new Error("Path outside repository: "+relative);
 const source=fs.readFileSync(resolved,"utf8");
 // FriendLivePage is now a route-only Shorts loader. Check the extracted Live
 // conversation alongside it, without relaxing any canonical anchor.
 if(platform==="web"&&relative==="web-spa/src/friends/FriendLivePage.tsx")
  return source+"\n"+readSource("web-spa/src/friends/FriendLiveConversation.tsx");
 return source;
}
function validate(){
 const contract=JSON.parse(fs.readFileSync(contractPath,"utf8"));
 assert.equal(contract.schemaVersion,1,"Unrecognized contract schema");
 assert.equal(contract.owner,"magic76/crew-teacher","Unexpected contract owner");
 assert.ok(/^\d{4}-\d{2}-\d{2}\.\d+$/.test(contract.revision),"Revision must be yyyy-mm-dd.N");
 assert.ok(Array.isArray(contract.featureMatrix)&&contract.featureMatrix.length>=8);
 assert.ok(Array.isArray(contract.invariants)&&contract.invariants.length>=5);
 assert.ok(Array.isArray(contract.manualAcceptance)&&contract.manualAcceptance.length>=4);
 const ids=new Set();
 for(const feature of contract.featureMatrix){
  if(ids.has(feature.id))fail("Duplicate feature: "+feature.id);
  ids.add(feature.id);
  for(const p of ["android","web"]){
   if(!allowed.has(feature[p]))fail(feature.id+": unsupported status for "+p);
   const entry=feature[p+"Entry"];
   if(feature[p]==="not-applicable"&&entry!==null)fail(feature.id+": N/A must have null "+p+" entry");
   if(feature[p]!=="not-applicable"&&(!entry||typeof entry!=="string"))
    fail(feature.id+": missing implementation entry for "+p);
   if(p===platform&&feature[p]!=="not-applicable")try{readSource(entry)}catch(e){fail(feature.id+": "+e.message)}
  }
 }
 ids.clear();
 for(const inv of contract.invariants){
  if(ids.has(inv.id))fail("Duplicate invariant: "+inv.id);
  ids.add(inv.id);
  for(const p of ["android","web"]){
   if(!Array.isArray(inv[p])||!inv[p].length){fail(inv.id+": missing "+p+" anchors");continue}
   if(p!==platform)continue;
   for(const anchor of inv[p]){
    try{
     const body=readSource(anchor.path);
     if(!Array.isArray(anchor.contains)||!anchor.contains.length)fail(inv.id+": missing search strings");
     else for(const needle of anchor.contains){
      if(typeof needle!=="string"||!needle.trim())fail(inv.id+": invalid search string");
      else if(!body.includes(needle))fail(inv.id+": "+anchor.path+" missing "+JSON.stringify(needle));
     }
    }catch(e){fail(inv.id+": "+e.message)}
   }
  }
 }
 if(contract.rules.freeChat.questionRequiredEachTurn!==false)fail("Free chat must not require a question each turn");
 if(contract.rules.memory.personalDefaultOn!==true||contract.rules.memory.explicitOptOutPreserved!==true)
  fail("Default-on and opt-out are both required");
 if(contract.rules.friends.singleLanguagePerSpokenReply!==true||contract.rules.friends.immersionAlwaysTargetOnly!==true||contract.rules.friends.friendMaxSilentNudges!==1)fail("Friend single-language and recovery limits required");
 if(contract.rules.practice.roleplayStaysInCharacter!==true)fail("Roleplay behavior required");
 if(contract.rules.freeChat.pivotAfterShortReplies!==2||contract.rules.freeChat.pivotAfterConsecutiveQuestions!==3)
  fail("Update both platform cadence thresholds and tests before updating the contract");
 const cadence=contract.rules.freeChat;
 for(const value of ["pivotAfterShortReplies","pivotAfterConsecutiveQuestions","firstSilenceMs","secondSilenceMs","maxSilentRescueNudges"]){
  if(!Number.isInteger(cadence[value])||cadence[value]<1)fail("Invalid cadence value: "+value);
 }
 if(cadence.topicContinuationHook!==true||cadence.noNudgeAfterGoodbye!==true)
  fail("Topic continuation and farewell boundaries are required");
 for(const value of ["lowEngagementFirstSilenceMs","highEngagementFirstSilenceMs"]){
  if(!Number.isInteger(cadence[value])||cadence[value]<1)fail("Invalid cadence value: "+value);
 }
 const checks=platform==="android"?[
  ["app/src/main/java/com/crewpocket/teacher/ConversationFlowPolicy.java",
   "shortReplyStreak >= "+cadence.pivotAfterShortReplies+" || questionStreak >= "+cadence.pivotAfterConsecutiveQuestions],
  ["app/src/main/java/com/crewpocket/teacher/ConversationFlowPolicy.java",
   "if (rescueLevel > 0) return "+cadence.secondSilenceMs+"L"],
  ["app/src/main/java/com/crewpocket/teacher/ConversationFlowPolicy.java",
   "if (needsPivot()) return "+cadence.lowEngagementFirstSilenceMs+"L"],
  ["app/src/main/java/com/crewpocket/teacher/ConversationFlowPolicy.java",
   "return detailedReplyStreak > 0 ? "+cadence.highEngagementFirstSilenceMs+"L : "+cadence.firstSilenceMs+"L"],
  ["app/src/main/java/com/crewpocket/teacher/ConversationFlowPolicy.java","boolean shouldRescue() { return !ended; }"],
  ["app/src/main/java/com/crewpocket/teacher/NativeLiveActivity.java","freeChatFlow.silenceDelayMs(silenceRescueLevel)"],
  ["app/src/main/java/com/crewpocket/teacher/NativeLiveActivity.java",
   "silenceRescueLevel >= (isCompanionConversation() ? "+contract.rules.friends.friendMaxSilentNudges+" : "+cadence.maxSilentRescueNudges+")"]
 ]:[
  ["web-spa/src/live/conversationFlow.ts",
   "this.shortReplies>="+cadence.pivotAfterShortReplies+"||this.questions>="+cadence.pivotAfterConsecutiveQuestions],
  ["web-spa/src/live/conversationFlow.ts","if(attempt>0)return "+cadence.secondSilenceMs],
  ["web-spa/src/live/conversationFlow.ts","if(this.needsPivot())return "+cadence.lowEngagementFirstSilenceMs],
  ["web-spa/src/live/conversationFlow.ts",
   "return this.detailedReplies>0?"+cadence.highEngagementFirstSilenceMs+":"+cadence.firstSilenceMs],
  ["web-spa/src/live/conversationFlow.ts","shouldRescue(){return !this.ended}"],
  ["web-spa/src/live/useLiveSession.ts","cadenceRef.current.silenceDelayMs(rescueCountRef.current,kind)"],
  ["web-spa/src/live/useLiveSession.ts",
   "rescueCountRef.current>=(kind===\"friend\"?"+contract.rules.friends.friendMaxSilentNudges+":"+cadence.maxSilentRescueNudges+")"]
 ];
 for(const [filename,needle] of checks){
  try{if(!readSource(filename).includes(needle))fail("Cadence contract differs from "+filename+": "+needle)}
  catch(e){fail(e.message)}
 }
 if(problems.length)throw Error(problems.join("\n"));
 console.log("[Crew Teacher contract] "+platform+" anchors OK; "+contract.featureMatrix.length+
  " features, "+contract.invariants.length+" invariants, revision "+contract.revision);
 return contract;
}
async function verifyUpstream(local){
 const token=process.env.CREW_CONTRACT_READ_TOKEN;
 const url=token
  ?"https://api.github.com/repos/magic76/crew-teacher/contents/contracts/crew-teacher/v1.json?ref=main"
  :"https://raw.githubusercontent.com/magic76/crew-teacher/main/contracts/crew-teacher/v1.json";
 const headers=token
  ?{Accept:"application/vnd.github.raw+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"}
  :{"User-Agent":"crew-teacher-contract-parity/1"};
 const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers});
 if(response.status===404&&!token){
  console.warn("[Crew Teacher contract] SKIP remote parity: private Android main is inaccessible without CREW_CONTRACT_READ_TOKEN. Local anchor verification still enforced.");
  return;
 }
 if(!response.ok)throw Error("Canonical fetch failed: HTTP "+response.status);
 const remote=JSON.parse(await response.text());
 assert.deepEqual(local,remote,"Web contract differs from Android main. Sync contracts/crew-teacher/v1.json and both platform implementations.");
 console.log("[Crew Teacher contract] Web snapshot matches "+(token?"authenticated":"public")+" Android main");
}
(async()=>{
 try{
  const contract=validate();
  if(process.argv.includes("--upstream")){
   if(platform!=="web")throw Error("--upstream is only for the Web repository");
   await verifyUpstream(contract);
  }
 }catch(e){console.error("[Crew Teacher contract] "+e.message);process.exitCode=1}
})();
