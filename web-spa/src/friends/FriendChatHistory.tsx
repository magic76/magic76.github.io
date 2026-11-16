type Turn={input?:string;output?:string};
export function FriendChatHistory({turns,friendName,youLabel,summary}:{turns:ReadonlyArray<Turn>;friendName:string;youLabel:string;summary:string}){
 return <details className="friend-chat-history"><summary>{summary}</summary>
  <div className="friend-chat-history-scroll">{turns.map((turn,index)=><div key={index} className="friend-chat-turn">
   {turn.input?<p><strong>{youLabel}</strong>{turn.input}</p>:null}
   {turn.output?<p><strong>{friendName}：</strong>{turn.output}</p>:null}
  </div>)}</div>
 </details>;
}
