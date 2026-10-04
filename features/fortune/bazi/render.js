(function(global){
  "use strict";
  function esc(x){return CrewAI.esc(x==null?"":String(x))}
  function render(r){
    var pillars=[["年柱",r.yearPillar],["月柱",r.monthPillar],["日柱",r.dayPillar],["時柱",r.timePillar]];
    var five=Object.keys(r.visibleFiveElements||{}).map(function(k){return '<div class="fortune-fact"><small>'+esc(k)+'</small><strong>'+esc(r.visibleFiveElements[k])+'</strong></div>'}).join("");
    var luck=r.currentLuckPillar?'<div class="fortune-fact"><small>目前大運</small><strong>'+esc(r.currentLuckPillar.ganZhi)+' · '+esc(r.currentLuckPillar.startYear)+'–'+esc(r.currentLuckPillar.endYear)+'</strong></div>':'';
    return '<section class="fortune-result-card"><span class="eyebrow"><i></i> 八字</span><h2>日主 '+esc(r.dayMaster)+esc(r.dayMasterElement)+' · '+esc(r.dayMasterStrength)+'</h2><p class="meta">'+esc(r.fourPillars)+'</p><div class="fortune-pillars">'+pillars.map(function(p){return '<div class="fortune-pillar"><small>'+p[0]+'</small><strong>'+esc(p[1])+'</strong></div>'}).join("")+'</div></section>'+
      '<section class="fortune-result-card"><h3>五行與旺衰</h3><div class="fortune-facts">'+five+'<div class="fortune-fact"><small>旺衰指數</small><strong>'+esc(r.strengthIndex)+'</strong></div><div class="fortune-fact"><small>平衡元素</small><strong>'+esc((r.balancingElements||[]).join("、"))+'</strong></div>'+luck+'</div></section>'+
      '<section class="fortune-result-card"><h3>命局互動</h3><p class="meta">'+esc((r.natalInteractions||[]).join(" · "))+'</p></section>';
  }
  global.CrewFortuneBaZiRender={render:render};
})(window);