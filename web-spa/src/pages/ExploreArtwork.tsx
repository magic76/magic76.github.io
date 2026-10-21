import type {ReactNode} from "react";

/**
 * Small bespoke scene illustrations for Crew Explore.
 * All scenes are vector, except the Timeline's approved Mira portraits; they
 * add no fonts, third-party assets or network dependencies.
 */
export type ExploreKind="fortune"|"timeline"|"games"|"story"|"research"|"circle";
const scene:Record<Exclude<ExploreKind,"timeline">,ReactNode>={
 fortune:<svg viewBox="0 0 200 126" fill="none" aria-hidden="true" focusable="false">
  <ellipse cx="105" cy="68" rx="73" ry="34" stroke="currentColor" strokeOpacity=".17" strokeWidth="1.4" transform="rotate(-22 105 68)"/>
  <circle cx="107" cy="65" r="41" stroke="currentColor" strokeOpacity=".38" strokeWidth="1.4"/>
  <circle cx="107" cy="65" r="29" fill="#FFF9EF" fillOpacity=".72" stroke="currentColor" strokeOpacity=".28"/>
  <circle cx="107" cy="65" r="16" fill="#F8DFAC" stroke="currentColor" strokeOpacity=".3"/>
  <path d="M107 44v5m0 32v5M86 65h5m32 0h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".65"/>
  <circle cx="40" cy="89" r="9" fill="#B6A2EB" stroke="#FFFFFF" strokeWidth="3"/>
  <circle cx="158" cy="35" r="7" fill="#E5B66D" stroke="#FFFFFF" strokeWidth="3"/>
  <path d="m44 20 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8ZM166 89l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#FFFFFF" stroke="#8A6AB7" strokeWidth="1.2"/>
 </svg>,
 games:<svg viewBox="0 0 200 126" fill="none" aria-hidden="true" focusable="false">
  <g transform="rotate(-10 90 64)">
   <rect x="33" y="29" width="112" height="76" rx="17" fill="#FFFDF8" stroke="#C9DBBA" strokeWidth="2"/>
   <rect x="45" y="41" width="88" height="52" rx="9" fill="#D9E9C7"/>
   <path d="M73 42v50M104 42v50M46 59h86M46 76h86" stroke="#A7C49C" strokeOpacity=".58"/>
   <circle cx="59" cy="50" r="6" fill="#5B8A76"/><circle cx="90" cy="84" r="6" fill="#5B8A76"/>
   <path d="m111 47 9 9m0-9-9 9M50 79l10 10m0-10-10 10" stroke="#DC936E" strokeWidth="4" strokeLinecap="round"/>
  </g>
  <rect x="131" y="62" width="41" height="41" rx="11" transform="rotate(16 131 62)" fill="#FFF5E6" stroke="#E6B994" strokeWidth="1.8"/>
  <circle cx="151" cy="74" r="3.5" fill="#D59077"/><circle cx="143" cy="90" r="3.5" fill="#D59077"/><circle cx="159" cy="94" r="3.5" fill="#D59077"/>
  <path d="m151 16 3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#F6DB9B"/>
 </svg>,
 story:<svg viewBox="0 0 200 126" fill="none" aria-hidden="true" focusable="false">
  <ellipse cx="105" cy="105" rx="73" ry="9" fill="#A5BBD8" fillOpacity=".26"/>
  <path d="M37 46q31-19 64 2v54q-32-19-64-5V46Z" fill="#FFFFFF" stroke="#8DA8C3" strokeWidth="2"/>
  <path d="M101 48q33-21 64-2v51q-32-14-64 5V48Z" fill="#E4ECFA" stroke="#8DA8C3" strokeWidth="2"/>
  <path d="M101 48v54M46 59q26-11 45 0M46 68q26-8 45 2M46 78q26-6 45 3M110 60q24-11 43-3M110 72q24-9 43-2M110 84q24-7 43-2" stroke="#A9BAD0" strokeWidth="1.3" strokeLinecap="round"/>
  <path d="m127 18 3.5 10 10 3.5-10 3.5-3.5 10-3.5-10-10-3.5 10-3.5z" fill="#EDCB81" stroke="#D0A962"/>
  <path d="m64 16 2.4 6.6L73 25l-6.6 2.4L64 34l-2.4-6.6L55 25l6.6-2.4z" fill="#FFFFFF" stroke="#8DA8C3"/>
 </svg>,
 research:<svg viewBox="0 0 200 126" fill="none" aria-hidden="true" focusable="false">
  <rect x="49" y="15" width="102" height="99" rx="12" fill="#FFFFFF" stroke="#B1C2C3" strokeWidth="2" transform="rotate(5 49 15)"/>
  <rect x="35" y="22" width="102" height="92" rx="11" fill="#F8FCFC" stroke="#B1C2C3" strokeWidth="2" transform="rotate(-5 35 22)"/>
  <path d="M53 44h44M53 51h33" stroke="#91AEB6" strokeWidth="3" strokeLinecap="round"/>
  <path d="M56 94V77M70 94V71M84 94V81M98 94V62M112 94V68" stroke="#91BAB3" strokeWidth="7" strokeLinecap="round"/>
  <path d="m55 74 17-8 17 7 16-24 12 4" stroke="#457B87" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
  <circle cx="105" cy="49" r="3.5" fill="#457B87"/>
  <circle cx="156" cy="30" r="13" fill="#E8D7A7" stroke="#FFFFFF" strokeWidth="3"/>
  <path d="m152 30 3 3 5-6" stroke="#796633" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>,
 circle:<svg viewBox="0 0 200 126" fill="none" aria-hidden="true" focusable="false">
  <path d="M73 65q25-32 58 1M68 79q32 29 73 0" stroke="#BEA9CE" strokeWidth="2.2" strokeDasharray="4 5" strokeLinecap="round"/>
  <rect x="27" y="20" width="45" height="34" rx="14" fill="#FFFFFF" stroke="#DDBCD0" strokeWidth="2"/>
  <path d="M43 54v8l9-8" stroke="#DDBCD0" strokeWidth="2" strokeLinejoin="round"/>
  <circle cx="44" cy="37" r="3" fill="#D897B1"/><circle cx="54" cy="37" r="3" fill="#D897B1"/>
  <circle cx="91" cy="56" r="24" fill="#F2D7D8" stroke="#FFFFFF" strokeWidth="3"/>
  <circle cx="91" cy="51" r="9" fill="#BE8F98"/><path d="M75 72c2-10 8-14 16-14s14 4 16 14" fill="#BE8F98"/>
  <circle cx="144" cy="70" r="21" fill="#DFE8D5" stroke="#FFFFFF" strokeWidth="3"/>
  <circle cx="144" cy="66" r="8" fill="#87A18B"/><path d="M131 83c1-9 6-13 13-13s12 4 13 13" fill="#87A18B"/>
  <path d="m158 19 2.7 6.3L167 28l-6.3 2.7L158 37l-2.7-6.3L149 28l6.3-2.7z" fill="#F5D8A8"/>
  <circle cx="49" cy="99" r="7" fill="#FFFFFF" stroke="#C59BB8" strokeWidth="2"/>
 </svg>
};
export function ExploreArtwork({kind}:{kind:ExploreKind}){
 if(kind==="timeline")return <div className="crew-explore-life" aria-hidden="true">
  <div className="crew-explore-life-track"/>
  <img src="/assets/timeline/mira-7.webp" alt="" draggable="false"/>
  <img src="/assets/timeline/mira-25.webp" alt="" draggable="false"/>
  <img src="/assets/timeline/mira-70.webp" alt="" draggable="false"/>
 </div>;
 return <div className="crew-explore-illustration" aria-hidden="true">{scene[kind]}</div>;
}
