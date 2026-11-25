// Shared server/client declaration: guest tokens lock this exact local-only tool.
export const LEARNING_FEEDBACK_FUNCTION="show_learning_feedback";
export const LEARNING_FEEDBACK_TOOL={
 name:LEARNING_FEEDBACK_FUNCTION,
 description:"Before the normal reply, quietly show at most ONE useful correction or more natural expression for the learner's latest actual sentence in the configured learning language. Copy one complete sentence verbatim from the latest actual learner utterance, never from the conversation topic or your own example. Change only the smallest necessary language error. Preserve the learner's people, places, objects, actions, numbers, time and intended meaning. Never replace a school with a cafe just because the earlier topic was cafes. If the learner says 'I go to school today', never suggest 'I went to a new cafe today'; only suggest 'I went to school today' if past meaning is clear. If tense or meaning is ambiguous, ask naturally or skip the correction. Explain briefly in their native language. Do not correct native-language speech, background speech, names, quoted examples, control instructions or intentional slang. Skip correct sentences unless a clearly useful idiomatic alternative exists. Natural is an optional alternative, not an error. Never infer pronunciation from transcripts. No scores or HTML. No feedback on the opening or AI speech. Continue the normal conversation about what the learner actually said after acknowledgement; never announce, read out, repeat or verbally explain the unsolicited correction.",
 parameters:{type:"OBJECT",properties:{original:{type:"STRING"},corrected:{type:"STRING"},explanation:{type:"STRING"},type:{type:"STRING",enum:["grammar","wording","natural"]}},required:["original","corrected","explanation","type"]}
};
export const LEARNING_FEEDBACK_POLICY="\n[LOCAL LEARNING FEEDBACK] Use show_learning_feedback only on a genuine learner utterance in the selected learning language. Do not force a call on every turn. This is the priority rule for unsolicited correction delivery: send corrections exclusively via the tool, even if earlier teacher instructions request a spoken recast or grammar explanation. The spoken response must respond to the latest learner statement on its own terms, not the previous topic, and must not verbally repeat or explain the card. If the learner explicitly asks for teaching or a correction, teach normally. If you cannot confidently ground the correction or infer intended tense, skip it. Never claim you assessed pronunciation.";
const normalize=value=>value.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]+/gu,"");
const bounded=(value,max)=>typeof value==="string"&&value.trim().length>0&&value.trim().length<=max?value.trim():"";
export function validateLearningFeedback(args){
 if(!args||typeof args!=="object"||Array.isArray(args))return null;
 const {type}=args,original=bounded(args.original,280),corrected=bounded(args.corrected,280),explanation=bounded(args.explanation,240);
 if(!["grammar","wording","natural"].includes(type)||!original||!corrected||!explanation||!normalize(original)||normalize(original)===normalize(corrected))return null;
 return {original,corrected,explanation,type};
}

// Match a whole learner sentence (or full utterance), not a substring with spaces erased.
const sentenceKey=value=>value.normalize("NFKC").toLowerCase().replace(/[’‘]/g,"'").replace(/[\p{P}\p{Z}\s]+/gu,match=>match.includes("'")?"'":" ").trim();
function matchingSentence(input,original){
 if(typeof input!=="string")return null;
 const candidates=[input.trim(),...input.match(/[^.!?。！？\n]+[.!?。！？]*/gu)||[]];
 return candidates.find(sentence=>sentenceKey(sentence)===sentenceKey(original))?.trim()||null;
}
// Conservative English grammar gate, not a semantic model. Unrecognized lexical
// substitutions are suppressed rather than inventing a learner's meaning.
const grammarWords=new Set("a an the am is are was were be been being do does did have has had to of in on at for from by with as than".split(" "));
const irregularGroups=["go goes went gone going","be am is are was were been being","buy buys bought buying","come comes came coming","eat eats ate eaten eating","take takes took taken taking","see sees saw seen seeing","say says said saying","make makes made making","get gets got gotten getting","give gives gave given giving","write writes wrote written writing","read reads reading","run runs ran running","think thinks thought thinking","teach teaches taught teaching","bring brings brought bringing","feel feels felt feeling","find finds found finding","know knows knew known knowing","speak speaks spoke spoken speaking","meet meets met meeting","drink drinks drank drunk drinking","drive drives drove driven driving","leave leaves left leaving","tell tells told telling","sleep sleeps slept sleeping","child children","person people","man men","woman women","foot feet","tooth teeth"];
const irregular=new Map(irregularGroups.flatMap(group=>{const words=group.split(" ");return words.map(word=>[word,words[0]])}));
const englishTokens=value=>value.normalize("NFKC").toLowerCase().replace(/[’‘]/g,"'").match(/[a-z]+(?:'[a-z]+)?|\p{N}+(?:[.,]\p{N}+)?|[\p{L}\p{M}]+/gu)||[];
function forms(word){
 const result=new Set([word,irregular.get(word)||word]);
 if(/^[a-z]{3,}$/.test(word)){
  if(word.endsWith("ies")||word.endsWith("ied"))result.add(word.slice(0,-3)+"y");
  for(const suffix of ["s","es","ed","ing"])if(word.endsWith(suffix)&&word.length-suffix.length>=2){
   const stem=word.slice(0,-suffix.length);result.add(stem);
   if(suffix==="ed"||suffix==="ing"){
    result.add(stem+"e");
    if(/([b-df-hj-np-tv-z])\1$/.test(stem))result.add(stem.slice(0,-1));
   }
  }
 }
 return result;
}
function sameLexeme(a,b){
 if(a===b)return true;
 const af=forms(a),bf=forms(b);
 return [...af].some(form=>bf.has(form));
}
export function preservesEnglishGrammarContent(original,corrected){
 const a=englishTokens(original).filter(word=>!grammarWords.has(word)),b=englishTokens(corrected).filter(word=>!grammarWords.has(word));
 return a.length===b.length&&a.every((word,index)=>sameLexeme(word,b[index]));
}
const isEnglish=language=>/^(en(?:[-_].*)?|english|英文|英語|英语)$/i.test(String(language||"").trim());

export function createLearningFeedbackQueue(){
 let pending=[],seen=new Set();
 return {
  propose(call){
   if(call.id&&seen.has(call.id))return {ok:true};
   const item=validateLearningFeedback(call.args);
   if(!item)return {ok:false,error:"invalid-feedback"};
   if(call.id){if(seen.size>=256)seen.clear();seen.add(call.id)}
   if(pending.length<3&&!pending.some(v=>v.original===item.original&&v.corrected===item.corrected))pending.push(item);
   return {ok:true};
  },
  complete(input,language){
   const candidates=pending;pending=[];
   for(const item of candidates){
    const original=matchingSentence(input,item.original);
    if(!original)continue;
    if(item.type==="grammar"&&isEnglish(language)&&!preservesEnglishGrammarContent(original,item.corrected))continue;
    return {...item,original};
   }
   return null;
  },
  clear(){pending=[]}
 };
}
export function appendLearningFeedbackTool(tools=[]){
 const declarations=tools.flatMap(group=>group.functionDeclarations||[]);
 return [...tools.filter(group=>!group.functionDeclarations),{functionDeclarations:[...declarations.filter(tool=>tool.name!==LEARNING_FEEDBACK_FUNCTION),LEARNING_FEEDBACK_TOOL]}];
}
