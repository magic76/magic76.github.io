(function(global){
  "use strict";
  function esc(x){return CrewAI.esc(x==null?"":String(x))}
  function render(r){
    var cards=(r.birthCards||[]).map(function(c){return '<div class="fortune-fact"><small>'+esc(c.number)+'</small><strong>'+esc(c.name)+'</strong><div class="meta">'+esc(c.keywords)+'</div></div>'}).join("");
    var timeline=(r.personalYearTimeline||[]).map(function(x){return '<div class="fortune-timeline-row"><strong>'+esc(x.year)+'</strong><span>'+esc(x.personalYear)+' · '+esc(x.cardName)+'</span><span>'+esc(x.plainSummary)+'</span></div>'}).join("");
    return '<section class="fortune-result-card"><span class="eyebrow"><i></i> 塔羅生命靈數</span><h2>'+esc(r.birthCardDisplay)+'</h2><div class="fortune-facts"><div class="fortune-fact"><small>生命道路</small><strong>'+esc(r.lifePathDisplay)+'</strong></div><div class="fortune-fact"><small>態度數</small><strong>'+esc(r.attitudeNumber)+'</strong></div><div class="fortune-fact"><small>今年流年</small><strong>'+esc(r.personalYear)+' · '+esc(r.personalYearCardName)+'</strong></div><div class="fortune-fact"><small>本月</small><strong>'+esc(r.personalMonth)+'</strong></div></div></section>'+
      '<section class="fortune-result-card"><h3>出生牌</h3><div class="fortune-facts">'+cards+'</div></section>'+
      '<section class="fortune-result-card"><h3>流年時間軸</h3><div class="fortune-timeline">'+timeline+'</div><p class="meta">'+esc(r.note)+'</p></section>';
  }
  global.CrewFortuneTarotRender={render:render};
})(window);