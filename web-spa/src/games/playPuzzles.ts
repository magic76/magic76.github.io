export type PlayLanguage="zh"|"en";
export type Bilingual={zh:string;en:string};
export const copy=(value:Bilingual,english:boolean)=>value[english?"en":"zh"];

export type TwentyItem={
 id:string;name:Bilingual;aliases:string[];traits:string[];
 facts?:{question:Bilingual;answer:boolean}[];
};
export const twentyQuestions:{id:string;label:Bilingual}[]=[
 {id:"alive",label:{zh:"它是活的嗎？",en:"Is it alive?"}},
 {id:"animal",label:{zh:"它是動物嗎？",en:"Is it an animal?"}},
 {id:"food",label:{zh:"它可以吃嗎？",en:"Can you eat it?"}},
 {id:"made",label:{zh:"它是人造的嗎？",en:"Is it made by people?"}},
 {id:"electric",label:{zh:"它需要電嗎？",en:"Does it need electricity?"}},
 {id:"portable",label:{zh:"可以單手拿起來嗎？",en:"Can you lift it with one hand?"}},
 {id:"outdoors",label:{zh:"通常在戶外看到它嗎？",en:"Is it usually seen outdoors?"}},
 {id:"transport",label:{zh:"它能載人移動嗎？",en:"Can it carry people?"}},
 {id:"nature",label:{zh:"它來自大自然嗎？",en:"Does it occur naturally?"}},
 {id:"plant",label:{zh:"它是植物嗎？",en:"Is it a plant?"}},
 {id:"round",label:{zh:"它通常是圓形的嗎？",en:"Is it usually round?"}},
 {id:"water",label:{zh:"它和水有關嗎？",en:"Is it closely associated with water?"}}
];
export const twentyItems:TwentyItem[]=[
 {id:"cat",name:{zh:"貓",en:"cat"},aliases:["貓","貓咪","cat","kitty"],traits:["alive","animal","portable","nature"]},
 {id:"apple",name:{zh:"蘋果",en:"apple"},aliases:["蘋果","apple"],traits:["food","portable","nature","plant","round"]},
 {id:"bike",name:{zh:"腳踏車",en:"bicycle"},aliases:["腳踏車","單車","自行車","bike","bicycle"],traits:["made","outdoors","transport"]},
 {id:"phone",name:{zh:"手機",en:"phone"},aliases:["手機","電話","智慧型手機","phone","smartphone"],traits:["made","electric","portable"]},
 {id:"tree",name:{zh:"樹",en:"tree"},aliases:["樹","樹木","tree"],traits:["alive","nature","plant","outdoors"]},
 {id:"fish",name:{zh:"魚",en:"fish"},aliases:["魚","魚兒","fish"],traits:["alive","animal","nature","water"]},
 {id:"moon",name:{zh:"月亮",en:"moon"},aliases:["月亮","月球","moon"],traits:["nature","outdoors","round"]},
 {id:"camera",name:{zh:"相機",en:"camera"},aliases:["相機","攝影機","camera"],traits:["made","electric","portable"]},
 {id:"boat",name:{zh:"船",en:"boat"},aliases:["船","小船","boat","ship"],traits:["made","outdoors","transport","water"]},
 {id:"bread",name:{zh:"麵包",en:"bread"},aliases:["麵包","bread"],traits:["food","made","portable"]},
 {id:"umbrella",name:{zh:"雨傘",en:"umbrella"},aliases:["雨傘","傘","umbrella"],traits:["made","portable","outdoors","water"]},
 {id:"flower",name:{zh:"花",en:"flower"},aliases:["花","花朵","flower"],traits:["alive","nature","plant","portable"]}
];

export type MysteryClue={id:string;question:Bilingual;answer:boolean;detail?:Bilingual};
export type MysteryCase={
 id:string;story:Bilingual;solution:Bilingual;clues:MysteryClue[];
};
export const mysteryCases:MysteryCase[]=[
 {id:"lift",story:{zh:"一個人住在十樓。平常搭電梯只到七樓，再走樓梯到家；下雨天卻可以直接搭到十樓。為什麼？",en:"Someone lives on the 10th floor. Normally they ride the elevator to the 7th and walk up. On rainy days, they ride straight to the 10th. Why?"},
 solution:{zh:"這個人個子矮，平常按不到十樓按鈕。下雨天帶著長雨傘，就能用雨傘按到十樓。",en:"The person is short and cannot reach the 10th-floor button. On rainy days they have a long umbrella to press it."},
 clues:[
 {id:"height",question:{zh:"和他的身高有關嗎？",en:"Does their height matter?"},answer:true},
 {id:"liftbroken",question:{zh:"電梯有故障嗎？",en:"Is the elevator broken?"},answer:false},
 {id:"umbrella",question:{zh:"下雨天帶的東西有幫助嗎？",en:"Does something carried on rainy days help?"},answer:true},
 {id:"alone",question:{zh:"他平常是一個人搭電梯嗎？",en:"Do they normally ride alone?"},answer:true},
 {id:"buttons",question:{zh:"和電梯按鈕有關嗎？",en:"Is it about the elevator buttons?"},answer:true}
 ]},
 {id:"hair",story:{zh:"一個人走在大雨裡二十分鐘，沒有帽子也沒有雨傘，頭髮卻完全沒濕。這不是夢，為什麼？",en:"A person walks in heavy rain for twenty minutes with no hat or umbrella. Not a strand of hair gets wet. Why?"},
 solution:{zh:"他是光頭，根本沒有頭髮可以淋濕。",en:"They are bald and have no hair to get wet."},
 clues:[
 {id:"indoors",question:{zh:"他其實待在室內嗎？",en:"Was the person indoors?"},answer:false},
 {id:"rainreal",question:{zh:"雨真的有淋到他嗎？",en:"Did the rain touch the person?"},answer:true},
 {id:"hair",question:{zh:"他有頭髮嗎？",en:"Does the person have hair?"},answer:false},
 {id:"magic",question:{zh:"有魔法或特殊裝備嗎？",en:"Is magic or special gear involved?"},answer:false}
 ]},
 {id:"coffee",story:{zh:"一位客人每天都在咖啡店買一杯咖啡，自己從來不喝，卻總是心滿意足地離開。為什麼？",en:"A customer buys a coffee at the same cafe every day, never drinks it, and always leaves smiling. Why?"},
 solution:{zh:"他每天都會幫下一位陌生客人預付一杯咖啡，讓別人免費享用。",en:"They pay it forward by purchasing coffee for the next stranger."},
 clues:[
 {id:"gift",question:{zh:"咖啡是給別人喝的嗎？",en:"Is someone else drinking the coffee?"},answer:true},
 {id:"waste",question:{zh:"咖啡被丟掉了嗎？",en:"Is the coffee thrown away?"},answer:false},
 {id:"staff",question:{zh:"這和店員的工作有關嗎？",en:"Is this part of the barista's job?"},answer:false},
 {id:"kind",question:{zh:"這件事和善意有關嗎？",en:"Is kindness involved?"},answer:true}
 ]},
 {id:"photo",story:{zh:"一個女孩每次照相都閉上眼睛，但大家看完照片卻都稱讚她拍得很好。為什麼？",en:"A girl always closes her eyes when taking photos, yet everyone praises her beautiful pictures. Why?"},
 solution:{zh:"她是站在相機後面的攝影師。她在按快門時閉上一隻眼，用另一隻眼看觀景窗，並不是照片裡的人。",en:"She is the photographer behind the camera. She closes one eye to look through the viewfinder with the other."},
 clues:[
 {id:"selfie",question:{zh:"她是在自拍嗎？",en:"Is she taking selfies?"},answer:false},
 {id:"behind",question:{zh:"她站在相機後面嗎？",en:"Is she standing behind the camera?"},answer:true},
 {id:"both",question:{zh:"她兩隻眼睛都閉上嗎？",en:"Does she close both eyes?"},answer:false},
 {id:"pro",question:{zh:"她是攝影師嗎？",en:"Is she a photographer?"},answer:true}
 ]}
];

export function normalizeGuess(text:string){
 return text.trim().toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu,"");
}
export function correctGuess(item:TwentyItem,guess:string){
 const value=normalizeGuess(guess);
 return value.length>0&&item.aliases.some(alias=>normalizeGuess(alias)===value);
}
