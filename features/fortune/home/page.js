(function(){
  "use strict";
  var recent=document.getElementById("fortuneRecent");
  if(recent&&window.CrewFortuneProfile){
    var list=CrewFortuneProfile.history().slice(0,3);
    if(!list.length){
      recent.innerHTML='<div class="fortune-home-empty"><strong>還沒有解讀紀錄</strong><span>完成第一份命盤後，最近結果會出現在這裡。</span></div>';
    }else{
      var labels={bazi:"八字",tarot:"塔羅生命靈數",vedic:"印度星盤"};
      recent.innerHTML=list.map(function(item){
        var label=labels[item.mode]||"解讀";
        var d=item.createdAt?new Date(item.createdAt).toLocaleDateString():"";
        return '<div class="fortune-history-row">'+
          '<span class="fortune-history-mark '+(item.mode||"")+'"></span><span><strong>'+label+'</strong><small>'+CrewAI.esc(item.summary||d)+'</small></span><b>·</b></div>';
      }).join("");
    }
  }
  var settings=document.getElementById("fortuneQuickSettings");
  if(settings)settings.onclick=function(){
    var el=document.getElementById("fortuneSettings");
    if(el){el.open=true;el.scrollIntoView({behavior:"smooth",block:"center"})}
  };
})();