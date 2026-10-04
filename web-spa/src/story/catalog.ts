export type StoryPage={text:string;imageIndex?:number;emotion?:string;characterName?:string;dialogue?:string;context?:any};
export type StoryBook={id:string;title:string;summary?:string;coverEmoji?:string;coverIndex?:number;images?:any[];pages:StoryPage[];currentPage?:number;createdAt?:string;updatedAt?:string;sourceType?:"user"|"built-in";readingMode?:"generated"|"physical";language?:string;tags?:string[];ageGroup?:string;estimatedMinutes?:number};

export const BUILT_IN_STORIES:StoryBook[]=[
 {id:"builtin_star_fox",title:"小狐狸與掉下來的星星",summary:"小狐狸在森林裡陪一顆迷路的小星星找到回家的方向。",coverEmoji:"✦",sourceType:"built-in",readingMode:"generated",language:"zh-TW",tags:["冒險","友情","睡前"],ageGroup:"5–10",estimatedMinutes:4,pages:[
  {text:"夜裡，小狐狸米米發現草叢裡有一點微弱的金光。那不是螢火蟲，而是一顆從天空掉下來的小星星。",emotion:"mysterious"},
  {text:"小星星記不得回家的路，只知道要去森林最高的地方。米米決定陪它一起找。",emotion:"warm"},
  {text:"他們越過小溪、穿過會唱歌的竹林，最後爬上老橡樹旁的小山丘。",emotion:"excited"},
  {text:"雲散開時，小星星看見熟悉的星座。它亮得越來越強，輕輕飛回天空，留下了一小束光陪米米回家。",emotion:"tender"}
 ]},
 {id:"builtin_cloud_train",title:"雲朵列車晚點了",summary:"一班載著動物去看夕陽的雲朵列車，第一次遇到下雨。",coverEmoji:"☁",sourceType:"built-in",readingMode:"generated",language:"zh-TW",tags:["搞笑","想像","旅行"],ageGroup:"4–9",estimatedMinutes:3,pages:[
  {text:"每天傍晚，雲朵列車都會準時停在山頂月台。今天，車長兔子卻一直看著手錶。",emotion:"joyful"},
  {text:"原來前方的雲正在下大雨，鐵軌變得像果凍一樣軟。乘客們只好一起想辦法。",emotion:"excited"},
  {text:"大象用鼻子吹乾一段，小鳥從空中指路，蝸牛則提醒大家慢慢來也沒關係。",emotion:"warm"},
  {text:"列車雖然晚了，大家卻剛好看見雨後最亮的一道彩虹。",emotion:"tender"}
 ]},
 {id:"builtin_brave_seed",title:"不敢發芽的小種子",summary:"一顆擔心自己長不好的種子，慢慢找到願意試一次的勇氣。",coverEmoji:"🌱",sourceType:"built-in",readingMode:"generated",language:"zh-TW",tags:["成長","勇氣","溫暖"],ageGroup:"4–8",estimatedMinutes:3,pages:[
  {text:"泥土裡住著一顆小種子。它聽見外面有風、有雨，還有好多未知的聲音，所以一直不敢發芽。",emotion:"whisper"},
  {text:"蚯蚓告訴它：「你不用一次長成大樹，只要先伸出一小點根就好。」",emotion:"warm"},
  {text:"小種子試著往下伸出一條細細的根，又往上頂出一個嫩芽。",emotion:"excited"},
  {text:"它沒有立刻變成大樹，但第一次看見了天空。原來勇敢有時只是願意先試一點點。",emotion:"tender"}
 ]}
];

export function builtInStory(id:string){return BUILT_IN_STORIES.find(x=>x.id===id)||null}
