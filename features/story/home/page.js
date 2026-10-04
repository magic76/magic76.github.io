(function(){
  "use strict";
  var recent=document.getElementById("storyRecent");
  if(!recent||!window.CrewStoryStore)return;
  CrewStoryStore.last().then(function(book){
    if(!book){
      recent.innerHTML='<div class="story-home-empty"><strong>還沒有故事</strong><span>先建立一本，之後會從這裡直接繼續。</span><a href="story-create.html">建立故事 →</a></div>';
      return;
    }
    var cover=(book.images||[])[Number(book.coverIndex)||0];
    var media=cover?'<img src="'+cover.preview+'" alt="">':'<span class="story-home-letter">S</span>';
    recent.innerHTML='<a class="story-home-recent" href="story-reader.html?id='+encodeURIComponent(book.id)+'">'+
      '<div class="story-home-cover">'+media+'</div>'+
      '<div class="story-home-copy"><small>繼續閱讀</small><strong>'+CrewAI.esc(book.title||"我的故事")+'</strong>'+
      '<span>'+((book.pages||[]).length)+' 頁 · 上次看到第 '+((Number(book.currentPage)||0)+1)+' 頁</span></div><b>›</b></a>';
  }).catch(function(){});
})();