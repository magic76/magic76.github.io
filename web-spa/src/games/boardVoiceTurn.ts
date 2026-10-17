/** A model turn must describe the engine-selected move before it can release
 * the board. Earlier learner-intent replies are not authoritative game events.
 */
const numberWords:Record<number,string[]>={
 1:["1","one","一","ㄧ"],2:["2","two","二"],3:["3","three","三"],4:["4","four","四"],
 5:["5","five","五"],6:["6","six","六"],7:["7","seven","七"],8:["8","eight","八"],
 9:["9","nine","九"],10:["10","ten","十"],11:["11","eleven","十一"],
 12:["12","twelve","十二"],13:["13","thirteen","十三"],
 14:["14","fourteen","十四"],15:["15","fifteen","十五"]
};
function boundaries(value:string,token:string){
 const escape=token.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 // Do not accidentally match G8 in G80, or column 1 in column 10.
 return new RegExp("(^|[^a-z0-9])"+escape+"(?=$|[^a-z0-9])","i").test(value);
}
function containsCoordinate(output:string,coordinate:string){
 const found=/^([a-o])(1[0-5]|[1-9])$/i.exec(coordinate.trim());
 if(!found)return false;
 const letter=found[1].toLowerCase(),row=Number(found[2]);
 const value=output.toLowerCase().normalize("NFKC");
 if(boundaries(value,letter+row))return true;
 return (numberWords[row]||[]).some(n=>boundaries(value,letter+" "+n));
}
export type ExpectedBoardSpeech={kind:"gomoku"|"reversi"|"connect4";position:string};
/** Conservative: if the model did not name its intended move, do not accept
 * a prior utterance as the turn-completion signal. The watchdog still falls
 * back to local board rules so the game never remains stuck.
 */
export function matchesBoardNarration(output:string|undefined,expected:ExpectedBoardSpeech){
 const spoken=(output||"").trim();
 if(!spoken)return false;
 if(expected.kind==="gomoku"||expected.kind==="reversi")
  return containsCoordinate(spoken,expected.position);
 const column=Number(expected.position);
 if(!Number.isInteger(column)||column<1||column>7)return false;
 const line=spoken.toLowerCase().normalize("NFKC");
 const words=numberWords[column]||[];
 return words.some(n=>new RegExp("(?:column|col|第|欄|列|row|放在|放到)\\s*"+n+"(?=$|[^a-z0-9])","i").test(line)
  ||new RegExp("(^|[^a-z0-9])"+n+"\\s*(?:column|col|欄|列)(?=$|[^a-z0-9])","i").test(line));
}
