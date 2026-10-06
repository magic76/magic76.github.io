import type{StoryBook,StoryPage}from"../catalog";

function mood(value?:string){
 const map:Record<string,string>={
  warm:"溫暖自然",excited:"有活力但不要吵",mysterious:"帶一點神秘與停頓",
  joyful:"輕快開心",dramatic:"有戲劇張力",whisper:"偏輕聲、像睡前說故事",tender:"柔和、慢一點"
 };
 return map[value||""]||"自然";
}
function sanitizeNarrationText(value:unknown){
 return String(value||"")
  .replace(/[（(][^）)]*(停頓|等待使用者|等待孩子|等待小朋友)[^）)]*[）)]/gi,"")
  .replace(/\([^)]*(pause|wait(?:ing)?\s+(?:for\s+)?(?:the\s+)?(?:user|child))[^)]*\)/gi,"")
  .replace(/\s{2,}/g," ")
  .trim();
}
export function storyNarratorSystem(book:StoryBook){
 const language=localStorage.getItem("crew_story_language")||book.language||"zh-TW";
 const style=localStorage.getItem("crew_story_style")||"溫暖冒險";
 return[
  "你是 Crew Story 的說書人阿奇。",
  "這是一本已經存在的故事，不是即興重新創作。",
  "說書語言："+language+"；整體風格："+style+"。",
  "你只能根據目前提供的頁面與前文說故事，不可提前講下一頁、不可改寫已確定劇情。",
  "你可以讓旁白更自然、有情緒、有角色感，但不可新增會改變故事事實的新事件。",
  "角色台詞可以用不同語氣演出；旁白與角色之間要有自然停頓。",
  "每一頁都是單頁自動播放：本頁念完後立即結束本次回應，讓頁面依 turnComplete 自動翻到下一頁。",
  "一般朗讀時不要加入「停頓」「等待使用者／孩子回應」等舞台指示，也不要主動停下來等孩子回答。",
  "使用者主動插話提問時，先回答問題；回答後只回到目前頁，不要自行換頁或偷跑下一頁。"
 ].join("");
}
export function pageNarrationPrompt(book:StoryBook,page:StoryPage,index:number){
 const text=sanitizeNarrationText(page.text||page.context?.currentEvent||"");
 const dialogue=sanitizeNarrationText(page.dialogue||"");
 const character=String(page.characterName||"").trim();
 const nearby=book.pages.slice(Math.max(0,index-1),index).map(p=>p.text||p.context?.currentEvent||"").filter(Boolean).join(" ");
 return[
  "現在講第 "+(index+1)+" 頁，共 "+book.pages.length+" 頁。",
  nearby?"前一頁脈絡："+nearby:"",
  "本頁情緒："+mood(page.emotion)+"。",
  character?"本頁角色："+character+"。":"",
  text?"本頁故事內容："+text:"本頁以畫面為主，請根據圖片客觀說出故事當下發生的事情。",
  dialogue?(character?character:"角色")+"台詞："+dialogue+"。":"",
  "請直接開始說，不要先說『這一頁』或解釋你要做什麼。講完本頁後立即結束本次回應；不要等待使用者回應，也不要自行講下一頁。"
 ].filter(Boolean).join("\n");
}
