import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
type Result="win"|"lose"|"draw";
const games:Record<string,string>={
 "game-connect4":"Connect Four","game-gomoku":"Gomoku","game-reversi":"Reversi",
 "game-play":"game","game-1a2b":"1A2B","game-number-bomb":"Number Bomb",
 "game-memory":"Memory","game-taboo":"Taboo"
};
export function readGameRoundHandoff(search:string){
 const p=new URLSearchParams(search);
 if(p.get("id")!=="zoe"||p.get("chat")!=="text")return null;
 const topic=p.get("topic")||"";
 if(!Object.hasOwn(games,topic))return null;
 const result=p.get("result"),raw=p.get("moves");
 const validResult=result==="win"||result==="lose"||result==="draw";
 const moves=raw&&/^[1-9][0-9]{0,2}$/.test(raw)?Number(raw):0;
 return {topic,game:games[topic],result:validResult&&moves<=225&&moves>0?result as Result:null,moves:validResult&&moves<=225?moves:0};
}
const lines:Record<string,[string,string,string,string]>={
 // Neutral, win, loss, draw. Deliberately no claims about unseen board positions.
 en:["Hi {name}! I played a game. Can we practice saying 'One more round'?","Hi {name}! I won after {moves} moves! How do I say 'One more round'?","Hi {name}! I lost after {moves} moves. Let's practice asking for a rematch!","Hi {name}! My game ended in a draw after {moves} moves. How do I say 'It's a draw'?"],
 ja:["こんにちは、{name}！ゲームをしたよ。「もう一回」と言う練習をしよう！","{name}、{moves}手で勝ったよ！「もう一回」の言い方を練習したい！","{name}、{moves}手で負けちゃった。もう一度勝負したいと言う練習をしよう！","{name}、{moves}手で引き分けだったよ。「引き分け」の言い方を練習しよう！"],
 ko:["안녕, {name}! 게임을 했어. '한 판 더'라고 말하는 연습을 하자!","{name}, {moves}수 만에 이겼어! '한 판 더'를 연습하고 싶어!","{name}, {moves}수 만에 졌어. 다시 하자고 말하는 연습을 하자!","{name}, {moves}수 만에 비겼어. '무승부야'라고 말하는 법을 알려 줘!"],
 es:["¡Hola, {name}! Jugué una partida. ¿Practicamos cómo decir 'otra ronda'?","¡{name}, gané en {moves} jugadas! ¿Cómo digo 'otra ronda'?","{name}, perdí en {moves} jugadas. ¡Practiquemos cómo pedir la revancha!","{name}, empaté tras {moves} jugadas. ¿Cómo digo 'quedamos empatados'?"],
 fr:["Salut {name} ! J'ai joué. On s'entraîne à dire « encore une partie » ?","{name}, j'ai gagné en {moves} coups ! Comment dire « encore une partie » ?","{name}, j'ai perdu en {moves} coups. On s'entraîne à demander une revanche ?","{name}, j'ai fait match nul en {moves} coups. Comment le dire naturellement ?"],
 de:["Hallo {name}! Ich habe gespielt. Üben wir 'Noch eine Runde'?","{name}, ich habe nach {moves} Zügen gewonnen! Wie sage ich 'Noch eine Runde'?","{name}, ich habe nach {moves} Zügen verloren. Üben wir, um eine Revanche zu bitten!","{name}, nach {moves} Zügen war es unentschieden. Wie sage ich das?"],
 it:["Ciao {name}! Ho giocato. Proviamo a dire 'Un'altra partita'?","{name}, ho vinto in {moves} mosse! Come si dice 'Un'altra partita'?","{name}, ho perso in {moves} mosse. Esercitiamoci a chiedere la rivincita!","{name}, ho pareggiato dopo {moves} mosse. Come posso dirlo?"],
 vi:["Chào {name}! Mình vừa chơi một ván. Cùng luyện nói 'Thêm ván nữa' nhé!","{name} ơi, mình thắng sau {moves} lượt! Dạy mình nói 'Thêm ván nữa' nhé!","{name} ơi, mình thua sau {moves} lượt. Cùng luyện cách xin đấu lại nhé!","{name} ơi, mình hòa sau {moves} lượt. Nói 'Hòa rồi' thế nào nhỉ?"],
 th:["สวัสดี {name}! ฉันเพิ่งเล่นเกมมา ฝึกพูดว่า 'อีกตาหนึ่ง' กันเถอะ!","{name} ฉันชนะใน {moves} ตา! ช่วยฝึกพูดว่า 'เล่นอีกตา' หน่อย!","{name} ฉันแพ้ใน {moves} ตา มาฝึกขอเล่นใหม่กันเถอะ!","{name} เกมเสมอกันหลัง {moves} ตา สอนพูดว่า 'เสมอ' หน่อย!"],
 zh:["嗨，{name}！我剛玩了一局，陪我練習說「再來一局」！","{name}，我剛用 {moves} 步贏了！教我自然地說「再來一局」！","{name}，我剛下了 {moves} 步，結果輸了。陪我練習邀請再戰！","{name}，剛剛下了 {moves} 步，結果平手。陪我練習說「平手」！"],
 pt:["Oi, {name}! Joguei uma partida. Vamos praticar 'Mais uma rodada'?","{name}, ganhei em {moves} jogadas! Como digo 'Mais uma rodada'?","{name}, perdi em {moves} jogadas. Vamos praticar como pedir revanche!","{name}, empatei após {moves} jogadas. Como posso dizer isso?"],
 id:["Hai {name}! Aku baru main gim. Yuk, latihan bilang 'Satu ronde lagi'!","{name}, aku menang dalam {moves} langkah! Ayo latihan bilang 'Satu ronde lagi'!","{name}, aku kalah setelah {moves} langkah. Ayo latihan minta tanding ulang!","{name}, tadi seri setelah {moves} langkah. Bagaimana cara bilang 'seri'?"]
};
export function gameRoundStarter(targetLanguage:string,name:string,search:string):string|undefined{
 const info=readGameRoundHandoff(search);
 if(!info)return;
 const code=TARGET_LANGUAGES.find(item=>item.value===targetLanguage||item.code===targetLanguage)?.code||"en";
 const tuple=lines[code]||lines.en;
 const template=tuple[info.result==="win"?1:info.result==="lose"?2:info.result==="draw"?3:0];
 return template.replaceAll("{name}",name).replaceAll("{moves}",String(info.moves));
}
export function isGameRoundLink(){
 return typeof window!=="undefined"&&Boolean(readGameRoundHandoff(window.location.search)?.result);
}
export function gameRoundContext(system:string,scope:string){
 if(!scope.startsWith("friend:zoe")||typeof window==="undefined")return system;
 const info=readGameRoundHandoff(window.location.search);
 if(!info?.result)return system;
 const outcome=info.result==="win"?"the learner won":info.result==="lose"?"the learner lost":"it was a draw";
 return system+"\n[GAME HANDOFF VERIFIED BY THE LOCAL BOARD] "+info.game+": "+outcome+" after "+info.moves+" total moves. You know only the outcome and move count, not the actual moves or positions. Respond naturally in the chosen practice language, and help the learner say a short rematch or result phrase. Never claim you saw or reviewed the board.";
}
