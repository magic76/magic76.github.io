(function(global){
  "use strict";
  function esc(x){return CrewAI.esc(x==null?"":String(x))}
  function render(r){
    var planets=(r.planets||[]).map(function(p){return '<div class="fortune-planet"><strong>'+esc(p.name)+'</strong><br>'+esc(p.sign)+' · H'+esc(p.house)+(p.retrograde?' · Rx':'')+'</div>'}).join("");
    var md=r.currentMahadasha||{},ad=r.currentAntardasha||{};
    return '<section class="fortune-result-card"><span class="eyebrow"><i></i> 印度星盤</span><h2>Lagna '+esc(r.lagnaSign)+' · Moon '+esc(r.moonSign)+'</h2><div class="fortune-facts"><div class="fortune-fact"><small>Lagna Nakshatra</small><strong>'+esc(r.lagnaNakshatra)+' · Pada '+esc(r.lagnaPada)+'</strong></div><div class="fortune-fact"><small>Moon Nakshatra</small><strong>'+esc(r.moonNakshatra)+' · Pada '+esc(r.moonPada)+'</strong></div><div class="fortune-fact"><small>Mahadasha</small><strong>'+esc(md.lord||"—")+' '+esc(md.startDate||"")+'–'+esc(md.endDate||"")+'</strong></div><div class="fortune-fact"><small>Antardasha</small><strong>'+esc(ad.lord||"—")+' '+esc(ad.startDate||"")+'–'+esc(ad.endDate||"")+'</strong></div></div></section>'+
      '<section class="fortune-result-card"><h3>行星落點</h3><div class="fortune-planets">'+planets+'</div></section>'+
      '<section class="fortune-result-card"><p class="meta">'+esc(r.note)+'</p></section>';
  }
  global.CrewFortuneVedicRender={render:render};
})(window);