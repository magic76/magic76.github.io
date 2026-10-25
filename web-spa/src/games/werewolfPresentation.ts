import {recordSpeech,fallbackWolfReply,type WolfEntry,type WolfGame,type WolfRole} from "./werewolfEngine";

export const TR:Record<WolfRole,{zh:string;en:string;hintZh:string;hintEn:string}>={
 wolf:{zh:"狼人",en:"Werewolf",hintZh:"夜晚指定一位玩家淘汰；白天隱藏身分取得信任。",hintEn:"Choose a victim at night. Blend in during the day."},
 seer:{zh:"預言家",en:"Seer",hintZh:"每晚查驗一人的身分；但要小心暴露自己。",hintEn:"Investigate one player's identity each night."},
 witch:{zh:"女巫",en:"Witch",hintZh:"整局各有一瓶解藥與毒藥；每晚最多用一瓶。",hintEn:"One heal and one poison for the game, at most one per night."},
 villager:{zh:"村民",en:"Villager",hintZh:"夜晚休息，白天透過討論找到狼人。",hintEn:"Rest at night and hunt for contradictions by day."}
};
export const L=(zh:boolean,a:string,b:string)=>zh?a:b;
export function localEvent(e:WolfEntry,zh:boolean){
 if(!zh)return e.text;
 let m:RegExpMatchArray|null;
 if(e.text==="Night 1 begins. Close your eyes and choose your secret action.")return "第一晚開始，請秘密執行你的夜間行動。";
 if((m=e.text.match(/^Night (\d+) begins\./)))return "第 "+m[1]+" 晚開始。";
 if((m=e.text.match(/^Day (\d+): everyone survived the night\./)))return "第 "+m[1]+" 天：昨晚是平安夜，所有人存活。";
 if((m=e.text.match(/^Day (\d+): (.+) did not survive the night\./)))return "第 "+m[1]+" 天："+m[2]+" 昨晚遭到淘汰。";
 if((m=e.text.match(/^(.+) was eliminated by vote\./)))return m[1]+" 被公投出局了。";
 if((m=e.text.match(/^Voted for (.+)/)))return "投給 "+m[1];
 if(e.text==="Voting is open. Choose one suspect or abstain.")return "開始投票。選擇一位嫌疑人，也可以棄票。";
 if(e.text==="The vote was tied. No one was eliminated.")return "票數平手，今天沒有人被淘汰。";
 if(e.text.startsWith("Village wins!"))return "村民陣營勝利！所有狼人都已出局。";
 if(e.text.startsWith("Wolves win!"))return "狼人陣營勝利！狼人已控制半數存活票數。";
 return e.text;
}
export function openingSpeeches(next:WolfGame,zh:boolean){
 if(next.phase!=="day")return next;
 let out=next;
 for(const npc of out.players.filter(p=>!p.human&&p.alive).slice(0,2)){
  out=recordSpeech(out,npc.id,fallbackWolfReply(out,npc.id,zh));
 }
 return out;
}
