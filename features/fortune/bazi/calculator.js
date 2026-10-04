(function(global){
  "use strict";
  var ELEMENTS=["木","火","土","金","水"];
  var GAN_ELEMENT={"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
  var ZHI_ELEMENT={"寅":"木","卯":"木","巳":"火","午":"火","辰":"土","戌":"土","丑":"土","未":"土","申":"金","酉":"金","亥":"水","子":"水"};
  var GENERATES={"木":"火","火":"土","土":"金","金":"水","水":"木"};
  var CONTROLS={"木":"土","火":"金","土":"水","金":"木","水":"火"};

  var YANG={"甲":1,"丙":1,"戊":1,"庚":1,"壬":1};
  var HIDDEN={"子":["癸"],"丑":["己","癸","辛"],"寅":["甲","丙","戊"],"卯":["乙"],"辰":["戊","乙","癸"],"巳":["丙","戊","庚"],"午":["丁","己"],"未":["己","丁","乙"],"申":["庚","壬","戊"],"酉":["辛"],"戌":["戊","辛","丁"],"亥":["壬","甲"]};
  function tenGod(dayGan,otherGan){
    var de=GAN_ELEMENT[dayGan],oe=GAN_ELEMENT[otherGan],same=!!YANG[dayGan]===!!YANG[otherGan];
    if(!de||!oe)return"";
    if(de===oe)return same?"比肩":"劫財";
    if(GENERATES[de]===oe)return same?"食神":"傷官";
    if(GENERATES[oe]===de)return same?"偏印":"正印";
    if(CONTROLS[de]===oe)return same?"偏財":"正財";
    if(CONTROLS[oe]===de)return same?"七殺":"正官";
    return"";
  }
  function branchGods(dayGan,zhi){return(HIDDEN[zhi]||[]).map(function(g){return tenGod(dayGan,g)}).filter(Boolean)}
  function branchRelation(a,b){
    var pair=a+b,rev=b+a;
    var maps=[["子丑","六合"],["寅亥","六合"],["卯戌","六合"],["辰酉","六合"],["巳申","六合"],["午未","六合"],["子午","六沖"],["丑未","六沖"],["寅申","六沖"],["卯酉","六沖"],["辰戌","六沖"],["巳亥","六沖"],["子未","六害"],["丑午","六害"],["寅巳","六害"],["卯辰","六害"],["申亥","六害"],["酉戌","六害"]];
    for(var i=0;i<maps.length;i++)if(pair===maps[i][0]||rev===maps[i][0])return maps[i][1];
    return"";
  }
  function themes(stemGod,gods,relations){
    var all=[stemGod].concat(gods||[]),out=[],joined=(relations||[]).join(" ");
    if(all.some(function(x){return x==="正財"||x==="偏財"}))out.push("財星／資源");
    if(all.some(function(x){return x==="正官"||x==="七殺"}))out.push("責任／規範");
    if(all.some(function(x){return x==="正印"||x==="偏印"}))out.push("學習／支援");
    if(all.some(function(x){return x==="食神"||x==="傷官"}))out.push("輸出／表達");
    if(all.some(function(x){return x==="比肩"||x==="劫財"}))out.push("自我／同儕");
    if(joined.indexOf("沖")>=0)out.push("變動");
    if(joined.indexOf("合")>=0)out.push("合作／連結");
    if(joined.indexOf("刑")>=0||joined.indexOf("害")>=0)out.push("摩擦／調整");
    return out.length?out:["常態推進"];
  }
  function plainSummary(ts){
    var p=[];
    if(ts.indexOf("財星／資源")>=0)p.push("金錢、資源與現實成果議題較容易被放大");
    if(ts.indexOf("責任／規範")>=0)p.push("工作責任、制度要求或角色壓力較明顯");
    if(ts.indexOf("學習／支援")>=0)p.push("學習、資格、資源支援與整理能力較重要");
    if(ts.indexOf("輸出／表達")>=0)p.push("輸出、表達、作品與把想法做出來的需求增加");
    if(ts.indexOf("自我／同儕")>=0)p.push("自主性、競爭、合作分工與同儕關係更值得注意");
    if(ts.indexOf("變動")>=0)p.push("合沖訊號帶來較強的調整與變動感");
    if(ts.indexOf("合作／連結")>=0)p.push("合作、關係連結或資源整合機會增加");
    if(ts.indexOf("摩擦／調整")>=0)p.push("容易出現卡點，適合提早調整節奏與界線");
    return p.length?p.slice(0,3).join("；"):"這段以穩定推進為主，沒有特別突出的主題訊號";
  }
  function godMeaning(g){
    return{"正財":"穩定收入、資源管理、現實責任","偏財":"機會型資源、人脈、彈性收入","正官":"責任、規範、職位與制度","七殺":"壓力、競爭、決斷與高要求","正印":"學習、支援、資格與保護","偏印":"研究、洞察、非典型學習","食神":"穩定輸出、創造、享受與表達","傷官":"強表達、突破、質疑與創新","比肩":"自主、同儕、競爭與自我主張","劫財":"合作競爭、資源分配與人際拉扯"}[g]||"";
  }

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

    var currentYear=(now||new Date()).getFullYear(),annualTimeline=[];
    function luckForYear(year){for(var i=0;i<luck.length;i++)if(year>=luck[i].startYear&&year<=luck[i].endYear)return luck[i];return null}
    for(var yy=currentYear-1;yy<=currentYear+15;yy++){
      var gz=safeCall(global.Solar.fromYmd(yy,7,1).getLunar(),"getYearInGanZhiExact","");
      if(!gz||gz.length<2)continue;
      var gan=gz.charAt(0),zhi=gz.charAt(1),sg=tenGod(dg,gan),bgs=branchGods(dg,zhi),relations=[];
      [yz,mz,dz,tz].forEach(function(natal){var rel=branchRelation(natal,zhi);if(rel)relations.push(natal+zhi+" "+rel)});
      var lp=luckForYear(yy),ts=themes(sg,bgs,relations);
      annualTimeline.push({year:yy,nominalAge:yy-d[0]+1,ganZhi:gz,stemTenGod:sg,branchTenGods:bgs,element:(GAN_ELEMENT[gan]||"")+(ZHI_ELEMENT[zhi]||""),natalInteractions:relations,luckPillar:lp&&lp.ganZhi||"",themes:ts,plainSummary:plainSummary(ts),stemTenGodMeaning:godMeaning(sg)});
    }
    var allGods=[tenGods.yearStem,tenGods.monthStem,tenGods.timeStem].concat(tenGods.yearBranch||[],tenGods.monthBranch||[],tenGods.dayBranch||[],tenGods.timeBranch||[]);
    function countGod(names){return allGods.filter(function(g){return names.indexOf(String(g).replace("财","財").replace("杀","殺").replace("伤","傷"))>=0}).length}
    function signalYears(names){return annualTimeline.filter(function(y){return names.indexOf(y.stemTenGod)>=0||(y.branchTenGods||[]).some(function(g){return names.indexOf(g)>=0})}).map(function(y){return y.year})}
    var wealthProfile={wealthElement:CONTROLS[dayElement],directWealthCount:countGod(["正財"]),indirectWealthCount:countGod(["偏財"]),currentLuck:currentLuck,annualSignalYears:signalYears(["正財","偏財"]),evidenceRule:"財運只整理財星、大運與流年啟動及合沖訊號，不等於收入、投資報酬或必然事件"};
    var careerProfile={officerCount:countGod(["正官","七殺"]),resourceCount:countGod(["正印","偏印"]),outputCount:countGod(["食神","傷官"]),currentLuck:currentLuck,annualSignalYears:signalYears(["正官","七殺","正印","偏印","食神","傷官"]),evidenceRule:"工作主題以官殺、印、食傷及大運流年互動整理，不直接等同升職、轉職或失業預測"};
    var partnerGods=Number(gender)===1?["正財","偏財"]:["正官","七殺"],relationshipYears=annualTimeline.filter(function(y){var z=y.ganZhi.charAt(1),rel=branchRelation(dz,z),active=partnerGods.indexOf(y.stemTenGod)>=0||(y.branchTenGods||[]).some(function(g){return partnerGods.indexOf(g)>=0});return rel||active}).map(function(y){return{year:y.year,ganZhi:y.ganZhi,spousePalaceInteraction:branchRelation(dz,y.ganZhi.charAt(1)),partnerGodActive:partnerGods.indexOf(y.stemTenGod)>=0||(y.branchTenGods||[]).some(function(g){return partnerGods.indexOf(g)>=0})}});
    var relationshipProfile={spousePalace:dz,spousePalaceHiddenStems:HIDDEN[dz]||[],spousePalaceTenGods:branchGods(dg,dz),partnerGodConvention:partnerGods,partnerGodCount:countGod(partnerGods),annualSignalYears:relationshipYears,evidenceRule:"感情以日支配偶宮、常見男女財官約定及大運流年合沖整理，只作娛樂解讀"};
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
      annualTimelineStartYear:currentYear-1,annualTimelineEndYear:currentYear+15,annualTimeline:annualTimeline,annualTimelineConvention:"逐年干支以該年年中日期取得八字流年干支；實際交界以立春節氣為準",
      wealthProfile:wealthProfile,careerProfile:careerProfile,relationshipProfile:relationshipProfile,
      note:"出生地當地民用時間；晚子時採 sect=2。Web 與 App 同樣使用 lunar 1.7.7 系列計算核心。"
    };
  }
  global.CrewFortuneBaZi={calculate:calculate};
})(window);