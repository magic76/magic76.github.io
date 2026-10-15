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
export function accentLabel(language:string,region:string){return accentOptions(language).find(x=>x.value===normalizedAccent(language,region))?.label||"自動推薦";}
export function buildAccentPrompt(language:string,region:string,strength:AccentStrength="natural",custom=""){
 const normalized=normalizedAccent(language,region);
 if(normalized==="auto")return"";
 const choice=accentOptions(language).find(x=>x.value===normalized);
 const description=normalized==="custom"?custom.trim().slice(0,180):choice?.instruction||"";
 if(!description)return"";
 const intensity=strength==="subtle"?"Keep the regional features subtle.":strength==="noticeable"?"Make the region recognizable but never exaggerated.":"Keep the region natural and unforced.";
 return "Speaking style: sound like "+description+". "+intensity+" Do not parody or exaggerate an accent. Accent is a voice-style preference, not a guarantee of the generated model's output.";
}
export function buildPacePrompt(pace:SpeakingPace="normal"){
 if(pace==="slow")return"Speech pace: speak slightly more slowly, with natural rhythm and clear phrasing; do not stretch syllables unnaturally.";
 if(pace==="fast")return"Speech pace: use a lively, natural conversational tempo without rushing or reducing intelligibility.";
 return"Speech pace: use a comfortable natural conversational tempo.";
}
