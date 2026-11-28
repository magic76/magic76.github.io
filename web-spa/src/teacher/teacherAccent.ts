import type{AccentStrength,LanguageStyle,SpeakingPace}from"../store/teacherStore";
type Region={value:LanguageStyle;label:string;instruction:string};
const options:Record<string,Region[]>={
 "英文":[{value:"us",label:"美國",instruction:"a contemporary speaker from the United States"},{value:"gb",label:"英國",instruction:"a contemporary speaker from the United Kingdom"},{value:"au",label:"澳洲",instruction:"a contemporary speaker from Australia"},{value:"sg",label:"新加坡",instruction:"a contemporary English speaker from Singapore"},{value:"in",label:"印度",instruction:"a contemporary English speaker from India"}],
 "日文":[{value:"standard",label:"標準日語／東京",instruction:"a contemporary speaker of standard Japanese with a natural Tokyo-area accent"},{value:"kansai",label:"關西",instruction:"a contemporary Japanese speaker from the Kansai region"}],
 "韓文":[{value:"seoul",label:"標準韓語／首爾",instruction:"a contemporary Korean speaker from Seoul"},{value:"gyeongsang",label:"慶尚道／釜山",instruction:"a contemporary Korean speaker from the Gyeongsang region"}],
 "西班牙文":[{value:"es",label:"西班牙",instruction:"a contemporary Spanish speaker from Spain"},{value:"mx",label:"墨西哥",instruction:"a contemporary Spanish speaker from Mexico"},{value:"ar",label:"阿根廷",instruction:"a contemporary Spanish speaker from Argentina"},{value:"co",label:"哥倫比亞",instruction:"a contemporary Spanish speaker from Colombia"}],
 "法文":[{value:"fr",label:"法國",instruction:"a contemporary French speaker from France"},{value:"qc",label:"加拿大魁北克",instruction:"a contemporary French speaker from Quebec"},{value:"be",label:"比利時",instruction:"a contemporary French speaker from Belgium"},{value:"ch",label:"瑞士",instruction:"a contemporary French speaker from Switzerland"}],
 "德文":[{value:"de",label:"德國",instruction:"a contemporary German speaker from Germany"},{value:"at",label:"奧地利",instruction:"a contemporary German speaker from Austria"},{value:"ch",label:"瑞士",instruction:"a contemporary German speaker from Switzerland"}],
 "義大利文":[{value:"standard",label:"標準義大利語",instruction:"a contemporary speaker of standard Italian"},{value:"rome",label:"羅馬",instruction:"a contemporary Italian speaker from Rome"},{value:"milan",label:"米蘭",instruction:"a contemporary Italian speaker from Milan"}],
 "越南文":[{value:"north",label:"北部／河內",instruction:"a contemporary Vietnamese speaker from Hanoi using a Northern accent"},{value:"south",label:"南部／胡志明市",instruction:"a contemporary Vietnamese speaker from Ho Chi Minh City using a Southern accent"},{value:"central",label:"中部",instruction:"a contemporary Vietnamese speaker using a natural Central Vietnamese accent"}],
 "泰文":[{value:"central",label:"中部／曼谷",instruction:"a contemporary Thai speaker from Bangkok using Central Thai"},{value:"north",label:"北部／清邁",instruction:"a contemporary Thai speaker from Chiang Mai"},{value:"isan",label:"依善／東北",instruction:"a contemporary Thai speaker from the Isan region"}],
 "中文":[{value:"tw",label:"台灣華語",instruction:"a contemporary Mandarin speaker from Taiwan"},{value:"cn",label:"中國大陸普通話",instruction:"a contemporary Mandarin speaker from mainland China"},{value:"sg",label:"新加坡華語",instruction:"a contemporary Mandarin speaker from Singapore"}],
 "葡萄牙文":[{value:"br",label:"巴西",instruction:"a contemporary Portuguese speaker from Brazil"},{value:"pt",label:"葡萄牙",instruction:"a contemporary Portuguese speaker from Portugal"}],
 "印尼文":[{value:"standard",label:"標準印尼語",instruction:"a contemporary speaker of standard Indonesian"},{value:"jakarta",label:"雅加達",instruction:"a contemporary Indonesian speaker from Jakarta"}]
};
export function accentOptions(language:string):Region[]{return[{value:"auto",label:"自動推薦",instruction:""},...(options[language]||[]),{value:"custom",label:"自訂風格",instruction:""}]}
export function normalizedAccent(language:string,region:string):LanguageStyle{
 return accentOptions(language).some(x=>x.value===region)?region as LanguageStyle:"auto";
}
// Region display names are independent of model instructions and the selected learning language.
const regionCodes:Partial<Record<LanguageStyle,string>>={us:"US",gb:"GB",au:"AU",sg:"SG",in:"IN",es:"ES",mx:"MX",ar:"AR",co:"CO",fr:"FR",be:"BE",ch:"CH",tw:"TW",cn:"CN",de:"DE",at:"AT",br:"BR",pt:"PT"};
const specialLabels:Record<string,Record<string,string>>={
 en:{standard:"Standard",kansai:"Kansai",seoul:"Seoul",gyeongsang:"Gyeongsang / Busan",qc:"Québec",rome:"Rome",milan:"Milan",north:"Northern",south:"Southern",central:"Central",isan:"Isan / Northeast",jakarta:"Jakarta"},
 ja:{standard:"標準語",kansai:"関西",seoul:"ソウル",gyeongsang:"慶尚道／釜山",qc:"ケベック",rome:"ローマ",milan:"ミラノ",north:"北部",south:"南部",central:"中部",isan:"イサーン／東北部",jakarta:"ジャカルタ"},
 ko:{standard:"표준어",kansai:"간사이",seoul:"서울",gyeongsang:"경상도 / 부산",qc:"퀘벡",rome:"로마",milan:"밀라노",north:"북부",south:"남부",central:"중부",isan:"이산 / 북동부",jakarta:"자카르타"},
 vi:{standard:"Chuẩn",kansai:"Kansai",seoul:"Seoul",gyeongsang:"Gyeongsang / Busan",qc:"Québec",rome:"Roma",milan:"Milano",north:"Miền Bắc",south:"Miền Nam",central:"Miền Trung",isan:"Isan / Đông Bắc",jakarta:"Jakarta"},
 es:{standard:"Estándar",kansai:"Kansai",seoul:"Seúl",gyeongsang:"Gyeongsang / Busan",qc:"Quebec",rome:"Roma",milan:"Milán",north:"Norte",south:"Sur",central:"Centro",isan:"Isan / Nordeste",jakarta:"Yakarta"},
 fr:{standard:"Standard",kansai:"Kansai",seoul:"Séoul",gyeongsang:"Gyeongsang / Busan",qc:"Québec",rome:"Rome",milan:"Milan",north:"Nord",south:"Sud",central:"Centre",isan:"Isan / Nord-Est",jakarta:"Jakarta"},
 de:{standard:"Standard",kansai:"Kansai",seoul:"Seoul",gyeongsang:"Gyeongsang / Busan",qc:"Québec",rome:"Rom",milan:"Mailand",north:"Norden",south:"Süden",central:"Zentral",isan:"Isan / Nordosten",jakarta:"Jakarta"},
 pt:{standard:"Padrão",kansai:"Kansai",seoul:"Seul",gyeongsang:"Gyeongsang / Busan",qc:"Quebec",rome:"Roma",milan:"Milão",north:"Norte",south:"Sul",central:"Central",isan:"Isan / Nordeste",jakarta:"Jacarta"},
 id:{standard:"Baku",kansai:"Kansai",seoul:"Seoul",gyeongsang:"Gyeongsang / Busan",qc:"Quebec",rome:"Roma",milan:"Milan",north:"Utara",south:"Selatan",central:"Tengah",isan:"Isan / Timur Laut",jakarta:"Jakarta"},
 th:{standard:"มาตรฐาน",kansai:"คันไซ",seoul:"โซล",gyeongsang:"คยองซัง / ปูซาน",qc:"ควิเบก",rome:"โรม",milan:"มิลาน",north:"ภาคเหนือ",south:"ภาคใต้",central:"ภาคกลาง",isan:"อีสาน / ตะวันออกเฉียงเหนือ",jakarta:"จาการ์ตา"}
};
export function accentLabel(language:string,region:string,locale="zh-TW",automatic="Auto",custom="Custom"){
 const value=normalizedAccent(language,region),choice=accentOptions(language).find(x=>x.value===value);
 if(locale.toLowerCase().startsWith("zh"))return choice?.label||"自動推薦";
 if(value==="auto")return automatic;if(value==="custom")return custom;
 const code=regionCodes[value];
 if(code){try{return new Intl.DisplayNames([locale],{type:"region"}).of(code)||specialLabels.en[value]||code}catch{return code}}
 return specialLabels[locale.split("-")[0]]?.[value]||specialLabels.en[value]||choice?.label||value;
}

export type RegionalPreference={region:LanguageStyle;strength:AccentStrength;custom:string};
export type RegionalRole="teacher"|"friend";
type AccentStorage=Pick<Storage,"getItem"|"setItem">;
const preferenceKey=(language:string,role:RegionalRole)=>"crew_teacher_regional_v1:"+role+":"+language;
export function readRegionalPreference(storage:AccentStorage,language:string,role:RegionalRole,legacy=false):RegionalPreference{
 let data:Partial<RegionalPreference>={};
 try{
  const saved=storage.getItem(preferenceKey(language,role));
  if(saved){const parsed=JSON.parse(saved);if(parsed&&typeof parsed==="object")data=parsed;}
  else if(legacy){
   const read=(key:string)=>storage.getItem("crew_teacher_"+key);
   data={region:(role==="friend"?read("friendLanguageStyle")??read("languageStyle"):read("languageStyle")) as LanguageStyle,
    strength:(role==="friend"?read("friendAccentStrength")??read("accentStrength"):read("accentStrength")) as AccentStrength,
    custom:(role==="friend"?read("friendCustomAccent")??read("customAccent"):read("customAccent"))||""};
  }
 }catch{/* Invalid or restricted storage falls back to defaults. */}
 return {region:normalizedAccent(language,typeof data.region==="string"?data.region:"auto"),strength:data.strength==="subtle"||data.strength==="noticeable"?data.strength:"natural",custom:typeof data.custom==="string"?data.custom.slice(0,180):""};
}
export function writeRegionalPreference(storage:AccentStorage,language:string,role:RegionalRole,preference:RegionalPreference){
 storage.setItem(preferenceKey(language,role),JSON.stringify({...preference,region:normalizedAccent(language,preference.region),custom:preference.custom.slice(0,180)}));
}
export function buildAccentPrompt(language:string,region:string,strength:AccentStrength="natural",custom=""){
 const normalized=normalizedAccent(language,region);
 if(normalized==="auto")return"";
 const choice=accentOptions(language).find(x=>x.value===normalized);
 const description=normalized==="custom"?custom.trim().slice(0,180):choice?.instruction||"";
 if(!description)return"";
 const intensity=strength==="subtle"?"Keep the regional features subtle.":strength==="noticeable"?"Make the region recognizable but never exaggerated.":"Keep the region natural and unforced.";
 return "Regional language style: when speaking the selected TARGET language, sound like "+description+". "+intensity+" Use authentic pronunciation, intonation and everyday regional vocabulary and spelling where appropriate. Keep standard-language instruction as the baseline; explain regional variants when useful, never replace the target language or switch into a different dialect/language unless the learner explicitly requests it. In bilingual explanations keep the support language natural. Do not parody or exaggerate an accent. Accent is a voice-style preference, not a guarantee of the generated model's output.";
}
export function buildPacePrompt(pace:SpeakingPace="normal"){
 if(pace==="slow")return"Speech pace: speak slightly more slowly, with natural rhythm and clear phrasing; do not stretch syllables unnaturally.";
 if(pace==="fast")return"Speech pace: use a lively, natural conversational tempo without rushing or reducing intelligibility.";
 return"Speech pace: use a comfortable natural conversational tempo.";
}
