#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");

const FIELDS=["onePerson","sameIdentity","ageAppearance","fullBodyAndFeet","noTextOrCollage"];
function dimensions(data){
 if(data.length<30||data.toString("ascii",0,4)!=="RIFF"||data.toString("ascii",8,12)!=="WEBP")
  throw Error("not a RIFF WebP file");
 const kind=data.toString("ascii",12,16);
 if(kind==="VP8X"){
  return {w:1+data.readUIntLE(24,3),h:1+data.readUIntLE(27,3)};
 }
 if(kind==="VP8 "){
  if(data.length<30||data[23]!==0x9d||data[24]!==0x01||data[25]!==0x2a)
   throw Error("invalid VP8 header");
  return {w:data.readUInt16LE(26)&0x3fff,h:data.readUInt16LE(28)&0x3fff};
 }
 if(kind==="VP8L"){
  if(data.length<25||data[20]!==0x2f)throw Error("invalid lossless WebP header");
  return {w:1+(((data[22]&0x3f)<<8)|data[21]),
          h:1+(((data[24]&0x0f)<<10)|(data[23]<<2)|((data[22]&0xc0)>>6))};
 }
 throw Error("unsupported WebP chunk: "+kind);
}
function check(root,contract){
 const errors=[],character=contract.character||{},ages=character.ages||[];
 const plan=character.fullBodyPhotoPlan||[],published=character.portraits||[];
 if(JSON.stringify(plan.map(p=>p.age))!==JSON.stringify(ages))
  errors.push("fullBodyPhotoPlan ages must match chronological canon");
 for(const p of published){
  const file=path.join(root,p.webPath);
  if(!fs.existsSync(file))errors.push("missing existing portrait "+p.webPath);
 }
 for(const p of plan){
  if(p.status!=="approved")continue;
  if(!p.review||FIELDS.some(k=>p.review[k]!==true)){
   errors.push("age "+p.age+": photo manual review is not fully approved");
   continue;
  }
  const relative="assets/timeline/fullbody/mira-"+p.age+".webp";
  const full=path.join(root,relative);
  if(!fs.existsSync(full)){
   errors.push("age "+p.age+": approved full-body asset missing at "+relative);
   continue;
  }
  const size=fs.statSync(full).size;
  if(size<1000||size>350000)errors.push("age "+p.age+": expected 1KB–350KB WebP, found "+size);
  try{
   const {w,h}=dimensions(fs.readFileSync(full));
   if(w<600||h<800||Math.abs(w/h-0.75)>0.02)
    errors.push("age "+p.age+": expected 3:4 photo >= 600x800, found "+w+"x"+h);
  }catch(e){errors.push("age "+p.age+": "+e.message)}
 }
 return errors;
}
if(require.main===module){
 const root=path.resolve(__dirname,"..");
 const contract=require("../contracts/crew-timeline/v1.json");
 const errors=check(root,contract);
 if(errors.length){
  errors.forEach(e=>console.error("FAIL "+e));process.exitCode=1;
 }else console.log("Mira full-body photo approval gate OK ("+
  contract.character.fullBodyPhotoPlan.filter(p=>p.status==="approved").length+
  "/"+contract.character.ages.length+" approved)");
}
module.exports={check,dimensions};
