type Product="teacher"|"story";

const APPS:Record<Product,{name:string;url:string}>={
 teacher:{name:"Crew Teacher",url:"https://play.google.com/store/apps/details?id=com.crewpocket.teacher"},
 story:{name:"Crew Story",url:"https://play.google.com/store/apps/details?id=com.crewpocket.story"}
};

export function PlayStoreLink({product,compact=false}:{product:Product;compact?:boolean}){
 const app=APPS[product];
 return <a
  className={"play-store-link "+product+(compact?" compact":"")}
  href={app.url}
  target="_blank"
  rel="noopener noreferrer"
  aria-label={app.name+" - Google Play"}
 >
  <span className="play-store-mark" aria-hidden="true">▶</span>
  <span className="play-store-copy"><small>{compact?"Android App":"GET IT ON"}</small><strong>Google Play</strong></span>
  <span className="play-store-arrow" aria-hidden="true">↗</span>
 </a>;
}
