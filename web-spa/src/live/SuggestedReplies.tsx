import type {SuggestedReply} from "./suggestReplies";
import "./suggestedReplies.css";
export function SuggestedReplies({replies,enabled,onToggle,language}:{replies:SuggestedReply[];enabled:boolean;onToggle:()=>void;language:string}){
 return <section className="live-suggest" aria-label="回答提示">
  <button className="live-suggest-toggle" type="button" aria-pressed={enabled} onClick={onToggle}>回答提示 {enabled?"開":"關"}</button>
  {enabled&&replies.length>0?<div className="live-suggest-list"><small>可以直接照著說，也可以自由回答</small>
   {replies.map((reply,index)=><div className="live-suggest-item" key={index}><span className="live-suggest-index">{index+1}</span><div><strong lang={language}>{reply.text}</strong><small>{reply.translation}</small></div></div>)}
  </div>:null}
 </section>;
}
