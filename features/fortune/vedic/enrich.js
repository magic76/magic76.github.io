(function(global){
"use strict";
var SIGNS=["Aries 牡羊","Taurus 金牛","Gemini 雙子","Cancer 巨蟹","Leo 獅子","Virgo 處女","Libra 天秤","Scorpio 天蠍","Sagittarius 射手","Capricorn 摩羯","Aquarius 水瓶","Pisces 雙魚"];
var LORDS=["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
var NAK=["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"],NAK_SIZE=360/27;
function norm(x){x%=360;return x<0?x+360:x}
function jd(d){return d.getTime()/86400000+2440587.5}
function centuries(d){return(jd(d)-2451545)/36525}
function aya(t){return norm(23.8570923537+1.3972222222*t+.00018*t*t-.000005*t*t*t)}
function node(t){return norm(125.04452-1934.136261*t+.0020708*t*t+(t*t*t)/450000)}
function pos(lon){lon=norm(lon);var s=Math.floor(lon/30),deg=lon-s*30,n=Math.min(26,Math.floor(lon/NAK_SIZE));return{longitude:lon,signIndex:s,sign:SIGNS[s],degreeInSign:deg,nakshatra:NAK[n],pada:Math.min(4,Math.floor((lon-n*NAK_SIZE)/(NAK_SIZE/4))+1)}}
function tropical(name,date){
 if(name==="Sun")return norm(global.Astronomy.SunPosition(date).elon);
 if(name==="Moon")return norm(global.Astronomy.EclipticGeoMoon(date).lon);
 return norm(global.Astronomy.Ecliptic(global.Astronomy.GeoVector(name,date,true)).elon);
}
function delta(a,b){var d=norm(a-b);return d>180?d-360:d}
function retro(name,date){if(name==="Sun"||name==="Moon")return false;var a=new Date(date.getTime()-43200000),b=new Date(date.getTime()+43200000);return delta(tropical(name,b),tropical(name,a))<0}
function house(lagna,sign){return((sign-lagna+12)%12)+1}
function round(x,n){var p=Math.pow(10,n||4);return Math.round(x*p)/p}
function dignity(name,s){var map={Sun:[[0],[6],[4]],Moon:[[1],[7],[3]],Mars:[[9],[3],[0,7]],Mercury:[[5],[11],[2,5]],Jupiter:[[3],[9],[8,11]],Venus:[[11],[5],[1,6]],Saturn:[[6],[0],[9,10]]},v=map[name];if(!v)return"not_assigned";if(v[0].indexOf(s)>=0)return"exalted";if(v[1].indexOf(s)>=0)return"debilitated";if(v[2].indexOf(s)>=0)return"own_sign";return"neutral"}
function planetState(name,date,lagna){
 var t=centuries(date),a=aya(t),trop=name==="Rahu"?node(t):name==="Ketu"?norm(node(t)+180):tropical(name,date),sid=norm(trop-a),p=pos(sid);
 return{name:name,tropicalLongitude:round(trop,6),siderealLongitude:round(sid,6),signIndex:p.signIndex,sign:p.sign,degreeInSign:round(p.degreeInSign,4),nakshatra:p.nakshatra,pada:p.pada,natalHouse:house(lagna,p.signIndex),retrograde:name==="Rahu"||name==="Ketu"?true:retro(name,date),dignity:dignity(name,p.signIndex)};
}
function houses(result){
 var out=[];for(var h=1;h<=12;h++){var s=(result.lagnaSignIndex+h-1)%12,occupants=(result.planets||[]).filter(function(p){return Number(p.house)===h}).map(function(p){return p.name});out.push({house:h,signIndex:s,sign:SIGNS[s],lord:LORDS[s],planets:occupants})}return out
}
function lords(hs){return hs.map(function(h){return{house:h.house,sign:h.sign,lord:h.lord}})}
function evidencePlanet(result,name){var p=(result.planets||[]).find(function(x){return x.name===name});return p?name+" "+p.sign+" 第"+p.house+"宮 · "+p.nakshatra+" Pada "+p.pada+" · "+(p.dignity||"neutral")+(p.retrograde?" · retrograde":""):""}
function evidenceHouse(hs,n){var h=hs.find(function(x){return x.house===n});return h?n+"宮 "+h.sign+" · 宮主 "+h.lord+" · 宮內 "+(h.planets.length?h.planets.join("、"):"無"):""}
function lordEvidence(result,hs,n){var h=hs.find(function(x){return x.house===n});if(!h)return"";var p=(result.planets||[]).find(function(x){return x.name===h.lord});return p?n+"宮主 "+h.lord+" 落 "+p.sign+" 第"+p.house+"宮 · "+p.nakshatra+" Pada "+p.pada:""}
function dasha(result){var md=result.currentMahadasha||{},ad=result.currentAntardasha||{};return md.lord?"目前 Mahadasha "+md.lord+" "+(md.startDate||"")+"–"+(md.endDate||"")+(ad.lord?" · Antardasha "+ad.lord+" "+(ad.startDate||"")+"–"+(ad.endDate||""):""):""}
function profile(rule,arr){return{rule:rule,evidence:arr.filter(Boolean)}}
function currentTransits(result,date){return["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Rahu","Ketu"].map(function(n){return planetState(n,date,result.lagnaSignIndex)})}
function conjunctions(transits,natal){
 var out=[];(transits||[]).forEach(function(t){(natal||[]).forEach(function(n){var d=Math.abs(delta(Number(t.siderealLongitude),Number(n.siderealLongitude)));if(d<=3)out.push({transitPlanet:t.name,natalPlanet:n.name,natalHouse:n.house,sign:n.sign,separationDegrees:round(d,3)})})});return out
}
function aspects(transits,natal){
 var out=[];(transits||[]).forEach(function(t){if(t.name==="Rahu"||t.name==="Ketu")return;var offsets=[6];if(t.name==="Mars")offsets.push(3,7);if(t.name==="Jupiter")offsets.push(4,8);if(t.name==="Saturn")offsets.push(2,9);offsets.sort().forEach(function(o){var target=((Number(t.natalHouse)-1+o)%12)+1;out.push({transitPlanet:t.name,fromNatalHouse:t.natalHouse,toNatalHouse:target,distance:o+1,natalPlanets:(natal||[]).filter(function(p){return Number(p.house)===target}).map(function(p){return p.name})})})});return out
}
// Scan at most five UTC days at a time: an outer planet may enter and leave
// a sign within a single monthly sample during retrograde motion.
function signAt(name,date,lagna){
 var t=centuries(date),trop=name==="Rahu"?node(t):name==="Ketu"?norm(node(t)+180):tropical(name,date);
 var p=pos(norm(trop-aya(t)));
 return{signIndex:p.signIndex,sign:p.sign,natalHouse:house(lagna,p.signIndex)};
}
function refineIngress(name,left,right,lagna,fromIndex){
 var lo=left.getTime(),hi=right.getTime();
 // Stop at <= 1 hour, safely finer than the required UTC day precision.
 while(hi-lo>3600000){
  var mid=Math.floor((lo+hi)/2);
  if(signAt(name,new Date(mid),lagna).signIndex===fromIndex)lo=mid;
  else hi=mid;
 }
 return new Date(hi);
}
function majorTimeline(result,start){
 var names=["Jupiter","Saturn","Rahu","Ketu"],events=[],stepMs=5*86400000;
 names.forEach(function(name){
  var prevDate=new Date(start),prev=signAt(name,prevDate,result.lagnaSignIndex);
  for(var m=1;m<=36;m++){
   var end=new Date(start);end.setUTCMonth(end.getUTCMonth()+m);
   for(var time=Math.min(end.getTime(),prevDate.getTime()+stepMs);time<=end.getTime();time=Math.min(end.getTime(),time+stepMs)){
    var sampleDate=new Date(time),sample=signAt(name,sampleDate,result.lagnaSignIndex);
    if(sample.signIndex!==prev.signIndex){
     var exact=refineIngress(name,prevDate,sampleDate,result.lagnaSignIndex,prev.signIndex);
     var destination=planetState(name,exact,result.lagnaSignIndex);
     events.push({date:exact.toISOString().slice(0,10),exactAt:exact.toISOString(),planet:name,
      fromSign:prev.sign,toSign:destination.sign,fromHouse:prev.natalHouse,toHouse:destination.natalHouse,
      retrograde:destination.retrograde,direction:destination.retrograde?"retrograde":"direct"});
    }
    prevDate=sampleDate;prev=sample;
    if(time===end.getTime())break;
   }
  }
 });
 return events.sort(function(a,b){return a.exactAt.localeCompare(b.exactAt)});
}
function enrich(result,profileData,now){
 var date=now||new Date(),hs=houses(result),trans=currentTransits(result,date);
 result.houses=hs;result.houseLords=lords(hs);result.currentTransitDate=date.toISOString().slice(0,10);result.currentTransits=trans;result.transitConjunctionsToNatal=conjunctions(trans,result.planets);result.transitAspectsToNatal=aspects(trans,result.planets);result.majorTransitTimeline=majorTimeline(result,date);
 result.personalityProfile=profile("個性主題參考上升（Lagna）、上升宮主、月亮（Moon）與太陽（Sun）的位置。",["Lagna "+result.lagnaSign+" · "+result.lagnaNakshatra,lordEvidence(result,hs,1),evidencePlanet(result,"Moon"),evidencePlanet(result,"Sun")]);
 result.careerProfile=profile("事業主題參考第 10 宮、宮主、土星（Saturn）、木星（Jupiter）與目前人生週期。",[evidenceHouse(hs,10),lordEvidence(result,hs,10),evidencePlanet(result,"Saturn"),evidencePlanet(result,"Jupiter"),dasha(result)]);
 result.wealthProfile=profile("資源主題參考第 2、11 宮、木星（Jupiter）、金星（Venus）與目前人生週期。",[evidenceHouse(hs,2),lordEvidence(result,hs,2),evidenceHouse(hs,11),lordEvidence(result,hs,11),evidencePlanet(result,"Jupiter"),evidencePlanet(result,"Venus"),dasha(result)]);
 result.relationshipProfile=profile("感情與關係主題參考第 7 宮、宮主、金星（Venus）與目前人生週期。",[evidenceHouse(hs,7),lordEvidence(result,hs,7),evidencePlanet(result,"Venus"),dasha(result)]);
 result.familyChildrenProfile=profile("家庭主題參考第 4、5 宮、宮主、月亮（Moon）與木星（Jupiter）。",[evidenceHouse(hs,4),lordEvidence(result,hs,4),evidenceHouse(hs,5),lordEvidence(result,hs,5),evidencePlanet(result,"Moon"),evidencePlanet(result,"Jupiter")]);
 return result;
}
global.CrewFortuneVedicEnrich={enrich:enrich};
})(window);