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
function majorTimeline(result,start){
 var names=["Jupiter","Saturn","Rahu","Ketu"],events=[];names.forEach(function(name){var prevDate=new Date(start),prev=planetState(name,prevDate,result.lagnaSignIndex);for(var m=1;m<=36;m++){var d=new Date(start);d.setUTCMonth(d.getUTCMonth()+m);var s=planetState(name,d,result.lagnaSignIndex);if(s.signIndex!==prev.signIndex)events.push({date:d.toISOString().slice(0,10),planet:name,fromSign:prev.sign,toSign:s.sign,fromHouse:prev.natalHouse,toHouse:s.natalHouse,retrograde:s.retrograde,direction:s.retrograde?"retrograde":"direct"});prev=s;prevDate=d}});return events.sort(function(a,b){return a.date.localeCompare(b.date)})
}
function enrich(result,profileData,now){
 var date=now||new Date(),hs=houses(result),trans=currentTransits(result,date);
 result.houses=hs;result.houseLords=lords(hs);result.currentTransitDate=date.toISOString().slice(0,10);result.currentTransits=trans;result.transitConjunctionsToNatal=conjunctions(trans,result.planets);result.transitAspectsToNatal=aspects(trans,result.planets);result.majorTransitTimeline=majorTimeline(result,date);
 result.personalityProfile=profile("Lagna、Lagna lord、Moon 與 Sun 描述本命性格與外在／內在節奏。",["Lagna "+result.lagnaSign+" · "+result.lagnaNakshatra,lordEvidence(result,hs,1),evidencePlanet(result,"Moon"),evidencePlanet(result,"Sun")]);
 result.careerProfile=profile("工作主題以 10 宮、10 宮主、Saturn/Jupiter 與目前 Dasha 為 deterministic evidence。",[evidenceHouse(hs,10),lordEvidence(result,hs,10),evidencePlanet(result,"Saturn"),evidencePlanet(result,"Jupiter"),dasha(result)]);
 result.wealthProfile=profile("資源與財務以 2 宮、11 宮、Jupiter/Venus 與目前 Dasha 觀察；不是投資預測。",[evidenceHouse(hs,2),lordEvidence(result,hs,2),evidenceHouse(hs,11),lordEvidence(result,hs,11),evidencePlanet(result,"Jupiter"),evidencePlanet(result,"Venus"),dasha(result)]);
 result.relationshipProfile=profile("感情與關係以 7 宮、7 宮主、Venus 與目前 Dasha 為主要 evidence。",[evidenceHouse(hs,7),lordEvidence(result,hs,7),evidencePlanet(result,"Venus"),dasha(result)]);
 result.familyChildrenProfile=profile("家庭與子女只提供 4 宮／5 宮及宮主、Moon/Jupiter 的結構 evidence。",[evidenceHouse(hs,4),lordEvidence(result,hs,4),evidenceHouse(hs,5),lordEvidence(result,hs,5),evidencePlanet(result,"Moon"),evidencePlanet(result,"Jupiter")]);
 return result;
}
global.CrewFortuneVedicEnrich={enrich:enrich};
})(window);