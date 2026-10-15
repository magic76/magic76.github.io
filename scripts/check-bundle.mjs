import {readFileSync,existsSync,statSync} from "node:fs";
import {resolve,join} from "node:path";
import {gzipSync} from "node:zlib";

/** Compressed static-import closure, NOT the sum of on-demand route chunks. */
const output=resolve(process.argv[2] || "crew-app");
const manifestPath=join(output,".vite","manifest.json");
if(!existsSync(manifestPath))throw Error("Missing Vite manifest. Run npm run build:web first.");
const manifest=JSON.parse(readFileSync(manifestPath,"utf8"));
const entries=Object.values(manifest).filter(x=>x.isEntry);
if(entries.length!==1)throw Error("Expected exactly one browser entry, got "+entries.length);
const seen=new Set();
const visit=name=>{
 if(seen.has(name))return;
 const item=manifest[name];
 if(!item)throw Error("Missing dependency "+name+" in Vite manifest");
 seen.add(name);
 for(const dependency of item.imports||[])visit(dependency);
};
const entryKey=Object.keys(manifest).find(key=>manifest[key]===entries[0]);
visit(entryKey);
const gzipBytes=file=>gzipSync(readFileSync(join(output,file))).length;
const initialFiles=[...new Set([...seen].map(key=>manifest[key].file).filter(Boolean))];
const initialGzip=initialFiles.reduce((total,file)=>total+gzipBytes(file),0);
const shorts=Object.entries(manifest).find(([key])=>key.endsWith("/ShortsPage.tsx"));
if(!shorts)throw Error("Crew Shorts must be dynamically imported, not part of the main bundle.");
const shortsGzip=gzipBytes(shorts[1].file);
const kib=bytes=>(bytes/1024).toFixed(1)+" KiB";
console.log("Entry + statically imported JS (gzip): "+kib(initialGzip));
console.log("Crew Shorts route chunk (gzip): "+kib(shortsGzip));
console.log("JS route chunks: "+Object.values(manifest).filter(x=>x.isDynamicEntry).length);
if(initialGzip>450*1024)throw Error("Initial JS exceeds 450 KiB gzip budget: "+kib(initialGzip));
if(shortsGzip>30*1024)throw Error("Crew Shorts page exceeds 30 KiB gzip budget: "+kib(shortsGzip));
