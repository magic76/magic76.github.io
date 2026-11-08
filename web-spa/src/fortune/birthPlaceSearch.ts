export type BirthPlaceResult={name:string;admin1:string;country:string;countryCode:string;latitude:number;longitude:number;timezone:string;displayName:string};

// Open-Meteo's "zh" locale may return Simplified Chinese even when the Crew
// interface is zh-TW. Load the converter only for Chinese searches.
let traditionalConverter:Promise<(value:string)=>string>|null=null;
function getTraditionalConverter(){
 return traditionalConverter??=import("opencc-js").then(m=>m.default.Converter({from:"cn",to:"tw"}));
}
const identity=(value:string)=>value;
function normalizePlacePart(value:unknown,convert:(value:string)=>string,taiwan:boolean):string{
 let result=convert(String(value||"").trim());
 const traditional=convert!==identity;
 if(taiwan){
  // External geocoders can prepend "中國" or "中華台北" to Taiwanese places.
  result=result.replace(/中[國国]|中華(?:臺|台)北/g,"").trim();
  if(traditional){
   result=result.replace(/臺灣/g,"台灣");
   // Some providers concatenate "台北台灣" into one field.
   if(result.endsWith("台灣")&&result!=="台灣")result=result.slice(0,-2);
  }
 }
 return result.replace(/^[,，、\s]+|[,，、\s]+$/g,"");
}

export async function searchBirthPlaces(query:string,uiLocale?:string):Promise<BirthPlaceResult[]>{
 const clean=query.trim();if(clean.length<2)return[];
 const locale=uiLocale||(typeof navigator!=="undefined"?navigator.language:"zh-TW")||"zh-TW";
 const traditional=/^zh(?:-|$)/i.test(locale);
 const language=traditional?"zh":locale.split("-")[0].toLowerCase();
 const url="https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(clean)+"&count=8&language="+encodeURIComponent(language)+"&format=json";
 const r=await fetch(url,{headers:{Accept:"application/json"}});
 if(!r.ok)throw new Error("出生地搜尋服務暫時無法使用");
 const data=await r.json(),rows=Array.isArray(data.results)?data.results:[];
 const convert=traditional?await getTraditionalConverter():identity;
 return rows.filter((x:any)=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)&&x.timezone).map((x:any)=>{
  const rawCountryCode=String(x.country_code||"").toUpperCase(),taiwan=rawCountryCode==="TW"||x.timezone==="Asia/Taipei";
  const countryCode=taiwan?"TW":rawCountryCode;
  const name=normalizePlacePart(x.name,convert,taiwan);
  let admin1=normalizePlacePart(x.admin1,convert,taiwan);
  const country=taiwan?(traditional?"台灣":"Taiwan"):normalizePlacePart(x.country,convert,false);
  // Don't repeat Taiwan as an administrative region and the country.
  if(taiwan&&/^(?:台|臺)灣(?:省)?$/.test(admin1))admin1="";
  const parts=[name,admin1,country].filter(Boolean).filter((v:string,i:number,a:string[])=>a.indexOf(v)===i);
  return{name,admin1,country,countryCode,latitude:Number(x.latitude),longitude:Number(x.longitude),timezone:String(x.timezone),displayName:parts.join(", ")||countryCode};
 });
}

function offsetMinutesForInstant(date:Date,timeZone:string){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date);
 const pick=(type:string)=>Number(parts.find(x=>x.type===type)?.value||0);
 const asUtc=Date.UTC(pick("year"),pick("month")-1,pick("day"),pick("hour"),pick("minute"),pick("second"));
 return Math.round((asUtc-date.getTime())/60000);
}
export function utcOffsetForBirth(date:string,time:string,timeZone:string){
 const m=(date+"T"+(time||"12:00")).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);if(!m)return"";
 let guess=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],0));
 let offset=offsetMinutesForInstant(guess,timeZone);
 guess=new Date(guess.getTime()-offset*60000);offset=offsetMinutesForInstant(guess,timeZone);
 const sign=offset<0?"-":"+",abs=Math.abs(offset),hh=String(Math.floor(abs/60)).padStart(2,"0"),mm=String(abs%60).padStart(2,"0");
 return sign+hh+":"+mm;
}

export function resolveBirthOffset(profile:{birthDate:string;birthTime:string;timeZoneId:string;utcOffset:string}):string{
 if(profile.timeZoneId){
  if(!profile.birthDate)return "";
  try{return utcOffsetForBirth(profile.birthDate,profile.birthTime||"12:00",profile.timeZoneId)}catch{return ""}
 }
 const offset=(profile.utcOffset||"").trim();
 if(!/^[+-]\d{2}:\d{2}$/.test(offset))return "";
 const hours=Number(offset.slice(1,3)),minutes=Number(offset.slice(4,6));
 return hours<=14&&minutes<=59&&(hours!==14||minutes===0)?offset:"";
}
