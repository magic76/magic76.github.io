(function(){
  "use strict";
  CrewAI.nav("story");
  async function render(){
    var list=await CrewStoryStore.list();
    var shelf=document.getElementById("storyShelf");
    document.getElementById("storyCount").textContent=list.length+" 本";
    if(!list.length){shelf.innerHTML='<div class="story-empty">還沒有自己的故事。先建立一本，之後會一直留在這台裝置。</div>';return}
    shelf.innerHTML=list.map(function(book){
      var cover=(book.images||[])[Number(book.coverIndex)||0];
      var media=cover?'<img src="'+cover.preview+'" alt="故事封面">':'<span>S</span>';
      return '<article class="story-book" data-id="'+book.id+'"><div class="story-cover">'+media+'</div><div class="story-book-body"><h3>'+CrewAI.esc(book.title||"我的故事")+'</h3><p>'+CrewAI.esc(book.summary||"")+'</p><p>'+((book.pages||[]).length)+' 頁 · '+new Date(book.updatedAt).toLocaleDateString()+'</p><div class="story-book-actions"><a class="btn small" href="story-reader.html?id='+encodeURIComponent(book.id)+'">打開</a><button class="btn danger small" data-delete="'+book.id+'">刪除</button></div></div></article>';
    }).join("");
    shelf.querySelectorAll("[data-delete]").forEach(function(button){
      button.onclick=async function(event){
        event.preventDefault();event.stopPropagation();
        if(!confirm("刪除這本故事？"))return;
        await CrewStoryStore.remove(button.dataset.delete);
        render();
      };
    });
  }
  render().catch(function(error){CrewAI.toast(error.message)});
})();