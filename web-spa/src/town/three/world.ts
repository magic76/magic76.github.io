import {LANDMARKS} from "./TownLayout";
export const TOWN_FRIEND_IDS=[
 "zoe","noah","iris","max","yuna","felix","luna","theo",
 "isla","hugo","ada","finn","maya","oscar","bella","ryan"
] as const;
export type FriendId=(typeof TOWN_FRIEND_IDS)[number];
export type PlaceId = "cafe" | "studio" | "play" | "garden";
export type Selection = {type:"person";id:FriendId} | {type:"place";id:PlaceId} | null;
export type Waypoint = readonly [number,number];
export type DistrictId="center"|"market"|"grove"|"homes"|"harbor";
export const WORLD_SIZE={width:52,depth:44} as const;
export const DISTRICTS:ReadonlyArray<{
 id:DistrictId;zh:string;en:string;icon:string;point:readonly [number,number,number];
}>=[
 {id:"center",zh:"中央廣場",en:"Town center",icon:"✦",point:[0,.7,.6]},
 {id:"market",zh:"彩虹市集",en:"Rainbow Market",icon:"◈",point:[-16,.8,-12]},
 {id:"grove",zh:"楓葉森林",en:"Maple Grove",icon:"♣",point:[16,.8,-12]},
 {id:"homes",zh:"故事街區",en:"Story Lane",icon:"⌂",point:[-16,.8,12]},
 {id:"harbor",zh:"星光港灣",en:"Starlight Harbor",icon:"≈",point:[16,.8,12]}
];

export type TownPerson={
 id:FriendId;coat:string;hair:string;skin:string;outfit:"dress"|"jacket";
 startNode:string;activityZh:string;activityEn:string;
};
export const PEOPLE:ReadonlyArray<TownPerson>=[
 {id:"zoe",outfit:"dress",coat:"#d98884",hair:"#614a50",skin:"#efbd9f",startNode:"s0",activityZh:"在中央廣場散步",activityEn:"Strolling through the town center"},
 {id:"noah",outfit:"jacket",coat:"#8299a5",hair:"#4e4949",skin:"#e4bfad",startNode:"b0",activityZh:"沿星光港灣的步道散步",activityEn:"Walking near the harbor"},
 {id:"iris",outfit:"dress",coat:"#bd8ecc",hair:"#51445a",skin:"#e7bea9",startNode:"m0",activityZh:"逛彩虹市集找靈感",activityEn:"Exploring the colorful market"},
 {id:"max",outfit:"jacket",coat:"#e29c68",hair:"#5d4736",skin:"#dfae8c",startNode:"g0",activityZh:"在森林裡探索",activityEn:"Exploring the grove"},
 {id:"yuna",outfit:"dress",coat:"#88a99a",hair:"#433b45",skin:"#eed0b7",startNode:"s2",activityZh:"在中央廣場和朋友相遇",activityEn:"Meeting friends by the square"},
 {id:"felix",outfit:"jacket",coat:"#8899cf",hair:"#49485e",skin:"#e1bda8",startNode:"m3",activityZh:"在市集裡尋找新話題",activityEn:"Finding new ideas at the market"},
 {id:"luna",outfit:"dress",coat:"#9887be",hair:"#3d3b60",skin:"#eac4b4",startNode:"g3",activityZh:"在楓葉森林裡散步",activityEn:"Wandering among the trees"},
 {id:"theo",outfit:"jacket",coat:"#84a7b9",hair:"#5f4c48",skin:"#e0b49d",startNode:"s3",activityZh:"從工作室出來透透氣",activityEn:"Taking a break near the studio"},
 {id:"isla",outfit:"dress",coat:"#c59b85",hair:"#72594b",skin:"#ebc7b0",startNode:"h3",activityZh:"在故事街區尋找故事",activityEn:"Discovering stories along Story Lane"},
 {id:"hugo",outfit:"jacket",coat:"#d8a96e",hair:"#6a5143",skin:"#e4bda6",startNode:"s1",activityZh:"探索小鎮的美食與角落",activityEn:"Exploring food and hidden corners"},
 {id:"ada",outfit:"dress",coat:"#7caeba",hair:"#4b5c54",skin:"#e2b59f",startNode:"g6",activityZh:"在森林裡尋找新點子",activityEn:"Sketching ideas by the grove"},
 {id:"finn",outfit:"jacket",coat:"#9eb96b",hair:"#795c42",skin:"#e5c2a3",startNode:"m6",activityZh:"逛完市集準備去運動",activityEn:"Heading out after the market"},
 {id:"maya",outfit:"dress",coat:"#ba88ac",hair:"#53434b",skin:"#e8b6a1",startNode:"h6",activityZh:"在故事街區散步",activityEn:"Exploring the story neighborhood"},
 {id:"oscar",outfit:"jacket",coat:"#7e91a2",hair:"#4a4445",skin:"#dfbea8",startNode:"b3",activityZh:"在港灣看船隻往來",activityEn:"Watching boats at the harbor"},
 {id:"bella",outfit:"dress",coat:"#c58da5",hair:"#694755",skin:"#ebbdab",startNode:"h0",activityZh:"在故事街區邀請朋友",activityEn:"Meeting friends on Story Lane"},
 {id:"ryan",outfit:"jacket",coat:"#8da988",hair:"#514c44",skin:"#e2bba6",startNode:"b6",activityZh:"在港灣悠閒散步",activityEn:"Taking a calm harbor walk"},
];
// The 3D friends are the same identities as the canonical 16 Friend profiles,
// so clicking an actor always hands off to /friend/live?id=<id>.

export const PLACES: ReadonlyArray<{
 id:PlaceId; zh:string; en:string; introZh:string; introEn:string; to:string; ctaZh:string; ctaEn:string;
 point:readonly [number,number,number];
}> = [
 {id:"cafe",zh:"日常咖啡館",en:"The Café",introZh:"Zoe 和 Yuna 常在這裡聊聊新甜點與日常故事。",introEn:"Where Zoe and Yuna share treats and everyday stories.",to:"/friend/live?id=zoe",ctaZh:"跟 Zoe 聊聊",ctaEn:"Chat with Zoe",point:[LANDMARKS.cafe[0],1.1,LANDMARKS.cafe[1]]},
 {id:"studio",zh:"靈感工作室",en:"The Studio",introZh:"Theo 的創意工作室，交換想法和新點子。",introEn:"Theo's workshop for fresh ideas and creative experiments.",to:"/friend/live?id=theo",ctaZh:"跟 Theo 聊聊",ctaEn:"Chat with Theo",point:[LANDMARKS.studio[0],1.2,LANDMARKS.studio[1]]},
 {id:"play",zh:"遊戲屋",en:"Play House",introZh:"和 Crew 朋友們一起玩語音與益智遊戲。",introEn:"Discover voice-powered and thoughtful games in Crew Play.",to:"/games",ctaZh:"前往 Crew Play",ctaEn:"Explore Crew Play",point:[LANDMARKS.play[0],1.2,LANDMARKS.play[1]]},
 {id:"garden",zh:"湖畔花園",en:"Lakeside Garden",introZh:"沿著湖岸慢慢走，找 Noah 聊聊。",introEn:"Take a quiet lakeside walk and catch up with Noah.",to:"/friend/live?id=noah",ctaZh:"跟 Noah 聊聊",ctaEn:"Chat with Noah",point:[5.45,.5,4.75]}
];
export const WORLD_CENTER = [0,.2,.6] as const;
