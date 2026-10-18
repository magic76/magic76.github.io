// Local-only preview seed content. Never sent to the shared D1 board.
type Kind="swap"|"sell"|"give"|"want"|"share"|"ask";
type Category="books"|"toys"|"school"|"clothes"|"events"|"life"|"other";
type Status="open"|"reserved"|"closed";
type Post={id:string;author:string;title:string;description:string;kind:Kind;category?:Category;price:number|null;status:Status;createdAt:string;updatedAt?:string;commentCount:number;photoIds?:string[]};
type Comment={id:string;postId:string;author:string;message:string;createdAt:string};
const now=new Date().toISOString();
export const seed:Post[]=[
 {id:"sample-1",author:"安安媽媽",title:"英文繪本 3 本",description:"孩子長大了，想換適合小學中年級的英文故事書。書況良好。",kind:"swap",category:"books",price:null,status:"open",createdAt:now,commentCount:2},
 {id:"sample-2",author:"晴晴媽媽",title:"兒童百科全書 5 冊",description:"家中書櫃整理，一套 5 本，內頁乾淨，可以面交。",kind:"sell",category:"books",price:300,status:"open",createdAt:now,commentCount:1},
 {id:"sample-3",author:"Emma 媽媽",title:"親子週末活動推薦",description:"這週末有推薦的小朋友戶外活動嗎？想找適合低年級的行程。",kind:"ask",category:"events",price:null,status:"open",createdAt:now,commentCount:0},
 {id:"sample-4",author:"小悠媽媽",title:"學校運動會用品分享",description:"找到很實用的準備清單，歡迎大家補充自己的經驗。",kind:"share",category:"school",price:null,status:"open",createdAt:now,commentCount:0},
 {id:"sample-5",author:"樂樂媽媽",title:"拼圖和積木想送給需要的小朋友",description:"整理出幾盒孩子長大後少玩的玩具，希望找到願意繼續玩的家庭。",kind:"give",category:"toys",price:null,status:"open",createdAt:now,commentCount:0}
];
export const examples:Comment[]=[
 {id:"sample-c1",postId:"sample-1",author:"小悠媽媽",message:"想請問這三本大概適合幾歲呢？",createdAt:now},
 {id:"sample-c2",postId:"sample-1",author:"安安媽媽",message:"大約 6–9 歲，我家小二看得很開心。",createdAt:now},
 {id:"sample-c3",postId:"sample-2",author:"樂樂媽媽",message:"請問可以單買其中兩本嗎？",createdAt:now}
];
