#!/usr/bin/env node
/**
 * Batch-generate Crew UI translations. Static UI copy only.
 * Usage: GEMINI_API_KEY=... node scripts/generate-ui-locales.mjs [--check]
 *
 * Outputs files under web-spa/src/i18n/locales/{lang}/{namespace}.json.
 * Preserves all source keys and placeholders exactly; does not translate
 * user content, learning-language preferences, or AI conversations.
 */
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const root = process.cwd();
const languages = {
 ja: "Japanese (Japan)", es: "Spanish (Spain)", "pt-BR": "Brazilian Portuguese",
 id: "Indonesian", ko: "Korean (South Korea)", fr: "French (France)",
 de: "German (Germany)", vi: "Vietnamese", th: "Thai"
};
const namespaces = ["common","home","settings","teacher","friends","story","fortune"];
const base = path.join(root,"web-spa/src/i18n/locales");
const model = process.env.CREW_I18N_MODEL || "gemini-2.5-flash-lite";
const checkOnly = process.argv.includes("--check");
const dryRun = process.argv.includes("--dry-run");
const timeoutMs = 120_000;
let requests = 0;

function flatten(value, prefix="", output={}){
 for(const [key,item] of Object.entries(value)){
  const p=prefix?prefix+"."+key:key;
  if(typeof item==="string")output[p]=item;
  else if(item&&typeof item==="object"&&!Array.isArray(item))flatten(item,p,output);
  else throw new Error("Invalid locale data "+p);
 }
 return output;
}
function nest(flat){
 const out={};
 for(const [path,value] of Object.entries(flat)){
  const parts=path.split(".");
  let obj=out;
  for(const name of parts.slice(0,-1))obj=obj[name]??={};
  obj[parts.at(-1)]=value;
 }
 return out;
}
function vars(value){
 return [...value.matchAll(/\{\{[^{}]+\}\}/g)].map(m=>m[0]).sort().join("|");
}
function validate(source,target,locale,ns){
 const expected=Object.keys(source).sort();
 if(JSON.stringify(Object.keys(target).sort())!==JSON.stringify(expected))
  throw new Error(locale+"/"+ns+": keys differ from English source");
 for(const key of expected){
  if(typeof target[key]!=="string")throw new Error(locale+"/"+ns+":"+key+" is not a string");
  if(source[key].trim()&&!target[key].trim())
   throw new Error(locale+"/"+ns+":"+key+" is blank");
  if(vars(source[key])!==vars(target[key]))
   throw new Error(locale+"/"+ns+":"+key+" lost a placeholder: "+vars(source[key])+" -> "+vars(target[key]));
 }
}
function readSource(ns){
 return flatten(JSON.parse(fs.readFileSync(path.join(base,"en",ns+".json"),"utf8")));
}
function readTarget(file){return flatten(JSON.parse(fs.readFileSync(file,"utf8")));}
function httpError(code, message){const err=new Error("Gemini HTTP "+code+": "+message.slice(0,250));err.status=code;return err;}
async function translate(source,locale,ns){
 const entries=Object.entries(source).filter(([,v])=>v.trim());
 const blocks=[];
 for(let i=0;i<entries.length;i+=65)blocks.push(Object.fromEntries(entries.slice(i,i+65)));
 const result={};
 for(let n=0;n<blocks.length;n++){
  const batch=blocks[n];
  const payload={
   systemInstruction:{parts:[{text:
    "You are a professional software-localization translator. Translate the VALUES in a flat JSON object into "+
    languages[locale]+". Keep JSON keys exactly unchanged. Never change, remove, translate or duplicate {{interpolation}} tokens. "+
    "Preserve original meaning, line breaks, tone, punctuation and necessary placeholders; choose concise, fluent UI text. "+
    "Use natural terminology for a consumer AI conversation, games, reading and language-learning application. "+
    "Keep official names Crew, Crew Teacher, Crew Story, Crew Fortune, Gemini, AI Studio, Gemini Live, BaZi, API, Android, UTC, "+
    "A1/A2/B1/B2 and web paths unchanged. Use locale-appropriate translations for generic words. "+
    "Do not invent marketing claims. Output only a JSON object mapping every input key to its translated string."
   }]},
   contents:[{role:"user",parts:[{text:JSON.stringify({locale,namespace:ns,entries:batch})}]}],
   generationConfig:{temperature:0.2,responseMimeType:"application/json",maxOutputTokens:11000}
  };
  let success=false,lastError;
  for(let attempt=0;attempt<5;attempt++){
   try{
    if(attempt)await sleep(Math.min(90_000,5000*Math.pow(2,attempt)));
    const controller=new AbortController(),id=setTimeout(()=>controller.abort(),timeoutMs);
    let resp;
    try{
     resp=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{
      method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},
      body:JSON.stringify(payload),signal:controller.signal
     });
    }finally{clearTimeout(id)}
    requests++;
    if(!resp.ok)throw httpError(resp.status,await resp.text());
    const json=await resp.json();
    const raw=json.candidates?.[0]?.content?.parts?.map(p=>p.text??"").join("")??"";
    const parsed=JSON.parse(raw);
    validate(batch,parsed,locale,ns+" block "+n);
    Object.assign(result,parsed);
    success=true;break;
   }catch(e){
    lastError=e;
    console.error(locale+"/"+ns+" batch "+(n+1)+"/"+blocks.length+" retry "+(attempt+1)+": "+String(e).slice(0,320));
   }
  }
  if(!success)throw lastError;
  console.log("Translated "+locale+"/"+ns+" batch "+(n+1)+"/"+blocks.length);
  await sleep(1900);
 }
 for(const [key,value] of Object.entries(source))if(!value.trim())result[key]=value;
 validate(source,result,locale,ns);
 return result;
}
let completed=0,skipped=0;
for(const [lang] of Object.entries(languages)){
 for(const ns of namespaces){
  const src=readSource(ns),filepath=path.join(base,lang,ns+".json");
  if(fs.existsSync(filepath)){
   try{validate(src,readTarget(filepath),lang,ns);skipped++;continue}
   catch(e){if(checkOnly||dryRun)throw e;console.log("Regenerating invalid "+lang+"/"+ns)}
  }else if(checkOnly)throw new Error("Missing "+filepath);
  if(dryRun){console.log("Would translate "+lang+"/"+ns+": "+Object.keys(src).length+" keys");continue}
  if(!process.env.GEMINI_API_KEY)throw new Error("GEMINI_API_KEY is required to generate locale files");
  const translated=await translate(src,lang,ns);
  fs.mkdirSync(path.dirname(filepath),{recursive:true});
  fs.writeFileSync(filepath,JSON.stringify(nest(translated),null,2)+"\n");
  completed++;
  console.log("Saved "+lang+"/"+ns+" with "+Object.keys(src).length+" localized keys");
 }
}
console.log(JSON.stringify({status:"ok",completed,skipped,requests,checkOnly,dryRun,locales:Object.keys(languages)}));
