import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../web-spa/src/guides/catalog.ts",import.meta.url),"utf8");
function section(slug,next){
 const start=source.indexOf(' "'+slug+'":{');
 const end=source.indexOf(' "'+next+'":{',start+1);
 assert.ok(start>=0&&end>start);
 return source.slice(start,end);
}
test("bilingual travel guide contains realistic dialogues and direct travel course entry",()=>{
 const text=section("travel-english-dialogues","english-pronunciation");
 for(const sample of ["機場入境英文問答","飯店入住英文對話","餐廳點餐英文對話","Airport immigration questions and answers","Hotel check-in dialogue","Ordering food at a restaurant","What is the purpose of your visit?","Do you have a reservation?","Are you ready to order?"])assert.ok(text.includes(sample),sample);
 assert.equal((text.match(/target:"\/teacher\/course\/travel"/g)||[]).length,2);
 assert.match(text,/Answer truthfully using your actual plans/);
});
test("bilingual pronunciation guide teaches vowel contrasts and regular past-tense endings",()=>{
 const text=section("english-pronunciation","gemini-key-for-ai-practice");
 for(const sample of ["長短母音辨識","英文 ed 結尾的三種發音","Vowel minimal pairs","Three pronunciations of regular past-tense -ed","/ɪd/","/t/","/d/","wanted","worked","played","not a certified assessment","不是正式發音評量"])assert.ok(text.includes(sample),sample);
 assert.equal((text.match(/target:"\/teacher\/pronunciation"/g)||[]).length,2);
});
