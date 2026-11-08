/** Visible teaching promise; never changes Live transport, friend settings or memory. */
export function teacherLanguageHomeHint(mode:string,level:string,native:string,target:string,en:boolean,locale="zh-TW"):string{
 if(locale.startsWith("ja")){
  if(mode==="immersion")return "完全イマージョン：練習も説明も"+target+"だけで行います。";
  const base="意味や文法は"+native+"で質問できます。先生は"+native+"で説明し、"+target+"で練習します。";
  return mode==="beginner"||level==="A1"||level==="A2"?base+"初心者には母語でのサポートを増やします。":base+"話す力に合わせて自動調整します。";
 }
 if(mode==="immersion")return en?"Full immersion: practice and explanations stay in "+target+".":"完全沉浸：練習與解釋都只使用"+target+"。";
 const base=en?"Ask about meanings, grammar or culture in "+native+". Your teacher explains in "+native+" and models in "+target+". "
  :"可以直接用"+native+"問意思、文法或文化差異；老師用"+native+"解釋，再用"+target+"示範。";
 if(mode==="beginner"||level==="A1"||level==="A2")return base+(en?"More native-language help at beginner levels.":"初階會提供較多母語引導。");
 if(level==="B1"||level==="B2")return base+(en?"Higher levels use more "+target+".":"較高程度以"+target+"練習為主。");
 return base+(en?"Support adapts to your speaking, automatically.":"依口說表現自動調整，不必設定語言比例。");
}
export function teacherLanguageLiveHint(mode:string,level:string,native:string,target:string,en:boolean,locale="zh-TW"):string{
 if(locale.startsWith("ja")){
  if(mode==="immersion")return "完全イマージョン · "+target+"だけ";
  return mode==="beginner"||level==="A1"||level==="A2"?"質問は"+native+"でOK · "+target+"の短文練習":"質問は"+native+"で · 練習は"+target+"で";
 }
 if(mode==="immersion")return en?"Full immersion · "+target+" only":"完全沉浸 · 只使用"+target;
 if(mode==="beginner"||level==="A1"||level==="A2")return en?"Ask in "+native+" · short "+target+" examples":"可用"+native+"提問 · "+target+"短句示範";
 if(level==="B1"||level==="B2")return en?"Mostly "+target+" · "+native+" help when needed":"以"+target+"為主 · 需要時用"+native+"解釋";
 return en?"Ask in "+native+" · practice in "+target:"用"+native+"問 · 用"+target+"練";
}
