import{useMemo,useRef}from"react";
import{useLiveSession}from"../../live/useLiveSession";
import type{StoryBook,StoryPage}from"../catalog";
import{pageNarrationPrompt,storyNarratorSystem}from"./narration";

function voice(){return localStorage.getItem("crew_story_voice")||"Leda"}

export function useStoryNarrator(book:StoryBook,index:number,page:StoryPage,image:any,onPageAdvance?:(nextIndex:number)=>void){
 const pausedRef=useRef(false),narrationPageRef=useRef<number|null>(null),turnCompleteRef=useRef<(turn:{hasValidOutput?:boolean;output?:string})=>void>(()=>{});
 const system=useMemo(()=>storyNarratorSystem(book),[book]);
 const openingPrompt=useMemo(()=>pageNarrationPrompt(book,page,index),[book,page,index]);
 const live=useLiveSession({
  pageKey:"story_player",
  title:book.title||"Story Player",
  system,
  openingPrompt:image?"":openingPrompt,
  voice:voice(),
  onTurnComplete:turn=>turnCompleteRef.current(turn)
 });

 function sendNarration(nextPage:StoryPage,nextIndex:number,nextImage:any){
  narrationPageRef.current=nextIndex;
  const prompt=pageNarrationPrompt(book,nextPage,nextIndex);
  if(nextImage)void live.sendPreparedImage(nextImage,prompt);
  else live.sendText(prompt);
 }

 turnCompleteRef.current=turn=>{
  const completedPage=narrationPageRef.current;
  narrationPageRef.current=null;
  if(!turn?.hasValidOutput||pausedRef.current||completedPage===null||book.readingMode==="physical")return;
  const nextIndex=completedPage+1;
  if(nextIndex>=book.pages.length)return;
  const nextPage=book.pages[nextIndex]||{text:""};
  const nextImage=(book.images||[])[Number(nextPage.imageIndex)];
  onPageAdvance?.(nextIndex);
  window.setTimeout(()=>sendNarration(nextPage,nextIndex,nextImage),120);
 };

 async function startOrResume(){
  if(live.state==="speaking"){
   pausedRef.current=true;
   narrationPageRef.current=null;
   live.interrupt();
   return;
  }
  if(["idle","ended","error"].includes(live.state)){
   pausedRef.current=false;
   narrationPageRef.current=index;
   await live.start();
   if(image)window.setTimeout(()=>sendNarration(page,index,image),80);
   return;
  }
  if(live.state==="listening"){
   if(pausedRef.current){
    pausedRef.current=false;
    narrationPageRef.current=index;
    live.sendText("從剛才被暫停的位置繼續講目前這一頁，不要從頭重講，也不要進到下一頁。");
    return;
   }
   sendNarration(page,index,image);
  }
 }

 function narratePage(nextPage:StoryPage,nextIndex:number,nextImage:any){
  pausedRef.current=false;
  narrationPageRef.current=null;
  if(live.state==="speaking")live.interrupt();
  if(!["listening","speaking"].includes(live.state))return;
  window.setTimeout(()=>sendNarration(nextPage,nextIndex,nextImage),120);
 }

 return{...live,startOrResume,narratePage};
}
