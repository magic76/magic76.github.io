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
 return fs.readFileSync(resolved,"utf8");
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
 if(contract.rules.friends.selectedSpokenLanguageLocked!==true)fail("Friend language lock required");
 if(contract.rules.practice.roleplayStaysInCharacter!==true)fail("Roleplay behavior required");
 if(contract.rules.freeChat.pivotAfterShortReplies!==2||contract.rules.freeChat.pivotAfterConsecutiveQuestions!==3)
  fail("Update both platform cadence thresholds and tests before updating the contract");
 if(problems.length)throw Error(problems.join("\n"));
 console.log("[Crew Teacher contract] "+platform+" anchors OK; "+contract.featureMatrix.length+
  " features, "+contract.invariants.length+" invariants, revision "+contract.revision);
 return contract;
}
async function verifyUpstream(local){
 const url="https://raw.githubusercontent.com/magic76/crew-teacher/main/contracts/crew-teacher/v1.json";
 const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{"User-Agent":"crew-teacher-contract-parity/1"}});
 if(response.status===404){
  // Initial dual-repo bootstrap: canonical file arrives with the Android PR first.
  console.warn("[Crew Teacher contract] canonical main not published yet; bootstrap only. Merge Android before shipping Web.");
  return;
 }
 if(!response.ok)throw Error("Canonical fetch failed: HTTP "+response.status);
 const remote=JSON.parse(await response.text());
 assert.deepEqual(local,remote,"Web contract differs from Android main. Sync contracts/crew-teacher/v1.json and both platform implementations.");
 console.log("[Crew Teacher contract] Web snapshot matches Android main");
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
