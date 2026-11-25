import i18n from "../i18n";
import type {FortuneProfile} from "./types";

export type DailyKind="bazi"|"numerology";
export type DailyCard={
 version:1;date:string;kind:DailyKind;headline:string;theme:string;
 do:[string,string];avoid:string;luckyColor:{element:string;name:string;hex:string};
 basis:string[];almanac?:{yi:string[];ji:string[];chong?:string};deepLink:string;artSrc?:string;
};
export type DailyPending={status:"loading"|"unavailable";reason:"lunar"|"birthTime"|"birthDate"|"bazi"};
export type DailyResult=DailyCard|DailyPending;
export type LunarDay={getDayInGanZhi():string;getDayYi?():string[];getDayJi?():string[];getDayChongDesc?():string};
export type SolarEngine={fromYmd:(year:number,month:number,day:number)=>{getLunar:()=>LunarDay}};
export type DailyInput={
 kind:DailyKind;profile:Partial<FortuneProfile>;bazi?:any;localDate:string;lang:string;
 lunar?:SolarEngine;almanac?:"required"|"optional";translate?:(key:string,values?:Record<string,string|number>)=>string;
};
export const localDateKey=(now=new Date()):string=>
 [now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");

export function fnv1a(value:string):number{
 let seed=2166136261;
 for(const ch of value)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 return seed>>>0;
}
// SHA-256 (synchronous, no dependency) of the minimal profile identity.
// The hash is one-way, but low-entropy dates can still be guessed offline;
// it is never sent to Gemini or included in a share card.
const SHA256_K=[
 0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
 0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
 0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
 0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
 0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
 0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
 0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
 0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
];
function rotr(n:number,bits:number){return (n>>>bits)|(n<<(32-bits));}
export function dailyProfileHash(profile:Partial<FortuneProfile>):string{
 const raw=["crew-profile-v1",profile.birthDate||"",profile.birthTime||"",profile.gender||""].join("|");
 const bytes=new TextEncoder().encode(raw),size=Math.ceil((bytes.length+9)/64)*64;
 const padded=new Uint8Array(size);padded.set(bytes);padded[bytes.length]=0x80;
 const view=new DataView(padded.buffer);
 view.setUint32(size-8,Math.floor(bytes.length*8/4294967296));
 view.setUint32(size-4,bytes.length*8>>>0);
 const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
 for(let offset=0;offset<size;offset+=64){
  const w=new Uint32Array(64);
  for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4);
  for(let i=16;i<64;i++){
   const a=w[i-15],b=w[i-2];
   w[i]=(((w[i-16]+(rotr(a,7)^rotr(a,18)^(a>>>3)))>>>0)+w[i-7]+(rotr(b,17)^rotr(b,19)^(b>>>10)))>>>0;
  }
  let [a,b,c,d,e,f,g,k]=h;
  for(let i=0;i<64;i++){
   const s1=rotr(e,6)^rotr(e,11)^rotr(e,25);
   const t1=(k+s1+((e&f)^(~e&g))+SHA256_K[i]+w[i])>>>0;
   const s0=rotr(a,2)^rotr(a,13)^rotr(a,22);
   const t2=(s0+((a&b)^(a&c)^(b&c)))>>>0;
   k=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
  }
  [a,b,c,d,e,f,g,k].forEach((x,i)=>h[i]=(h[i]+x)>>>0);
 }
 return h.map(x=>x.toString(16).padStart(8,"0")).join("");
}
const ELEMENT_COLOR:Record<string,{hex:string;nameKey:string}>={
 "木":{hex:"#4A9567",nameKey:"wood"},"火":{hex:"#D96161",nameKey:"fire"},
 "土":{hex:"#D4AB44",nameKey:"earth"},"金":{hex:"#BBC5CF",nameKey:"metal"},
 "水":{hex:"#4776B9",nameKey:"water"}
};
// Traditional five-element association for entertainment and reflection only.
const NUMBER_ELEMENTS=["","木","土","火","木","土","金","水","火","金"];
const STEM_ROMAN:Record<string,string>={"甲":"Jia","乙":"Yi","丙":"Bing","丁":"Ding","戊":"Wu","己":"Ji","庚":"Geng","辛":"Xin","壬":"Ren","癸":"Gui"};
const BRANCH_ROMAN:Record<string,string>={"子":"Zi","丑":"Chou","寅":"Yin","卯":"Mao","辰":"Chen","巳":"Si","午":"Wu","未":"Wei","申":"Shen","酉":"You","戌":"Xu","亥":"Hai"};
export const TEN_GOD_CATEGORY:Record<string,string>={
 "比肩":"peers","劫財":"peers","食神":"expression","傷官":"expression",
 "偏財":"resources","正財":"resources","七殺":"responsibility","正官":"responsibility",
 "偏印":"learning","正印":"learning"
};
export function dayStemRelation(dayGan:string,otherGan:string):string{
 const ganElement:Record<string,string>={"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
 const generate:Record<string,string>={"木":"火","火":"土","土":"金","金":"水","水":"木"};
 const control:Record<string,string>={"木":"土","火":"金","土":"水","金":"木","水":"火"};
 const a=ganElement[dayGan],b=ganElement[otherGan];if(!a||!b)return "";
 const same=["甲","丙","戊","庚","壬"].includes(dayGan)===["甲","丙","戊","庚","壬"].includes(otherGan);
 if(a===b)return same?"比肩":"劫財";
 if(generate[a]===b)return same?"食神":"傷官";
 if(generate[b]===a)return same?"偏印":"正印";
 if(control[a]===b)return same?"偏財":"正財";
 if(control[b]===a)return same?"七殺":"正官";
 return "";
}
export function dayBranchRelation(a:string,b:string):string{
 const pairs:Record<string,string>={
 "子丑":"六合","寅亥":"六合","卯戌":"六合","辰酉":"六合","巳申":"六合","午未":"六合",
 "子午":"六沖","丑未":"六沖","寅申":"六沖","卯酉":"六沖","辰戌":"六沖","巳亥":"六沖",
 "子未":"六害","丑午":"六害","寅巳":"六害","卯辰":"六害","申亥":"六害","酉戌":"六害"
 };
 return pairs[a+b]||pairs[b+a]||"";
}
export function reduceSingle(n:number):number{
 n=Math.abs(n);while(n>9)n=String(n).split("").reduce((sum,x)=>sum+Number(x),0);return n;
}
export function personalCycle(profile:Partial<FortuneProfile>,date:string){
 const birth=String(profile.birthDate||"").split("-").map(Number);
 const [y,m,d]=date.split("-").map(Number);
 if(birth.length!==3||!birth[0]||!birth[1]||!birth[2]||!y||!m||!d)return null;
 const personalYear=reduceSingle(reduceSingle(birth[1])+reduceSingle(birth[2])+reduceSingle(y));
 const personalMonth=reduceSingle(personalYear+m);
 const personalDay=reduceSingle(personalMonth+d);
 return {personalYear,personalMonth,personalDay};
}
function translated(input:DailyInput,key:string,values?:Record<string,string|number>):string{
 return input.translate?input.translate(key,values):String(i18n.t(key,{ns:"fortuneDaily",...values,lng:input.lang}));
}
// lunar-javascript Yi/Ji/Chong strings are simplified Chinese. This small
// table covers common almanac vocabulary without adding a dependency.
const ALMANAC_S2T:Record<string,string>=Object.fromEntries([
 ["车","車"],["货","貨"],["财","財"],["开","開"],["仓","倉"],["动","動"],["龙","龍"],["马","馬"],["鸡","雞"],["猪","豬"],["门","門"],
 ["规","規"],["丧","喪"],["纳","納"],["盖","蓋"],["钟","鐘"],["针","針"],["铺","鋪"],["会","會"],["书","書"],["画","畫"],["医","醫"],
 ["药","藥"],["庙","廟"],["坟","墳"],["迁","遷"],["启","啟"],["闭","閉"],["竖","豎"],["树","樹"],["种","種"],["礼","禮"],
 ["坛","壇"],["斋","齋"],["祷","禱"],["订","訂"],["约","約"],["买","買"],["卖","賣"],["结","結"],["缔","締"],["缘","緣"],
 ["亲","親"],["乔","喬"],["扫","掃"],["舍","捨"],["驿","驛"],["联","聯"],["宾","賓"],["饭","飯"],["饮","飲"],["酝","醞"],["酿","釀"],
 ["经","經"],["络","絡"],["纺","紡"],["织","織"],["网","網"],["罗","羅"],["钓","釣"],["厕","廁"],["宫","宮"],["馆","館"],
 ["盐","鹽"],["铁","鐵"],["铜","銅"],["复","復"],["还","還"],["转","轉"],["运","運"],["进","進"],["发","發"],["头","頭"],
 ["杀","殺"],["兽","獸"],["鸟","鳥"],["鱼","魚"],["虾","蝦"],["鳖","鱉"],["龟","龜"],["烧","燒"],["炼","煉"],["炉","爐"],
 ["点","點"],["灯","燈"],["损","損"],["墙","牆"],["砖","磚"],["垒","壘"],["桥","橋"],["坝","壩"],["务","務"],["农","農"],
 ["粮","糧"],["产","產"],["业","業"],["静","靜"],["库","庫"],["帐","帳"],["帘","簾"],["张","張"],["岁","歲"],["旧","舊"],
 ["圣","聖"],["灵","靈"],["寿","壽"],["庆","慶"],["贡","貢"],["贵","貴"],["驾","駕"],["临","臨"],["见","見"],["观","觀"],
 ["觐","覲"],["谈","談"],["议","議"],["净","淨"],["济","濟"],["断","斷"],["绝","絕"],["谢","謝"],["请","請"],["应","應"],
 ["兴","興"],["义","義"],["为","為"],["对","對"],["国","國"],["阳","陽"],["阴","陰"],["历","曆"],["冲","沖"],["时","時"],
 ["节","節"],["东","東"],["风","風"],["云","雲"],["凤","鳳"],["乌","烏"],["斩","斬"],["坏","壞"],["废","廢"],["杂","雜"],
 ["装","裝"],["饰","飾"]
] as [string,string][]);
export function traditionalAlmanacText(raw:string):string{
 return Array.from(raw||"").map(char=>ALMANAC_S2T[char]||char).join("");
}
function localAlmanac(day:LunarDay,lang:string):DailyCard["almanac"]{
 const format=(v:string)=>lang==="zh-TW"?traditionalAlmanacText(v):v;
 return {yi:(day.getDayYi?.()||[]).slice(0,3).map(format),
  ji:(day.getDayJi?.()||[]).slice(0,3).map(format),
  chong:day.getDayChongDesc?format(day.getDayChongDesc()):undefined};
}
function readableBranch(code:string,lang:string){return /^zh/i.test(lang)?code:code.split("").map(x=>STEM_ROMAN[x]||BRANCH_ROMAN[x]||x).join("-")}
function readableStem(code:string,lang:string){return /^zh/i.test(lang)?code:STEM_ROMAN[code]||code}
function readableRelation(code:string,input:DailyInput){return code?translated(input,"relations."+code):translated(input,"relations.none")}
// The copy and artwork use the same deterministic daily/profile seed and variant.
function dailyArtSource(category:string,seed:number):string{
 if(!/^(?:peers|resources|expression|responsibility|learning)$/.test(category))return "/fortune/daily/art/daily-peers-1.webp";
 return "/fortune/daily/art/daily-"+category+"-"+(((seed>>>5)%3)+1)+".webp";
}
function chooseCopy(input:DailyInput,category:string,seed:number){
 const index=seed%3;
 const path="templates."+category+"."+index+".";
 return {headline:translated(input,path+"headline"),theme:translated(input,path+"theme"),
  do:[translated(input,path+"do0"),translated(input,path+"do1")] as [string,string],
  avoid:translated(input,path+"avoid")};
}
export function buildDailyCard(input:DailyInput):DailyResult{
 const {profile,kind,localDate,lang}=input;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(localDate)||!profile.birthDate)return {status:"unavailable",reason:"birthDate"};
 if(kind==="bazi"&&!profile.birthTime)return {status:"unavailable",reason:"birthTime"};
 const seed=fnv1a("crew-daily-v1:"+kind+":"+dailyProfileHash(profile)+":"+localDate);
 let category="",colorElement="",basis:string[]=[],almanac:DailyCard["almanac"];
 let headline="",theme="",suggestions:[string,string]=["",""],avoid="";
 if(kind==="numerology"){
  const c=personalCycle(profile,localDate);if(!c)return {status:"unavailable",reason:"birthDate"};
  const cardIndex=(c.personalYear+c.personalMonth+c.personalDay)%22;
  const numericCategories=["","peers","resources","expression","responsibility","learning","peers","learning","resources","expression"];
  category=numericCategories[c.personalDay];
  colorElement=NUMBER_ELEMENTS[c.personalDay];
  const copy=chooseCopy(input,category,seed>>>5);
  headline=translated(input,"numerologyHeadline",{day:c.personalDay,card:translated(input,"cards."+cardIndex+".name")});
  theme=copy.theme;
  const secondary=chooseCopy(input,numericCategories[c.personalMonth],(seed>>>9)+c.personalYear);
  suggestions=[copy.do[0],secondary.do[1]];avoid=secondary.avoid;
  basis=[translated(input,"basis.numeric",{year:c.personalYear,month:c.personalMonth,day:c.personalDay}),
   translated(input,"basis.tarot",{card:translated(input,"cards."+cardIndex+".name")}),
   translated(input,"basis.keyword",{keyword:translated(input,"cards."+cardIndex+".keywords")})];
 }else{
  let result=input.bazi;
  if(!result){
   const calc=typeof window!=="undefined"?window.CrewFortuneBaZi?.calculate:null;
   if(typeof calc!=="function")return {status:"loading",reason:"bazi"};
   try{result=calc(profile.birthDate,profile.birthTime,Number(profile.gender||1),new Date(localDate+"T12:00:00"));}catch{return {status:"unavailable",reason:"bazi"};}
  }
  const dayMaster=String(result?.dayMaster||result?.dayPillar?.charAt(0)||"");
  if(!dayMaster)return {status:"unavailable",reason:"bazi"};
  const lunar=input.lunar||(typeof window!=="undefined"?(window as typeof window&{Solar?:SolarEngine}).Solar:undefined);
  if(!lunar?.fromYmd)return {status:"loading",reason:"lunar"};
  let solarDay:LunarDay,ganZhi="";
  try{
   const [y,m,d]=localDate.split("-").map(Number);
   solarDay=lunar.fromYmd(y,m,d).getLunar();ganZhi=solarDay.getDayInGanZhi();
  }catch{return {status:"loading",reason:"lunar"};}
  if(!ganZhi||ganZhi.length<2)return {status:"loading",reason:"lunar"};
  const god=dayStemRelation(dayMaster,ganZhi.charAt(0));
  category=TEN_GOD_CATEGORY[god]||"peers";
  const branches=[result?.dayPillar?.charAt(1),result?.yearPillar?.charAt(1)];
  const relationDay=dayBranchRelation(ganZhi.charAt(1),branches[0]||"");
  const relationYear=dayBranchRelation(ganZhi.charAt(1),branches[1]||"");
  basis=[
   translated(input,"basis.baziStem",{day:readableBranch(ganZhi,lang),master:readableStem(dayMaster,lang),god:translated(input,"gods."+god)}),
   translated(input,"basis.baziBranch",{daily:readableBranch(ganZhi.charAt(1),lang),natal:readableBranch(branches[0]||"",lang),relation:readableRelation(relationDay,input)}),
   translated(input,"basis.baziYearBranch",{daily:readableBranch(ganZhi.charAt(1),lang),natal:readableBranch(branches[1]||"",lang),relation:readableRelation(relationYear,input)})
  ];
  // Main theme is the exact day's ten god; natal interactions determine the caution.
  // Annual and luck pillars are selected by target year, never the stale currentLuckPillar.
  const year=Number(localDate.slice(0,4));
  const annual=Array.isArray(result?.annualTimeline)?result.annualTimeline.find((x:any)=>x.year===year):undefined;
  const luck=Array.isArray(result?.luckPillars)?result.luckPillars.find((x:any)=>year>=x.startYear&&year<=x.endYear):undefined;
  const dailyElement=Object.keys(ELEMENT_COLOR).find((e)=>({木:"甲乙",火:"丙丁",土:"戊己",金:"庚辛",水:"壬癸"} as Record<string,string>)[e].includes(ganZhi.charAt(0)));
  const favorable=Array.isArray(result?.balancingElements)?result.balancingElements.filter((e:string)=>Object.hasOwn(ELEMENT_COLOR,e)):[];
  const interactions=[result?.yearPillar,result?.monthPillar,result?.dayPillar,result?.timePillar].map(p=>dayBranchRelation(ganZhi.charAt(1),typeof p==="string"?p.charAt(1):""));
  const caution=interactions.some(r=>r==="六沖"||r==="六害");
  const supportive=interactions.includes("六合");
  const exactGodIndex=Object.keys(TEN_GOD_CATEGORY).indexOf(god);
  const primary=chooseCopy(input,category,(seed>>>5)+Math.max(0,exactGodIndex));
  const annualCategory=TEN_GOD_CATEGORY[dayStemRelation(dayMaster,annual?.ganZhi?.charAt(0)||"")];
  const luckCategory=TEN_GOD_CATEGORY[dayStemRelation(dayMaster,luck?.ganZhi?.charAt(0)||"")];
  const secondaryCategory=caution?"responsibility":supportive?"peers":annualCategory||luckCategory||(dailyElement&&favorable.includes(dailyElement)?"expression":category);
  const secondary=chooseCopy(input,secondaryCategory,(seed>>>9)+Number(localDate.slice(5,7)));
  headline=primary.headline;theme=primary.theme;suggestions=[primary.do[0],secondary.do[1]];avoid=secondary.avoid;
  colorElement=(dailyElement&&favorable.includes(dailyElement)?dailyElement:favorable[(seed>>>8)%Math.max(1,favorable.length)])||result?.dayMasterElement||"木";
  if(/^zh/i.test(lang)){
   try{almanac=localAlmanac(solarDay,lang);}catch{/* optional calendar metadata */}
  }
 }
 if(/^zh/i.test(lang)&&!almanac){
  const engine=input.lunar||(typeof window!=="undefined"?(window as typeof window&{Solar?:SolarEngine}).Solar:undefined);
  if(!engine?.fromYmd){if(input.almanac!=="optional")return {status:"loading",reason:"lunar"};}
  else try{
   const [y,m,d]=localDate.split("-").map(Number);
   const day=engine.fromYmd(y,m,d).getLunar();
   almanac=localAlmanac(day,lang);
  }catch{if(input.almanac!=="optional")return {status:"loading",reason:"lunar"};}
 }
 const chosen=ELEMENT_COLOR[colorElement]||ELEMENT_COLOR["木"];
 const luckyColor={element:translated(input,"elements."+colorElement),name:translated(input,"colors."+chosen.nameKey),hex:chosen.hex};
 const card:DailyCard={version:1,date:localDate,kind,headline,theme,do:suggestions,avoid,luckyColor,basis,
  artSrc:dailyArtSource(category,seed),deepLink:"/fortune/reading?mode="+(kind==="bazi"?"bazi":"tarot")};
 if(almanac&&/^zh/i.test(lang))card.almanac=almanac;
 return card;
}
