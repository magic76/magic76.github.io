import type {MagicChallenge,MagicChoice,MagicPanel} from "./world";

type CardProps={zh:boolean;onAnswer:(choice:MagicChoice)=>void;onSelect:(panelId:number,choice:MagicChoice)=>void};
const CHOICES:MagicChoice[]=["A","B","C"];
const translate=(zh:boolean,chinese:string,english:string)=>zh?chinese:english;

export function MagicChallengeCard({challenge,zh,onAnswer}:{challenge:MagicChallenge}&Pick<CardProps,"zh"|"onAnswer">){
 return <section className="magic-challenge" aria-label={translate(zh,"魔法試煉","Magic challenge")}>
  <small>✧ {translate(zh,"魔法試煉","MAGIC CHALLENGE")}</small>
  <h2>{challenge.title}</h2>
  <p>{challenge.question}</p>
  <div className="magic-choices">
   {challenge.options.map((option,i)=>{
    const choice=CHOICES[i],selected=challenge.selected;
    return <button key={choice} type="button" disabled={Boolean(selected)} aria-pressed={selected===choice}
     className={selected===choice?(selected===challenge.correct?"correct":"incorrect"):""}
     onClick={()=>onAnswer(choice)}><b>{choice}</b>{option}</button>;
   })}
  </div>
  {challenge.selected&&<p className="magic-answer" role="status">{challenge.selected===challenge.correct?
   translate(zh,"答對了！繼續施展下一個魔法。","Correct! Your adventure continues."):
   translate(zh,"下次一定可以。換個魔法再試試吧！","Try another spell to keep exploring!")}</p>}
 </section>;
}

export function MagicGeneratedCard({panel,zh,onSelect}:{panel:MagicPanel}&Pick<CardProps,"zh"|"onSelect">){
 return <section className={"magic-generated panel-"+panel.kind} aria-label={translate(zh,"AI 創造的互動魔法卡","AI-generated interactive magic panel")}>
  <span className="magic-generated-label">✦ {panel.kind==="spellbook"?translate(zh,"魔法書","SPELLBOOK"):
   panel.kind==="treasure"?translate(zh,"神秘寶箱","MYSTERY TREASURE"):translate(zh,"冒險任務","NEW ADVENTURE")}</span>
  <h2>{panel.title}</h2><p>{panel.description}</p>
  <div className="magic-generated-options">
   {panel.items.map((item,index)=>{
    const choice=CHOICES[index],revealed=panel.selected===choice;
    const treasure=panel.kind==="treasure";
    return <button type="button" key={choice} disabled={Boolean(panel.selected)} aria-pressed={revealed}
     className={revealed?"is-revealed":""}
     onClick={()=>onSelect(panel.id,choice)}>
     <span className="magic-generated-symbol" aria-hidden="true">{panel.kind==="spellbook"?"✧":treasure?"🎁":"✦"}</span>
     <span className="magic-generated-option-text">
      {treasure&&!revealed?(panel.selected?translate(zh,"未開啟","Unopened"):translate(zh,"開啟秘密 ","Open mystery ")+choice):item}
     </span>
    </button>;
   })}
  </div>
  {panel.selected&&<p className="magic-generated-result" role="status">{translate(zh,"你的選擇已加入故事。","Your choice is now part of the story.")}</p>}
 </section>;
}

