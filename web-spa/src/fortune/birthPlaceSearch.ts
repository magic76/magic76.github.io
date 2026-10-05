export type BirthPlaceResult={name:string;admin1:string;country:string;countryCode:string;latitude:number;longitude:number;timezone:string;displayName:string};

export async function searchBirthPlaces(query:string):Promise<BirthPlaceResult[]>{
 const clean=query.trim();if(clean.length<2)return[];
 const language=(navigator.language||"en").split("-")[0].toLowerCase();
 const url="https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(clean)+"&count=8&language="+encodeURIComponent(language)+"&format=json";
 const r=await fetch(url,{headers:{Accept:"application/json"}});
 if(!r.ok)throw new Error("出生地搜尋服務暫時無法使用");
 const data=await r.json(),rows=Array.isArray(data.results)?data.results:[];
 return rows.filter((x:any)=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)&&x.timezone).map((x:any)=>{
  const parts=[x.name,x.admin1,x.country].filter(Boolean).filter((v:string,i:number,a:string[])=>a.indexOf(v)===i);
  return{name:x.name||"",admin1:x.admin1||"",country:x.country||"",countryCode:x.country_code||"",latitude:Number(x.latitude),longitude:Number(x.longitude),timezone:String(x.timezone),displayName:parts.join(", ")||String(x.country_code||"")};
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
