import{useEffect,useMemo,useRef,useState}from"react";
import{useLiveSession}from"../../live/useLiveSession";
import type{StoryBook,StoryPage}from"../catalog";
import{pageNarrationPrompt,storyNarratorSystem}from"./narration";

function voice(){return localStorage.getItem("crew_story_voice")||"Leda"}

export function useStoryNarrator(book:StoryBook,index:number,page:StoryPage,image:any,onPageAdvance?:(nextIndex:number)=>void){
 const pausedRef=useRef(false);
 const narrationPageRef=useRef<number|null>(null);
 const pendingAdvanceRef=useRef<number|null>(null);
 const pendingFinishRef=useRef(false);
 const turnCompleteRef=useRef<(turn:{hasValidOutput?:boolean;output?:string})=>void>(()=>{});
 const[paused,setPaused]=useState(false);
 const[finished,setFinished]=useState(false);
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
  if(nextIndex>=book.pages.length){
   pendingFinishRef.current=true;
   return;
  }
  pendingAdvanceRef.current=nextIndex;
 };

 useEffect(()=>{
  if(live.state!=="listening"||pausedRef.current)return;
  if(pendingFinishRef.current){
   pendingFinishRef.current=false;
   pendingAdvanceRef.current=null;
   setFinished(true);
   return;
  }
  const nextIndex=pendingAdvanceRef.current;
  if(nextIndex===null)return;
  const timer=window.setTimeout(()=>{
   if(pausedRef.current||pendingAdvanceRef.current!==nextIndex)return;
   pendingAdvanceRef.current=null;
   const nextPage=book.pages[nextIndex]||{text:""};
   const nextImage=(book.images||[])[Number(nextPage.imageIndex)];
   setFinished(false);
   onPageAdvance?.(nextIndex);
   sendNarration(nextPage,nextIndex,nextImage);
  },650);
  return()=>window.clearTimeout(timer);
 },[live.state,book,onPageAdvance]);

 async function startOrResume(){
  if(finished){
   pendingAdvanceRef.current=null;
   pendingFinishRef.current=false;
   pausedRef.current=false;
   setPaused(false);
   setFinished(false);
   const firstPage=book.pages[0]||{text:""};
   const firstImage=(book.images||[])[Number(firstPage.imageIndex)];
   onPageAdvance?.(0);
   window.setTimeout(()=>sendNarration(firstPage,0,firstImage),120);
   return;
  }
  if(pausedRef.current){
   pausedRef.current=false;
   setPaused(false);
   narrationPageRef.current=index;
   live.sendText("從剛才被暫停的位置繼續講目前這一頁，不要從頭重講，也不要進到下一頁。");
   return;
  }
  if(["idle","ended","error"].includes(live.state)){
   pausedRef.current=false;
   setPaused(false);
   setFinished(false);
   narrationPageRef.current=index;
   await live.start();
   if(image)window.setTimeout(()=>sendNarration(page,index,image),80);
   return;
  }
  if(["speaking","listening"].includes(live.state)){
   pausedRef.current=true;
   setPaused(true);
   pendingAdvanceRef.current=null;
   pendingFinishRef.current=false;
   narrationPageRef.current=null;
   if(live.state==="speaking")live.interrupt();
  }
 }

 function narratePage(nextPage:StoryPage,nextIndex:number,nextImage:any){
  pendingAdvanceRef.current=null;
  pendingFinishRef.current=false;
  narrationPageRef.current=null;
  setFinished(false);
  if(pausedRef.current)return;
  if(live.state==="speaking")live.interrupt();
  if(!["listening","speaking"].includes(live.state))return;
  window.setTimeout(()=>sendNarration(nextPage,nextIndex,nextImage),180);
 }

 return{...live,paused,finished,startOrResume,narratePage};
}
