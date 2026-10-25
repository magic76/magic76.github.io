import type {NewsScene,NewsSceneType} from "./nonsenseNewsEngine";

const scenePlan:Record<NewsSceneType,{hero:NewsSceneType;tiles:NewsSceneType[]}>={
 breaking:{hero:"breaking",tiles:["witness","evidence","poll"]},
 witness:{hero:"witness",tiles:["breaking","evidence","crisis"]},
 evidence:{hero:"evidence",tiles:["witness","poll","breaking"]},
 poll:{hero:"poll",tiles:["breaking","witness","crisis"]},
 crisis:{hero:"crisis",tiles:["witness","evidence","poll","breaking"]},
 finale:{hero:"finale",tiles:["crisis","poll","breaking"]},
};
const labels:Record<NewsSceneType,[string,string]>={breaking:["突發現場","Breaking"],witness:["現場連線","Live report"],evidence:["關鍵證物","Evidence"],poll:["民意速報","Public reaction"],crisis:["危機升級","Escalation"],finale:["最終結果","Finale"]};
const label=(zh:boolean,type:NewsSceneType)=>zh?labels[type][0]:labels[type][1];
const src=(type:NewsSceneType)=>"/images/news/"+type+".jpg";

export function NonsenseNewsStoryboard({scene,zh}:{scene:NewsScene;zh:boolean}){
 const plan=scenePlan[scene.type];
 return <div className={"news-photo-wall news-photo-wall-"+scene.type} key={scene.type+scene.headline}>
  <figure className="news-photo-hero">
   <img src={src(plan.hero)} alt={scene.headline+" — "+label(zh,plan.hero)} />
   <figcaption><span>{label(zh,plan.hero)}</span><strong>{scene.headline}</strong></figcaption>
  </figure>
  <div className="news-photo-mosaic" aria-label={zh?"現場照片與延伸畫面":"Related news photos"}>
   {plan.tiles.map((type,index)=><figure className={"news-photo-tile news-photo-tile-"+(index+1)} key={type}>
    <img src={src(type)} alt="" loading="lazy"/>
    <figcaption>{label(zh,type)}</figcaption>
   </figure>)}
  </div>
 </div>;
}
