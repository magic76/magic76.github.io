(function(global){
  "use strict";
  var ELEMENTS=["木","火","土","金","水"];
  var GAN_ELEMENT={"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
  var ZHI_ELEMENT={"寅":"木","卯":"木","巳":"火","午":"火","辰":"土","戌":"土","丑":"土","未":"土","申":"金","酉":"金","亥":"水","子":"水"};
  var GENERATES={"木":"火","火":"土","土":"金","金":"水","水":"木"};
  var CONTROLS={"木":"土","火":"金","土":"水","金":"木","水":"火"};

  function parseDate(raw){
    var p=String(raw||"").split("-").map(Number);
    if(p.length!==3||!p[0]||!p[1]||!p[2])throw new Error("生日格式請用 yyyy-MM-dd");
    return p;
  }
  function parseTime(raw){
    var p=String(raw||"").split(":").map(Number);
    if(p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))throw new Error("八字需要出生時間");
    return p;
  }
  function intMap(){var out={};ELEMENTS.forEach(function(x){out[x]=0});return out}
  function doubleMap(){var out={};ELEMENTS.forEach(function(x){out[x]=0});return out}
  function add(map,key,val){if(key&&Object.prototype.hasOwnProperty.call(map,key))map[key]+=(val==null?1:val)}
  function hidden(eight,part){
    var fn=eight["get"+part+"HideGan"];
    try{return typeof fn==="function"?(fn.call(eight)||[]):[]}catch(_){return[]}
  }
  function addHidden(map,stems,weight){
    var ratios=stems.length===1?[1]:stems.length===2?[.7,.3]:[.6,.3,.1];
    stems.forEach(function(stem,i){add(map,GAN_ELEMENT[stem],weight*ratios[Math.min(i,ratios.length-1)])});
  }
  function strengthLabel(index){
    if(index>=70)return"偏旺";
    if(index>=58)return"身強";
    if(index>=43)return"中和";
    if(index>=30)return"身弱";
    return"偏弱";
  }
  function balancing(dayElement,strength){
    var i=ELEMENTS.indexOf(dayElement);if(i<0)return[];
    var resource=ELEMENTS[(i+4)%5],output=GENERATES[dayElement],wealth=CONTROLS[dayElement],officer=ELEMENTS[(i+3)%5];
    if(strength<43)return[resource,dayElement];
    if(strength>57)return[output,wealth,officer];
    return[output,resource];
  }
  function pairRelations(stems,branches){
    var out=[];
    function scan(values,relations){
      for(var i=0;i<values.length;i++)for(var j=i+1;j<values.length;j++)relations.forEach(function(r){
        if((values[i]===r[0]&&values[j]===r[1])||(values[i]===r[1]&&values[j]===r[0]))out.push(values[i]+values[j]+" "+r[2]);
      });
    }
    scan(stems,[["甲","己","天干五合"],["乙","庚","天干五合"],["丙","辛","天干五合"],["丁","壬","天干五合"],["戊","癸","天干五合"]]);
    scan(branches,[["子","丑","六合"],["寅","亥","六合"],["卯","戌","六合"],["辰","酉","六合"],["巳","申","六合"],["午","未","六合"],["子","午","六沖"],["丑","未","六沖"],["寅","申","六沖"],["卯","酉","六沖"],["辰","戌","六沖"],["巳","亥","六沖"],["子","未","六害"],["丑","午","六害"],["寅","巳","六害"],["卯","辰","六害"],["申","亥","六害"],["酉","戌","六害"]]);
    [["申子辰","申子辰三合水局"],["亥卯未","亥卯未三合木局"],["寅午戌","寅午戌三合火局"],["巳酉丑","巳酉丑三合金局"],["寅巳申","寅巳申三刑"],["丑未戌","丑未戌三刑"]].forEach(function(item){
      if(item[0].split("").every(function(x){return branches.indexOf(x)>=0}))out.push(item[1]);
    });
    return out.length?out:["命局內未偵測到主要六合、六沖、六害或三合／三刑組合"];
  }
  function safeCall(obj,name,fallback){
    try{return obj&&typeof obj[name]==="function"?obj[name]():fallback}catch(_){return fallback}
  }
  function calculate(birthDate,birthTime,gender,now){
    if(!global.Solar)throw new Error("八字計算引擎尚未載入");
    var d=parseDate(birthDate),t=parseTime(birthTime);
    var solar=global.Solar.fromYmdHms(d[0],d[1],d[2],t[0],t[1],0);
    var eight=solar.getLunar().getEightChar();
    if(eight.setSect)eight.setSect(2);

    var year=safeCall(eight,"getYear",""),month=safeCall(eight,"getMonth",""),day=safeCall(eight,"getDay",""),time=safeCall(eight,"getTime","");
    var yg=year.charAt(0),yz=year.charAt(1),mg=month.charAt(0),mz=month.charAt(1),dg=day.charAt(0),dz=day.charAt(1),tg=time.charAt(0),tz=time.charAt(1);
    var visible=intMap();
    [GAN_ELEMENT[yg],ZHI_ELEMENT[yz],GAN_ELEMENT[mg],ZHI_ELEMENT[mz],GAN_ELEMENT[dg],ZHI_ELEMENT[dz],GAN_ELEMENT[tg],ZHI_ELEMENT[tz]].forEach(function(x){add(visible,x,1)});
    var weighted=doubleMap();
    add(weighted,GAN_ELEMENT[yg],1);add(weighted,GAN_ELEMENT[mg],1.2);add(weighted,GAN_ELEMENT[dg],1);add(weighted,GAN_ELEMENT[tg],1);
    addHidden(weighted,hidden(eight,"Year"),1);addHidden(weighted,hidden(eight,"Month"),2);addHidden(weighted,hidden(eight,"Day"),1);addHidden(weighted,hidden(eight,"Time"),1);
    var total=0,support=0,dayElement=GAN_ELEMENT[dg],resource=ELEMENTS[(ELEMENTS.indexOf(dayElement)+4)%5];
    Object.keys(weighted).forEach(function(k){total+=weighted[k];if(k===dayElement||k===resource)support+=weighted[k]});
    var strength=Math.round((total?support/total:.5)*100);

    var tenGods={
      yearStem:safeCall(eight,"getYearShiShenGan",""),
      monthStem:safeCall(eight,"getMonthShiShenGan",""),
      dayStem:"日主",
      timeStem:safeCall(eight,"getTimeShiShenGan",""),
      yearBranch:safeCall(eight,"getYearShiShenZhi",[]),
      monthBranch:safeCall(eight,"getMonthShiShenZhi",[]),
      dayBranch:safeCall(eight,"getDayShiShenZhi",[]),
      timeBranch:safeCall(eight,"getTimeShiShenZhi",[])
    };

    var luck=[],currentLuck=null,luckDirection="",luckStart="",luckStartAge="";
    try{
      var yun=eight.getYun(Number(gender)===1?1:0,2);
      luckDirection=yun.isForward()?"順行":"逆行";
      luckStart=yun.getStartSolar().toYmd();
      luckStartAge=yun.getStartYear()+"年"+yun.getStartMonth()+"月"+yun.getStartDay()+"日";
      var cy=(now||new Date()).getFullYear();
      (yun.getDaYun(9)||[]).forEach(function(x){
        if(x.getIndex&&x.getIndex()===0)return;
        var item={ganZhi:x.getGanZhi(),startYear:x.getStartYear(),endYear:x.getEndYear(),startAge:x.getStartAge(),endAge:x.getEndAge()};
        luck.push(item);if(cy>=item.startYear&&cy<=item.endYear)currentLuck=item;
      });
    }catch(_){}

    var values=Object.keys(visible),strongest=values[0],weakest=values[0];
    values.forEach(function(k){if(visible[k]>visible[strongest])strongest=k;if(visible[k]<visible[weakest])weakest=k});
    return {
      methodVersion:"bazi-mainstream-report-v3-insight-timeline-lunar-js-1.7.7-sect2",
      fourPillars:[year,month,day,time].join(" "),
      yearPillar:year,monthPillar:month,dayPillar:day,timePillar:time,
      dayMaster:dg,dayMasterElement:dayElement,
      visibleFiveElements:visible,weightedFiveElements:weighted,strongestVisibleElement:strongest,weakestVisibleElement:weakest,
      hiddenStems:{year:hidden(eight,"Year"),month:hidden(eight,"Month"),day:hidden(eight,"Day"),time:hidden(eight,"Time")},
      tenGods:tenGods,strengthIndex:strength,dayMasterStrength:strengthLabel(strength),balancingElements:balancing(dayElement,strength),
      natalInteractions:pairRelations([yg,mg,dg,tg],[yz,mz,dz,tz]),
      naYin:[safeCall(eight,"getYearNaYin",""),safeCall(eight,"getMonthNaYin",""),safeCall(eight,"getDayNaYin",""),safeCall(eight,"getTimeNaYin","")],
      mingGong:safeCall(eight,"getMingGong",""),shenGong:safeCall(eight,"getShenGong",""),
      luckDirection:luckDirection,luckStart:luckStart,luckStartAge:luckStartAge,luckPillars:luck,currentLuckPillar:currentLuck,
      note:"出生地當地民用時間；晚子時採 sect=2。Web 與 App 同樣使用 lunar 1.7.7 系列計算核心。"
    };
  }
  global.CrewFortuneBaZi={calculate:calculate};
})(window);