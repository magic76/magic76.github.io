/** Static pre-key example only. Never uses, generates or reveals the live round answer. */
export function CrewPlaySamplePreview({english,twenty,friendName}:{english:boolean;twenty:boolean;friendName:string}){
 return <div className="crew-play-sample" aria-label={english?"Example game turn":"玩法示範"}>
      <strong>{english?"Example turn · not today's actual answer":"示範回合 · 非本局實際答案"}</strong>
      {twenty?<div className="crew-play-sample-lines">
       <p><b>{english?"Player":"玩家"}</b> {english?"Is it something you eat?":"它是可以吃的東西嗎？"}</p>
       <p><b>{friendName}</b> {english?"No.":"不是。"}</p>
       <p><b>{english?"Player":"玩家"}</b> {english?"Is it usually indoors?":"通常會在室內嗎？"}</p>
       <p><b>{friendName}</b> {english?"Yes! Keep narrowing it down.":"是，繼續縮小範圍！"}</p>
      </div>:<div className="crew-play-sample-lines">
       <p><b>{english?"Sample mystery":"示範題目"}</b> {english?"A guest asked for water, but the server clapped instead. The guest said thanks. Why?":"客人向服務生要水，服務生卻突然拍手，客人反而道謝。為什麼？"}</p>
       <p><b>{english?"Player":"玩家"}</b> {english?"Did the guest have hiccups?":"客人當時在打嗝嗎？"}</p>
       <p><b>{friendName}</b> {english?"Yes. Use yes/no questions to uncover the story.":"是。用是非題一步步推理原因。"}</p>
      </div>}
     </div>;
}
