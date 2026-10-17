/** Local, authoritative 1A2B rules. No network or AI required. */
export type AB = {a:number;b:number};
export type DigitCount = 3|4|5;
export type GuessRow = {guess:string;result:AB};

export function legalNumber(value:string,length:number):boolean {
 return value.length===length && /^[1-9][0-9]*$/.test(value) && new Set(value).size===length;
}
export function allNumbers(length:DigitCount):string[] {
 const result:string[]=[];
 function visit(s:string){
  if(s.length===length){result.push(s);return;}
  for(let d=0;d<=9;d++){
   const c=String(d);
   if((!s&&d===0)||s.includes(c))continue;
   visit(s+c);
  }
 }
 visit("");
 return result;
}
export function secretNumber(length:DigitCount,random=Math.random):string {
 let options=[0,1,2,3,4,5,6,7,8,9];
 for(let i=options.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];
 }
 if(options[0]===0)[options[0],options[1]]=[options[1],options[0]];
 return options.slice(0,length).join("");
}
export function scoreAB(secret:string,guess:string):AB{
 let a=0,b=0;
 for(let i=0;i<secret.length;i++){
  if(secret[i]===guess[i])a++;
  else if(secret.includes(guess[i]))b++;
 }
 return {a,b};
}
export function candidateNumbers(length:DigitCount,history:GuessRow[]):string[]{
 return allNumbers(length).filter(candidate=>history.every(row=>{
  const score=scoreAB(candidate,row.guess);
  return score.a===row.result.a&&score.b===row.result.b;
 }));
}
export function nextComputerGuess(length:DigitCount,history:GuessRow[]):string|null{
 const remaining=candidateNumbers(length,history);
 if(!remaining.length)return null;
 // Reuse an untried candidate to guarantee progress with consistent replies.
 const tried=new Set(history.map(h=>h.guess));
 const unused=remaining.filter(x=>!tried.has(x));
 if(!unused.length)return null;
 return unused[Math.floor(unused.length/2)];
}
const spokenDigit:Record<string,string>={
 zero:"0",oh:"0",o:"0",one:"1",two:"2",three:"3",four:"4",five:"5",
 six:"6",seven:"7",eight:"8",nine:"9"
};
export function parseSpokenNumber(text:string,length:DigitCount):string|null{
 let clean=text.toLowerCase().replace(/[,.!?]/g," ").trim();
 clean=clean.replace(/^(?:my guess is|i guess|guess|the number is|i think it is|it is|i choose)\s+/,"");
 const parts=clean.split(/\s+|-/).filter(Boolean);
 const tokens=parts.flatMap(part=>/^\d+$/.test(part)?part.split(""):[spokenDigit[part]||"?"]);
 if(tokens.includes("?"))return null;
 const number=tokens.join("");
 return legalNumber(number,length)?number:null;
}
export function parseSpokenAB(text:string,length:DigitCount):AB|null{
 const digits=text.toLowerCase().replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g,
  word=>spokenDigit[word]||word).replace(/\s+/g,"");
 const match=digits.match(/(\d)a(?:nd)?(\d)b/i);
 if(!match)return null;
 const a=Number(match[1]),b=Number(match[2]);
 return a+b<=length?{a,b}:null;
}
