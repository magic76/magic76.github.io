/**
 * Local, build-copied Explore illustrations. Timeline retains its original
 * portraits; the other destinations use static public assets (not JS imports).
 */
export type ExploreKind="fortune"|"timeline"|"games"|"story"|"research"|"circle"|"mate"|"town"|"magic"|"souls";
export function ExploreArtwork({kind}:{kind:ExploreKind}){
 if(kind==="souls")return <div className="crew-explore-souls-art" aria-hidden="true">
  <div className="crew-souls-art-aura"/>
  <div className="crew-souls-art-character">
   <div className="crew-souls-art-eyes"><i/><i/></div>
   <div className="crew-souls-art-smile"/>
  </div>
  <div className="crew-souls-art-speech"><span/><span/><span/></div>
  <div className="crew-souls-art-sparkle">✦</div>
 </div>;
 if(kind==="timeline")return <div className="crew-explore-life" aria-hidden="true">
  <div className="crew-explore-life-track"/>
  <img src="/assets/timeline/mira-7.webp" alt="" draggable="false"/>
  <img src="/assets/timeline/mira-25.webp" alt="" draggable="false"/>
  <img src="/assets/timeline/mira-70.webp" alt="" draggable="false"/>
 </div>;
 return <div className="crew-explore-illustration crew-explore-photo" aria-hidden="true">
  <img src={"/assets/explore/"+kind+".webp"} alt="" loading={kind==="fortune"?"eager":"lazy"} decoding="async" width={1200} height={800} draggable="false" {...(kind==="fortune"?{fetchPriority:"high" as const}:{})}/>
 </div>;
}
