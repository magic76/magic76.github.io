type Product="teacher"|"story"|"fortune";

const APPS:Record<Product,{name:string;url:string|null}>={
 teacher:{name:"Crew Teacher",url:"https://play.google.com/store/apps/details?id=com.crewpocket.teacher"},
 story:{name:"Crew Story",url:"https://play.google.com/store/apps/details?id=com.crewpocket.story"},
 fortune:{name:"Crew Fortune",url:null}
};

export function PlayStoreLink({product,compact=false}:{product:Product;compact?:boolean}){
 const app=APPS[product];
 const content=<>
  <span className="play-store-mark" aria-hidden="true">{app.url?"▶":"…"}</span>
  <span className="play-store-copy">
   <small>{app.url?(compact?"Android 版":"GET IT ON Google Play"):"COMING SOON"}</small>
   <strong>{app.name}</strong>
   <span className="play-store-platform">{app.url?"Google Play":"Google Play 準備中"}</span>
  </span>
  <span className="play-store-arrow" aria-hidden="true">{app.url?"↗":"即將推出"}</span>
 </>;
 if(!app.url)return <div className={"play-store-link "+product+" unavailable"+(compact?" compact":"")} aria-label={app.name+" - Google Play 準備中"}>{content}</div>;
 return <a className={"play-store-link "+product+(compact?" compact":"")} href={app.url} target="_blank" rel="noopener noreferrer" aria-label={app.name+" - Google Play"}>{content}</a>;
}
