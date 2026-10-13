import {readFileSync,appendFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {assessResearchQuality} from "./research-quality.mjs";
import {readPublishedResearch} from "./research-seo.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const {days}=readPublishedResearch(root);
const rows=[];
for(const [date,day] of days)for(const item of day.items){
 const result=assessResearchQuality(item);
 rows.push({date,item,result});
}
const indexable=rows.filter(x=>x.result.indexable).length;
const short=rows.length-indexable;
const table=[
 "## Research editorial checks",
 "",
 "Automatic signals only: these do not verify paper claims, source authenticity, or originality.",
 "",
 "| Edition | Article ID | SEO eligibility | Why not eligible |",
 "| --- | --- | --- | --- |",
 ...rows.map(({date,item,result})=>
  "| "+date+" | "+String(item.id).replaceAll("|","")+
  " | "+(result.indexable?"Eligible":"Noindex")+" | "+result.reasons.join(", ")+" |"
 ),
 "",
 "Totals: "+rows.length+" public research articles; "+indexable+" eligible for Sitemap; "+short+" noindex.",
 ""
];
console.log(table.join("\n"));
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,table.join("\n")+"\n");
