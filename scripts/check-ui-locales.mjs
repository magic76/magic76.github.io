#!/usr/bin/env node
// Offline UI locale audit: no LLM, network, or paid API required.
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
const root=path.resolve(import.meta.dirname,"..");
const translations=path.join(root,"web-spa/src/i18n/locales");
const catalog=JSON.parse(fs.readFileSync(path.join(root,"config/ui-locales.json"),"utf8")).locales;
const namespaces=fs.readdirSync(path.join(translations,"en")).filter(x=>x.endsWith(".json")).map(x=>x.slice(0,-5)).sort();
const errors=[],warnings=[],report=[];
const read=(lang,ns)=>{
 const file=path.join(translations,lang,ns+".json");
 if(!fs.existsSync(file))return null;
 try{return JSON.parse(fs.readFileSync(file,"utf8"))}
 catch(error){errors.push(lang+"/"+ns+": invalid JSON ("+error.message+")");return null}
};
const flatten=(value,label,prefix="",result={})=>{
 if(!value||typeof value!=="object"||Array.isArray(value)){errors.push(label+": expected JSON object at "+(prefix||"<root>"));return result}
 for(const [key,item] of Object.entries(value)){
  const pointer=prefix?prefix+"."+key:key;
  if(typeof item==="string")result[pointer]=item;
  else if(item&&typeof item==="object"&&!Array.isArray(item))flatten(item,label,pointer,result);
  else errors.push(label+": non-string leaf "+pointer);
 }
 return result;
};
const tokens=value=>[...value.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)].map(m=>m[1]).sort();
const source=new Map(namespaces.map(ns=>[ns,flatten(read("en",ns),"en/"+ns)]));
for(const locale of catalog){
 const lang=locale.code;
 let total=0,complete=0,identical=0,missingFiles=0;
 for(const ns of namespaces){
  const reference=source.get(ns),keys=Object.keys(reference);
  total+=keys.length;
  const parsed=read(lang,ns);
  if(!parsed){missingFiles++;if(locale.stage!=="preview")errors.push(lang+"/"+ns+": missing catalog");continue}
  const target=flatten(parsed,lang+"/"+ns);
  for(const key of Object.keys(target))if(!(key in reference))errors.push(lang+"/"+ns+": unexpected key "+key);
  for(const key of keys){
   if(!Object.hasOwn(target,key)){if(locale.stage!=="preview")errors.push(lang+"/"+ns+": missing key "+key);continue}
   const actual=target[key],expected=reference[key];
   if(expected.trim()&&!actual.trim()){errors.push(lang+"/"+ns+": blank key "+key);continue}
   if(JSON.stringify(tokens(actual))!==JSON.stringify(tokens(expected))){
    errors.push(lang+"/"+ns+":"+key+" interpolation mismatch ("+tokens(actual)+" vs "+tokens(expected)+")");
    continue;
   }
   if(actual.replace(/\{\{\s*[^{}]*?\s*\}\}/g,"").includes("{{")||
      actual.replace(/\{\{\s*[^{}]*?\s*\}\}/g,"").includes("}}"))
    errors.push(lang+"/"+ns+":"+key+" malformed interpolation");
   complete++;
   if(lang!=="en"&&actual===expected&&/[A-Za-z]{4}/.test(expected))identical++;
  }
 }
 const percent=total?Math.round(complete/total*10000)/100:0;
 report.push({language:lang,stage:locale.stage,keys:complete,total,coverage:percent,unchangedEnglish:identical,missingFiles});
 if(locale.stage==="published"&&complete!==total)errors.push(lang+": published locale must have 100% validated coverage");
 if(locale.stage==="priority"&&complete!==total)errors.push(lang+": Beta locale must have 100% validated catalog coverage");
}
if(catalog.filter(x=>x.stage==="published").some(x=>x.code!=="en"&&x.code!=="zh-TW"))warnings.push("New published language: require native-speaker review before promotion.");
if(process.argv.includes("--changed-ui")){
 const base=process.env.UI_I18N_BASE_SHA;
 if(!base)warnings.push("UI string diff skipped: UI_I18N_BASE_SHA not set");
 else try{
  const diff=execFileSync("git",["diff","--unified=0","--no-ext-diff",base,"HEAD","--","web-spa/src"],{cwd:root,encoding:"utf8"});
  let file="";
  for(const line of diff.split("\n")){
   if(line.startsWith("+++ b/")){file=line.slice(6);continue}
   if(!file.endsWith(".tsx")||!line.startsWith("+")||line.startsWith("+++"))continue;
   const added=line.slice(1);
   if(/i18n-audit-ignore|^\s*(?:\/\/|\/\*|\*)/.test(added))continue;
   const visible=/>[^<>{}]*[\p{L}][^<>{}]*</u.test(added);
   const attribute=/\b(?:placeholder|aria-label|title|alt)\s*=\s*["'][^"']*[\p{L}][^"']*["']/u.test(added);
   if(visible||attribute)warnings.push("Possibly untranslated new UI text in "+file+": "+added.trim().slice(0,150));
  }
 }catch(error){warnings.push("UI string diff unavailable: "+String(error.message).slice(0,120))}
}
const lines=[
 "### UI translation coverage",
 "| Locale | Stage | Validated keys | Coverage | Same as English | Missing namespace files |",
 "| --- | --- | ---: | ---: | ---: | ---: |",
 ...report.map(x=>"| "+x.language+" | "+x.stage+" | "+x.keys+"/"+x.total+" | "+x.coverage+"% | "+x.unchangedEnglish+" | "+x.missingFiles+" |"),
 "",
 "Errors: "+errors.length+"; review warnings: "+warnings.length,
 ...errors.slice(0,80).map(e=>"- ERROR "+e),
 ...warnings.slice(0,80).map(w=>"- REVIEW "+w)
];
console.log(lines.join("\n"));
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join("\n")+"\n");
if(errors.length||(process.argv.includes("--strict-ui")&&warnings.length))process.exitCode=1;
