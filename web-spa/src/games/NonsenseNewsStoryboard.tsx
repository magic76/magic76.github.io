import type {NewsScene,NewsSceneType} from "./nonsenseNewsEngine";

const panels:NewsSceneType[]=["breaking","witness","evidence","poll","crisis","finale"];
const labels:Record<NewsSceneType,[string,string]>={breaking:["突發現場","BREAKING"],witness:["現場連線","LIVE"],evidence:["關鍵證物","EVIDENCE"],poll:["全城民調","THE POLL"],crisis:["危機升級","CHAOS"],finale:["結局畫面","FINALE"]};
const zhLabel=(zh:boolean,type:NewsSceneType)=>zh?labels[type][0]:labels[type][1];

export function NonsenseNewsStoryboard({scene,zh}:{scene:NewsScene;zh:boolean}){
 const title=scene.headline;
 return <div className="news-storyboard">
  <div className="news-storyboard-main" key={scene.type+title}>
   <img className="news-story-photo" src={"/images/news/"+scene.type+".jpg"} alt={zh?title+"｜"+zhLabel(true,scene.type):title+" — "+zhLabel(false,scene.type)} />
   <span className="news-art-caption">{zhLabel(zh,scene.type)} <b>·</b> {title}</span>
  </div>
  <div className="news-storyboard-strip" aria-label={zh?"本則新聞的照片分鏡":"Story photo sequence"}>
   {panels.map((type,index)=><div key={type} className={"news-story-frame"+(type===scene.type?" is-current":"")}>
    <div className="news-story-thumb"><img src={"/images/news/"+type+".jpg"} alt="" loading="lazy"/></div>
    <span><i>0{index+1}</i>{zhLabel(zh,type)}</span>
   </div>)}
  </div>
 </div>;
}
