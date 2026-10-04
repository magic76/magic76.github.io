(function(global){
  "use strict";
  var SIGNS=["Aries 牡羊","Taurus 金牛","Gemini 雙子","Cancer 巨蟹","Leo 獅子","Virgo 處女","Libra 天秤","Scorpio 天蠍","Sagittarius 射手","Capricorn 摩羯","Aquarius 水瓶","Pisces 雙魚"];
  var NAK=["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
  var DASHA=["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
  var YEARS=[7,20,6,10,7,18,16,19,17],NAK_SIZE=360/27,PADA=NAK_SIZE/4,YEAR_DAYS=365.2425;

  function norm(x){x%=360;return x<0?x+360:x}
  function round(x,n){var p=Math.pow(10,n||4);return Math.round(x*p)/p}
  function jd(date){return date.getTime()/86400000+2440587.5}
  function centuries(date){return (jd(date)-2451545.0)/36525}
  function ayanamsa(t){return norm(23.8570923537+1.3972222222*t+.00018*t*t-.000005*t*t*t)}
  function meanNode(t){return norm(125.04452-1934.136261*t+.0020708*t*t+(t*t*t)/450000)}
  function meanObliquity(t){return (84381.448-46.8150*t-.00059*t*t+.001813*t*t*t)/3600}
  function position(lon){
    lon=norm(lon);
    var sign=Math.min(11,Math.floor(lon/30)),degree=lon-sign*30,nak=Math.min(26,Math.floor(lon/NAK_SIZE)),within=lon-nak*NAK_SIZE;
    return {longitude:lon,signIndex:sign,sign:SIGNS[sign],degreeInSign:degree,nakshatraIndex:nak,nakshatra:NAK[nak],pada:Math.min(4,Math.floor(within/PADA)+1)};
  }
  function ascendant(date,lat,lon,t){
    var ramc=norm(global.Astronomy.SiderealTime(date)*15+lon),eps=meanObliquity(t),theta=ramc*Math.PI/180,phi=lat*Math.PI/180,e=eps*Math.PI/180;
    var y=Math.cos(theta),x=-(Math.sin(theta)*Math.cos(e)+Math.tan(phi)*Math.sin(e));
    return norm(Math.atan2(y,x)*180/Math.PI);
  }
  function tropicalLongitude(body,date){
    if(body==="Sun")return norm(global.Astronomy.SunPosition(date).elon);
    if(body==="Moon")return norm(global.Astronomy.EclipticGeoMoon(date).lon);
    return norm(global.Astronomy.Ecliptic(global.Astronomy.GeoVector(body,date,true)).elon);
  }
  function delta(a,b){var d=norm(a-b);return d>180?d-360:d}
  function retrograde(body,date){
    if(body==="Sun"||body==="Moon")return false;
    var before=new Date(date.getTime()-12*3600000),after=new Date(date.getTime()+12*3600000);
    return delta(tropicalLongitude(body,after),tropicalLongitude(body,before))<0;
  }
  function house(lagna,sign){return ((sign-lagna+12)%12)+1}
  function localDate(date,offsetMinutes){
    var shifted=new Date(date.getTime()+offsetMinutes*60000);
    return shifted.toISOString().slice(0,10);
  }
  function addYears(date,years){return new Date(date.getTime()+years*YEAR_DAYS*86400000)}
  function dashaData(birth,now,offset,moonNak,moonLon){
    var start=moonNak%DASHA.length,within=norm(moonLon)-moonNak*NAK_SIZE,fraction=Math.max(0,Math.min(1,within/NAK_SIZE)),elapsed=YEARS[start]*fraction;
    var cursor=addYears(birth,-elapsed),timeline=[],currentMd=null,currentAd=null,future=[];
    for(var step=0;step<DASHA.length;step++){
      var li=(start+step)%DASHA.length,lord=DASHA[li],years=YEARS[li],end=addYears(cursor,years),antars=[],adCursor=new Date(cursor);
      for(var a=0;a<DASHA.length;a++){
        var ai=(li+a)%DASHA.length,adLord=DASHA[ai],adYears=years*YEARS[ai]/120,adEnd=a===DASHA.length-1?end:addYears(adCursor,adYears);
        var ad={lord:adLord,mahadashaLord:lord,startDate:localDate(adCursor,offset),endDate:localDate(adEnd,offset),startAge:round((adCursor-birth)/86400000/YEAR_DAYS,2),endAge:round((adEnd-birth)/86400000/YEAR_DAYS,2)};
        antars.push(ad);if(now>=adCursor&&now<adEnd)currentAd=ad;if(adEnd>now)future.push(ad);adCursor=adEnd;
      }
      var md={lord:lord,startDate:localDate(cursor,offset),endDate:localDate(end,offset),startAge:round((cursor-birth)/86400000/YEAR_DAYS,2),endAge:round((end-birth)/86400000/YEAR_DAYS,2),durationYears:years,antardashas:antars};
      timeline.push(md);if(now>=cursor&&now<end)currentMd=md;cursor=end;
    }
    function compact(x){if(!x)return{};return {lord:x.lord,mahadashaLord:x.mahadashaLord,startDate:x.startDate,endDate:x.endDate,startAge:x.startAge,endAge:x.endAge,durationYears:x.durationYears}}
    return {mahadashaTimeline:timeline,currentMahadasha:compact(currentMd),currentAntardasha:compact(currentAd),importantPeriods:future.slice(0,4).map(compact)};
  }
  function parseOffset(raw){
    var m=String(raw||"").match(/^([+-])(\d{2}):(\d{2})$/);if(!m)throw new Error("印度星盤需要 UTC offset，例如 +08:00");
    return (m[1]==="-"?-1:1)*(Number(m[2])*60+Number(m[3]));
  }
  function birthUtc(date,time,offset){
    var m=String(date+"T"+time+":00").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):00$/);if(!m)throw new Error("請填完整出生日期與時間");
    return new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5])-offset*60000);
  }
  function calculate(profile,now){
    if(!global.Astronomy)throw new Error("Astronomy Engine 尚未載入");
    var lat=Number(profile.latitude),lon=Number(profile.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error("印度星盤需要出生地經緯度");
    var offset=parseOffset(profile.utcOffset),birth=birthUtc(profile.birthDate,profile.birthTime,offset),current=now||new Date(),t=centuries(birth),aya=ayanamsa(t),asc=norm(ascendant(birth,lat,lon,t)-aya),lagna=position(asc);
    var bodies=["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"],planets=[];
    bodies.forEach(function(name){var tropical=tropicalLongitude(name,birth),sidereal=norm(tropical-aya),p=position(sidereal);planets.push({name:name,tropicalLongitude:round(tropical,6),siderealLongitude:round(sidereal,6),sign:p.sign,signIndex:p.signIndex,degreeInSign:round(p.degreeInSign,4),nakshatra:p.nakshatra,nakshatraIndex:p.nakshatraIndex,pada:p.pada,house:house(lagna.signIndex,p.signIndex),retrograde:retrograde(name,birth)})});
    var rahuT=meanNode(t),rahuS=norm(rahuT-aya),rp=position(rahuS),kp=position(norm(rahuS+180));
    planets.push({name:"Rahu",siderealLongitude:round(rahuS,6),sign:rp.sign,signIndex:rp.signIndex,degreeInSign:round(rp.degreeInSign,4),nakshatra:rp.nakshatra,nakshatraIndex:rp.nakshatraIndex,pada:rp.pada,house:house(lagna.signIndex,rp.signIndex),retrograde:true});
    planets.push({name:"Ketu",siderealLongitude:round(norm(rahuS+180),6),sign:kp.sign,signIndex:kp.signIndex,degreeInSign:round(kp.degreeInSign,4),nakshatra:kp.nakshatra,nakshatraIndex:kp.nakshatraIndex,pada:kp.pada,house:house(lagna.signIndex,kp.signIndex),retrograde:true});
    var moon=planets.filter(function(x){return x.name==="Moon"})[0],dasha=dashaData(birth,current,offset,moon.nakshatraIndex,moon.siderealLongitude);
    return {
      methodVersion:"vedic-lahiri-whole-sign-v1-web",
      ephemeris:"Astronomy Engine JS 2.1.19",zodiac:"Sidereal",ayanamsa:"Lahiri / Chitrapaksha",ayanamsaDegrees:round(aya,6),houseSystem:"Whole Sign",nodeType:"Mean Node",
      birthPlaceDisplay:profile.city||"",birthLatitude:lat,birthLongitude:lon,birthUtc:birth.toISOString(),birthUtcOffset:profile.utcOffset,
      lagnaLongitude:round(asc,6),lagnaSignIndex:lagna.signIndex,lagnaSign:lagna.sign,lagnaDegreeInSign:round(lagna.degreeInSign,4),lagnaNakshatra:lagna.nakshatra,lagnaPada:lagna.pada,
      moonSign:moon.sign,moonNakshatra:moon.nakshatra,moonPada:moon.pada,sunSign:planets[0].sign,planets:planets,
      currentMahadasha:dasha.currentMahadasha,currentAntardasha:dasha.currentAntardasha,importantPeriods:dasha.importantPeriods,mahadashaTimeline:dasha.mahadashaTimeline,
      note:"Web 與 App 同用 Astronomy Engine 2.1.19、Lahiri sidereal、Whole Sign、Mean Node。Web 版目前以使用者明確輸入 UTC offset 解析出生時間。"
    };
  }
  global.CrewFortuneVedic={calculate:calculate};
})(window);