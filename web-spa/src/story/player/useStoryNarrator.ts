import{useMemo,useRef}from"react";
import{useLiveSession}from"../../live/useLiveSession";
import type{StoryBook,StoryPage}from"../catalog";
import{pageNarrationPrompt,storyNarratorSystem}from"./narration";

function voice(){return localStorage.getItem("crew_story_voice")||"Leda"}

export function useStoryNarrator(book:StoryBook,index:number,page:StoryPage,image:any){
 const pausedRef=useRef(false);
 const system=useMemo(()=>storyNarratorSystem(book),[book]);
 const openingPrompt=useMemo(()=>pageNarrationPrompt(book,page,index),[book,page,index]);
 const live=useLiveSession({
  pageKey:"story_player",
  title:book.title||"Story Player",
  system,
  openingPrompt:image?"":openingPrompt,
  voice:voice()
 });

 async function startOrResume(){
  if(live.state==="speaking"){pausedRef.current=true;live.interrupt();return}
  if(["idle","ended","error"].includes(live.state)){
   await live.start();
   if(image)window.setTimeout(()=>{void live.sendPreparedImage(image,pageNarrationPrompt(book,page,index))},80);
   return;
  }
  if(live.state==="listening"){
   if(pausedRef.current){pausedRef.current=false;live.sendText("從剛才被暫停的位置繼續講目前這一頁，不要從頭重講，也不要進到下一頁。");return}
   if(image)void live.sendPreparedImage(image,pageNarrationPrompt(book,page,index));
   else live.sendText(pageNarrationPrompt(book,page,index));
  }
 }

 function narratePage(nextPage:StoryPage,nextIndex:number,nextImage:any){
  pausedRef.current=false;
  if(live.state==="speaking")live.interrupt();
  const prompt=pageNarrationPrompt(book,nextPage,nextIndex);
  if(!["listening","speaking"].includes(live.state))return;
  window.setTimeout(()=>{
   if(nextImage)void live.sendPreparedImage(nextImage,prompt);
   else live.sendText(prompt);
  },90);
 }

 return{...live,startOrResume,narratePage};
}
