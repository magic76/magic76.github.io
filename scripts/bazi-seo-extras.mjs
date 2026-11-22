import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";

// Educational diagrams are intentionally bilingual, accessible static SVG and do not
// suggest that a symbolic cycle predicts anyone's future.
const bg='#f5f8ff',ink='#26385b',muted='#536682',line='#dbe3f2';
const svg=(inner)=>'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img">'+
'<rect width="1200" height="675" fill="'+bg+'"/><rect x="45" y="44" width="1110" height="587" rx="36" fill="white" stroke="'+line+'" stroke-width="3"/>'+inner+'</svg>';
const label=(x,y,text,size=26,color=ink,anchor='middle')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-family="system-ui,Noto Sans CJK TC,sans-serif" font-weight="650" font-size="'+size+'" fill="'+color+'">'+text+'</text>';
const marker='<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#6d7fa1"/></marker></defs>';
const wood=['木 Wood','火 Fire','土 Earth','金 Metal','水 Water'];
function fiveElements(){
 const pos=[[600,185],[855,310],[755,515],[445,515],[345,310]];
 const nodes=pos.map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="65" fill="'+['#dcefe7','#fae3da','#eee6d5','#e4e8ee','#dceaf8'][i]+'" stroke="#bcc9d9" stroke-width="2"/>'+label(x,y+8,wood[i],24)).join('');
 const outer=pos.map(([x,y],i)=>{const [a,b]=pos[(i+1)%5];const dx=b-x,dy=a-y,length=Math.hypot(dx,dy),ox=x+dx/length*76,oy=y+dy/length*76,tx=b-dx/length*76,ty=a-dy/length*76;return '<line x1="'+ox+'" y1="'+oy+'" x2="'+tx+'" y2="'+ty+'" stroke="#6d7fa1" stroke-width="4" marker-end="url(#arrow)"/>';}).join('');
 const cycles=[[0,2],[2,4],[4,1],[1,3],[3,0]];
 const text=cycles.map(([i,j])=>wood[i].split(' ')[0]+'→'+wood[j].split(' ')[0]).join('  ');
 return svg(marker+label(600,105,'五行相生｜Generating Cycle',36)+outer+nodes+label(600,605,'相剋 Controlling: '+text,20,muted));
}
function tenGods(){
 const boxes=[['同我 · 比劫','Peers'],['我生 · 食傷','Output'],['我剋 · 財','Wealth'],['剋我 · 官殺','Power'],['生我 · 印','Resource']];
 const coords=[[110,235],[510,235],[910,235],[310,425],[710,425]];
 return svg(label(600,110,'十神關係｜Ten Gods by relation to Day Master',35)+
 label(600,163,'以日主為中心 · 同陰陽／異陰陽再細分為十神',22,muted)+
 boxes.map((b,i)=>'<rect x="'+coords[i][0]+'" y="'+coords[i][1]+'" width="280" height="128" rx="23" fill="'+['#e6f1e9','#e8effc','#faeee0','#f4e9f2','#e4f1f3'][i]+'" stroke="#bdcadd" stroke-width="2"/>'+label(coords[i][0]+140,coords[i][1]+58,b[0],27)+label(coords[i][0]+140,coords[i][1]+95,b[1],21,muted)).join('')+
 label(600,613,'同我、我生、我剋、剋我、生我｜Each group splits into two polarity-based categories',20,muted));
}
function luckCycles(){
 const xs=[190,460,730,1000];
 return svg(label(600,114,'大運與流年｜Luck Pillars & Annual Cycles',35)+label(600,171,'時間分層示意，非個人運勢計算',22,muted)+
 '<line x1="166" y1="326" x2="1040" y2="326" stroke="#9aaaca" stroke-width="7"/>'+
 xs.map((x,i)=>'<circle cx="'+x+'" cy="326" r="24" fill="#5c78a9"/>'+label(x,262,'大運 '+(i+1),28)+label(x,395,'~10 years',21,muted)).join('')+
 '<rect x="155" y="446" width="890" height="84" rx="22" fill="#eaf0fa"/>'+label(600,498,'流年 Annual Cycle｜每年以天干與地支觀察互動',24)+label(600,596,'起運年齡依出生資料與節氣計算，並非所有人從 0 歲起算',20,muted));
}
const diagrams={"five-elements":fiveElements,"ten-gods":tenGods,"luck-cycles":luckCycles};
export function diagramPath(slug){
 const name=slug.split("/").at(-1);
 return Object.hasOwn(diagrams,name)?'/fortune/bazi/assets/'+name+'.svg':null;
}
export function writeBaziDiagrams(out){
 const dir=join(out,"fortune","bazi","assets");
 mkdirSync(dir,{recursive:true});
 for(const [name,render] of Object.entries(diagrams))writeFileSync(join(dir,name+".svg"),render(),"utf8");
}
const shared=[
 ["命理知識是科學預測嗎？","不是。八字是傳統文化的象徵詮釋，不是經實證確認可預測個人命運的工具。","Does BaZi scientifically predict the future?","No. BaZi is a traditional symbolic system, not an empirically validated predictor of personal outcomes."],
 ["沒有出生時辰，可以排八字嗎？","部分命盤資訊仍可查詢，但時柱會缺失，涉及時柱的傳統解讀就不完整。","Can I make a chart without a birth hour?","Some information may still be calculated, but the hour pillar will be missing and interpretations involving it are incomplete."]
];
function stemFaq(stem){
 const [slug,zh,en,imagery,,themes]=stem;
 return [
  [zh+"日主等於我的全部命格嗎？","不是。日主是日柱天干，需同時看年、月、時柱與季節、五行關係。","Is "+en+" my entire BaZi chart?","No. The Day Master is only the day pillar's stem; season, other pillars and their relationships also matter."],
  [zh+"的傳統象徵可以怎麼理解？",zh+"常以「"+imagery+"」作比喻，適合從「"+themes+"」等面向進行反思，不能用來斷定人格。","What does "+en+" traditionally symbolize?","The image of "+imagery+" is a cultural metaphor for reflection, not a personality diagnosis."],
  ...shared.slice(0,1)
 ];
}
const topicFaq={
 "bazi":[["八字的四柱分別是什麼？","年柱、月柱、日柱與時柱，分別由天干與地支組合。","What are the Four Pillars?","Year, month, day and hour pillars each combine a Heavenly Stem and an Earthly Branch."],...shared],
 "five-elements":[["五行缺一個就一定要補嗎？","不一定。傳統判讀重視節氣、日主與整體五行互動，不能只依數量決定。","Does a missing element always need correction?","No. Traditional interpretation considers season and the full chart rather than a simple element tally."],["五行相生和相剋有什麼不同？","相生描述木火土金水的循環支持關係；相剋描述不同元素的制約關係，兩者是傳統象徵模型。","How do generating and controlling cycles differ?","Generating describes symbolic support; controlling describes symbolic restraint between elements."],...shared.slice(0,1)],
 "ten-gods":[["十神是十個神明嗎？","不是。十神是日主與其他天干依五行生剋、陰陽而形成的十個關係類別。","Are the Ten Gods actual gods?","No. They are ten relationship categories based on the Day Master, elements and yin-yang polarity."],["不同日主的十神相同嗎？","同一個天干對不同日主可能對應不同十神，因此必須先確認日主。","Are the Ten Gods the same for every Day Master?","No. Their mapping depends on the Day Master."],...shared.slice(0,1)],
 "luck-cycles":[["大運一定十歲開始嗎？","不是。大運大致以十年為單位，但起運年齡及順逆需依出生資料與採用的規則計算。","Does the first luck pillar always begin at age ten?","No. Its start and direction depend on birth details and the calculation convention."],["流年只看生肖可以嗎？","不夠。傳統流年分析還會比較四柱、大運、日主和干支互動。","Is the zodiac animal enough for annual reading?","No. Traditional readings compare the full natal chart and current luck pillar."],...shared.slice(0,1)]
};
export function faqFor(slug,lang,stem){
 const id=slug.split("/").at(-1),rows=stem?stemFaq(stem):topicFaq[id]||shared;
 return rows.map(r=>({q:r[lang==="en"?2:0],a:r[lang==="en"?3:1]}));
}
export function relatedFor(slug,allSlugs){
 if(slug==="bazi")return ["bazi/five-elements","bazi/ten-gods","bazi/luck-cycles","bazi/jia-wood"];
 const id=slug.split("/").at(-1);
 const pairs=[["jia-wood","yi-wood"],["bing-fire","ding-fire"],["wu-earth","ji-earth"],["geng-metal","xin-metal"],["ren-water","gui-water"]];
 const pair=pairs.find(p=>p.includes(id));
 const options=pair?["bazi/"+pair.find(p=>p!==id),"bazi/five-elements","bazi/ten-gods","bazi/luck-cycles"]:["bazi","bazi/five-elements","bazi/ten-gods","bazi/luck-cycles"];
 return [...new Set(options.filter(x=>x!==slug&&allSlugs.includes(x)))].slice(0,4);
}
