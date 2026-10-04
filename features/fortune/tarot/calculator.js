(function(global){
  "use strict";
  var NAMES=["愚者","魔術師","女祭司","皇后","皇帝","教皇","戀人","戰車","力量","隱者","命運之輪","正義","倒吊人","死神","節制","惡魔","高塔","星星","月亮","太陽","審判","世界"];
  var KEYWORDS=["自由、開始、未知","行動、意志、創造","直覺、內在、觀察","滋養、豐盛、感受","結構、責任、掌控","傳統、學習、價值","選擇、關係、結盟","推進、意志、方向","勇氣、耐性、內在力量","獨處、研究、尋找答案","循環、轉折、時機","平衡、判斷、責任","換角度、暫停、放下控制","轉化、結束舊階段、更新","調和、節奏、整合","慾望、執著、束縛","突破、重建、醒悟","希望、修復、願景","想像、不確定、潛意識","活力、清晰、展現","覺醒、回顧、重新選擇","完成、整合、下一階段"];
  function digitSum(v){return String(Math.abs(v)).split("").reduce(function(s,x){return s+Number(x)},0)}
  function reduceSingle(v){v=Math.abs(v);while(v>9)v=digitSum(v);return v}
  function reduceMaster(v){while(v>9&&v!==11&&v!==22&&v!==33)v=digitSum(v);return v}
  function reduce22(v){v=Math.abs(v);while(v>22)v=digitSum(v);return v===0?22:v}
  function cardIndex(n){return n===22?0:Math.max(0,Math.min(21,n))}
  function reducePinnacle(v){while(v>9&&v!==11&&v!==22)v=digitSum(v);return v}
  function yearSummary(n){return ["","新週期啟動，適合定方向、開始新計畫與建立自主節奏","合作與關係調整更重要，適合觀察、協調與耐心累積","表達、創作與社交能見度提高，適合把想法說出來做出來","重點在打基礎、制度化與穩定推進，成果靠持續累積","變化、移動與新選項增加，適合保持彈性但避免亂衝","責任、家庭、承諾與照顧議題變重，需要平衡自己與他人","研究、內省與重新理解方向的一年，適合減少雜訊、深挖能力","成果、資源與現實目標被放大，適合談效率、權責與資源配置","整理、完成與收尾的年份，適合清掉舊包袱並準備下一輪"][n]||"保持觀察"}
  function calculate(dateString,now){
    var p=String(dateString||"").split("-").map(Number);
    if(p.length!==3||!p[0]||!p[1]||!p[2])throw new Error("請選擇生日");
    var y=p[0],m=p[1],d=p[2],raw=digitSum(y)+digitSum(m)+digitSum(d);
    var life=reduceMaster(raw),personality=reduce22(raw),soul=reduceSingle(personality),attitude=reduceSingle(m+d);
    var current=(now||new Date()).getFullYear(),month=(now||new Date()).getMonth()+1;
    var personalYear=reduceSingle(reduceSingle(m)+reduceSingle(d)+reduceSingle(digitSum(current)));
    var personalMonth=reduceSingle(personalYear+month);
    var cards=[personality];if(soul!==personality)cards.push(soul);
    var birthCards=cards.map(function(n){return {number:n,name:NAMES[cardIndex(n)],keywords:KEYWORDS[cardIndex(n)]}});
    var mr=reduceMaster(m),dr=reduceMaster(d),yr=reduceMaster(digitSum(y));
    var p1=reducePinnacle(mr+dr),p2=reducePinnacle(dr+yr),p3=reducePinnacle(p1+p2),p4=reducePinnacle(mr+yr);
    var ms=reduceSingle(m),ds=reduceSingle(d),ys=reduceSingle(digitSum(y));
    var c1=Math.abs(ms-ds),c2=Math.abs(ds-ys),c3=Math.abs(c1-c2),c4=Math.abs(ms-ys);
    var firstEnd=36-reduceSingle(life);
    var timeline=[],monthTimeline=[];
    for(var yrx=current-1;yrx<=current+9;yrx++){
      var n=reduceSingle(reduceSingle(m)+reduceSingle(d)+reduceSingle(digitSum(yrx)));
      timeline.push({year:yrx,personalYear:n,cardName:NAMES[cardIndex(n)],keywords:KEYWORDS[cardIndex(n)],plainSummary:yearSummary(n)});
    }
    for(var mm=1;mm<=12;mm++){
      var pm=reduceSingle(personalYear+mm);
      monthTimeline.push({month:mm,personalMonth:pm,cardName:NAMES[cardIndex(pm)],keywords:KEYWORDS[cardIndex(pm)],plainSummary:yearSummary(pm)});
    }
    var identityProfile={rule:"人格牌、靈魂牌、生命道路與態度數描述主要內外在節奏。",evidence:["人格牌 "+personality+" "+NAMES[cardIndex(personality)],"靈魂牌 "+soul+" "+NAMES[cardIndex(soul)],"生命道路 "+((life===11||life===22||life===33)?life+"/"+reduceSingle(life):life),"態度數 "+attitude]};
    var careerProfile={rule:"工作主題只從生命道路、人格牌、目前流年與 Pinnacle 節奏整理。",evidence:["生命道路 "+life,"人格牌 "+NAMES[cardIndex(personality)],current+" 流年 "+personalYear+" "+NAMES[cardIndex(personalYear)],"Pinnacles "+[p1,p2,p3,p4].join(" → ")]};
    var wealthProfile={rule:"財務只談資源與現實節奏，不做投資預測。",evidence:["目前流年 "+personalYear+" "+NAMES[cardIndex(personalYear)],"目前月份 "+personalMonth+" "+NAMES[cardIndex(personalMonth)],"Challenges "+[c1,c2,c3,c4].join(" → ")]};
    var relationshipProfile={rule:"關係主題以人格/靈魂差異、態度數與目前流年作自我反思。",evidence:["人格牌 "+NAMES[cardIndex(personality)],"靈魂牌 "+NAMES[cardIndex(soul)],"態度數 "+attitude,current+" 流年 "+personalYear]};
    return {
      methodVersion:"tarot-personality-soul-birthday-v6-timeline",
      lifePathNumber:life,
      lifePathDisplay:(life===11||life===22||life===33)?life+"/"+reduceSingle(life):String(life),
      personalityCardNumber:personality,personalityCardName:NAMES[cardIndex(personality)],
      soulCardNumber:soul,soulCardName:NAMES[cardIndex(soul)],
      talentNumbers:String(Math.abs(raw)).split("").map(Number),talentSource:raw,
      birthdayNumber:d,birthdayCore:reduceSingle(d),attitudeNumber:attitude,
      personalYearCalendarYear:current,personalYear:personalYear,personalYearCardName:NAMES[cardIndex(personalYear)],
      personalMonth:personalMonth,birthCards:birthCards,
      birthCardDisplay:birthCards.map(function(x){return x.number+" "+x.name}).join(" × "),
      pinnacles:[p1,p2,p3,p4],pinnacleTiming:["0–"+firstEnd,(firstEnd+1)+"–"+(firstEnd+9),(firstEnd+10)+"–"+(firstEnd+18),(firstEnd+19)+"+"],
      challenges:[c1,c2,c3,c4],periodCycles:[mr,dr,yr],personalYearTimelineStartYear:current-1,personalYearTimelineEndYear:current+9,personalYearTimeline:timeline,personalMonthTimeline:monthTimeline,
      identityProfile:identityProfile,careerProfile:careerProfile,wealthProfile:wealthProfile,relationshipProfile:relationshipProfile,
      note:cards.indexOf(13)>=0?"死神牌在此代表轉化與階段更替，不是死亡預測。":"塔羅生命靈數作為娛樂與自我反思用途，不代表必然命運。"
    };
  }
  global.CrewFortuneTarot={calculate:calculate};
})(window);