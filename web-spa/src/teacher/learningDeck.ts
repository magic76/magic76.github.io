export type DeckCategory="correction"|"hint"|"vocab"|"phrase";
export type DeckItem={id:string;category:DeckCategory;originalText:string;translation:string;notes:string;language?:string;createdAt:string;reviewCount:number;lastReviewedAt?:string;nextReviewAt?:string};
const KEY="crew_teacher_learning_deck_v1";
export function readLearningDeck():DeckItem[]{
 const raw=localStorage.getItem(KEY);
 if(raw===null)return [];
 const items=JSON.parse(raw);
 if(!Array.isArray(items)||items.some(item=>!item||typeof item.id!=="string"||typeof item.originalText!=="string")){
  throw new Error("Invalid saved phrase collection");
 }
 return items;
}
export function learningDeck():DeckItem[]{try{return readLearningDeck()}catch{return[]}}
function save(items:DeckItem[]){localStorage.setItem(KEY,JSON.stringify(items.slice(0,200)));return items}
export function addDeckItem(input:Omit<DeckItem,"id"|"createdAt"|"reviewCount">){
 const list=learningDeck(),language=String(input.language||""),key=language+"|"+input.originalText.trim().toLowerCase(),found=list.find(x=>(String(x.language||"")+"|"+x.originalText.trim().toLowerCase())===key);
 if(found){Object.assign(found,input);return save(list)}
 const item:DeckItem={...input,id:"deck_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),createdAt:new Date().toISOString(),reviewCount:0};
 return save([item,...list]);
}
export function removeDeckItem(id:string){return save(learningDeck().filter(x=>x.id!==id))}
export function reviewDeckItem(id:string){
 const list=learningDeck(),item=list.find(x=>x.id===id);if(!item)return list;
 item.reviewCount=(item.reviewCount||0)+1;item.lastReviewedAt=new Date().toISOString();
 const days=item.reviewCount>=5?14:item.reviewCount>=3?7:item.reviewCount>=1?2:1;
 item.nextReviewAt=new Date(Date.now()+days*86400000).toISOString();return save(list);
}
export function reviewStage(x:DeckItem){if((x.reviewCount||0)>=5)return"已熟悉";if((x.reviewCount||0)>=2)return"複習中";if((x.reviewCount||0)>=1)return"學習中";return"新加入"}
export function dueDeckItems(items=learningDeck()){const now=Date.now();return items.filter(x=>!x.nextReviewAt||new Date(x.nextReviewAt).getTime()<=now)}
export function saveReportLearning(report:any,language?:string){
 let list=learningDeck();
 for(const x of (report?.recasts||[]).slice(0,5)){if(x?.corrected)list=addDeckItem({category:"correction",originalText:String(x.corrected),translation:"",notes:[x.original&&"原句："+x.original,x.explanation].filter(Boolean).join(" · "),language})}
 for(const x of (report?.takeaways||[]).slice(0,6)){if(x?.phrase)list=addDeckItem({category:"phrase",originalText:String(x.phrase),translation:String(x.translation||""),notes:"課後報告重點",language})}
 return list;
}
