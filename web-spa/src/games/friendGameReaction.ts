/** Offline, event-driven persona cues shared across Crew Play games. Never invent game state. */
export type GameReactionEvent="win"|"lose"|"progress"|"clue"|"challenge";
const personas:Record<string,{zh:Record<GameReactionEvent,string[]>;en:Record<GameReactionEvent,string[]>}>={
 zoe:{zh:{win:["太厲害了，這局被你破解了！"],lose:["哎呀差一點，換個策略再來吧。"],progress:["這步挺有想法的，繼續！"],clue:["線索越來越多了，慢慢推理。"],challenge:["我可不會輕易認輸喔。"]},
  en:{win:["You got me! That was a clever finish."],lose:["So close. Try a new strategy next time."],progress:["Interesting move. Keep going."],clue:["You're getting closer; use those clues."],challenge:["I won't go easy on you!"]}},
};
const genericZh:Record<GameReactionEvent,string[]>={
 win:["這局漂亮！我想再和你玩一次。","你贏了！這個判斷很精彩。"],
 lose:["這局很接近，下一局再挑戰吧。","別急，下次換個策略。"],
 progress:["這一步值得注意，繼續看看！","局勢開始有意思了。"],
 clue:["線索就在眼前，再想想看。","方向不錯，再試一個猜測。"],
 challenge:["準備好了嗎？我等你的下一步。","來吧，看看這局誰先破解。"]
};
const genericEn:Record<GameReactionEvent,string[]>={
 win:["Well played! Ready for another round?","That was a clever win."],
 lose:["Close game. Want a rematch?","Try a different plan next round."],
 progress:["Good move, this is getting interesting.","Let's see where that leads."],
 clue:["You've got a useful clue now.","Try another hypothesis."],
 challenge:["I'm ready when you are.","Let's see who cracks this round."]
};
export function friendGameReaction(friendId:string,event:GameReactionEvent,language:"zh"|"en"="zh",step=0):string{
 const values=personas[friendId]?.[language]?.[event]||(language==="zh"?genericZh[event]:genericEn[event]);
 // Stable variation by both event index and persona; does not touch live or memory.
 const hash=Array.from(friendId).reduce((acc,c)=>acc+c.charCodeAt(0),0);
 return values[(hash+Math.max(0,step))%values.length];
}
