// Separate only completed spoken sentences; never send the unfinished tail early.
export function splitCallSentences(text){
 const sentences=[];let start=0;
 const end=/[。！？.!?…]+(?:["'”’）)\]]+)?\s*/g;
 for(const match of text.matchAll(end)){
  const finish=match.index+match[0].length;
  const sentence=text.slice(start,finish).trim();
  if(sentence)sentences.push(sentence);
  start=finish;
 }
 return {sentences,tail:text.slice(start).trim()};
}

// A failed sentence leaves no placeholder: at most one notice per AI reply.
// Render successful (including streaming) sentences in their original order.
export function callTranslationRows(parts){
 const rows=[];let failed=false,needsKey=false,pending=false;
 for(const part of parts){
  if(part.text?.trim())rows.push({kind:"text",value:part.text});
  else if(part.status==="key")needsKey=true;
  else if(part.status==="failed")failed=true;
  else if(part.status==="pending"||part.status==="working")pending=true;
 }
 if(needsKey||failed)rows.push({kind:"message",value:needsKey?"needsKey":"translateFailed"});
 else if(pending&&!rows.length)rows.push({kind:"message",value:"translating"});
 return rows;
}
