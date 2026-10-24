export type FriendId = "zoe" | "yuna" | "theo" | "hugo" | "bella" | "noah";
export type PlaceId = "cafe" | "studio" | "play" | "garden";
export type Selection = {type:"person";id:FriendId} | {type:"place";id:PlaceId} | null;
export type Waypoint = readonly [number,number];

export const PEOPLE: ReadonlyArray<{
 id:FriendId; coat:string; hair:string; skin:string; outfit:"dress"|"jacket";
 activityZh:string; activityEn:string; route:ReadonlyArray<Waypoint>;
}> = [
 {id:"zoe",outfit:"dress",coat:"#d98884",hair:"#614a50",skin:"#efbd9f",activityZh:"正走向咖啡館露台",activityEn:"Walking to the café terrace",route:[[-5.7,-.95],[-4.4,-.75],[-3.8,.55],[-4.7,.85]]},
 {id:"yuna",outfit:"dress",coat:"#88a99a",hair:"#433b45",skin:"#eed0b7",activityZh:"準備在咖啡館和 Zoe 會面",activityEn:"Meeting Zoe by the café",route:[[-3.3,1.15],[-4.05,.95],[-4.55,.20],[-3.8,.30]]},
 {id:"theo",outfit:"jacket",coat:"#84a7b9",hair:"#5f4c48",skin:"#e0b49d",activityZh:"在靈感工作室附近散步",activityEn:"Taking a break outside the studio",route:[[4,-.95],[2.9,.20],[3.45,1.1],[4.35,.45]]},
 {id:"hugo",outfit:"jacket",coat:"#d8a96e",hair:"#6a5143",skin:"#e4bda6",activityZh:"沿著鎮中央的步道探索",activityEn:"Strolling along the village path",route:[[-.3,-1.4],[.85,-.9],[1.7,.25],[.7,1.45],[-.35,.25]]},
 {id:"bella",outfit:"dress",coat:"#c58da5",hair:"#694755",skin:"#ebbdab",activityZh:"在遊戲屋外邀請朋友",activityEn:"Inviting friends outside the play house",route:[[-2.5,6.25],[-.95,6.2],[.1,5.95],[-.85,6.9]]},
 {id:"noah",outfit:"jacket",coat:"#8299a5",hair:"#4e4949",skin:"#e4bfad",activityZh:"在湖畔散步、欣賞風景",activityEn:"Taking in the lakeside view",route:[[3.0,4.0],[2.7,5.05],[3.15,6.15],[4.05,6.85],[4.25,7.05]]}
];
export const PLACES: ReadonlyArray<{
 id:PlaceId; zh:string; en:string; introZh:string; introEn:string; to:string; ctaZh:string; ctaEn:string;
 point:readonly [number,number,number];
}> = [
 {id:"cafe",zh:"日常咖啡館",en:"The Café",introZh:"Zoe 和 Yuna 常在這裡聊聊新甜點與日常故事。",introEn:"Where Zoe and Yuna share treats and everyday stories.",to:"/friend/live?id=zoe",ctaZh:"跟 Zoe 聊聊",ctaEn:"Chat with Zoe",point:[-5,1.1,-3]},
 {id:"studio",zh:"靈感工作室",en:"The Studio",introZh:"Theo 的創意工作室，交換想法和新點子。",introEn:"Theo's workshop for fresh ideas and creative experiments.",to:"/friend/live?id=theo",ctaZh:"跟 Theo 聊聊",ctaEn:"Chat with Theo",point:[4.7,1.2,-3]},
 {id:"play",zh:"遊戲屋",en:"Play House",introZh:"和 Crew 朋友們一起玩語音與益智遊戲。",introEn:"Discover voice-powered and thoughtful games in Crew Play.",to:"/games",ctaZh:"前往 Crew Play",ctaEn:"Explore Crew Play",point:[-2.2,1.2,4]},
 {id:"garden",zh:"湖畔花園",en:"Lakeside Garden",introZh:"沿著湖岸慢慢走，找 Noah 聊聊。",introEn:"Take a quiet lakeside walk and catch up with Noah.",to:"/friend/live?id=noah",ctaZh:"跟 Noah 聊聊",ctaEn:"Chat with Noah",point:[5.45,.5,4.75]}
];
export const WORLD_CENTER = [0,.2,.6] as const;
