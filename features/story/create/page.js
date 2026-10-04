(function(){
  "use strict";
  var MAX=8,images=[],coverIndex=0;
  var listEl=document.getElementById("photoList"),countEl=document.getElementById("photoCount"),generate=document.getElementById("generateStory"),progress=document.getElementById("progress");
  function render(){
    countEl.textContent=images.length+" 張";
    if(!images.length){listEl.innerHTML='<div class="story-empty">沒有照片也可以只用文字靈感創作。</div>';return}
    listEl.innerHTML=images.map(function(img,index){
      return '<div class="story-photo-row '+(index===coverIndex?'cover':'')+'" data-index="'+index+'"><img src="'+img.preview+'" alt="故事照片 '+(index+1)+'"><div><strong>照片 '+(index+1)+'</strong><p class="meta">'+img.width+'×'+img.height+' · '+Math.max(1,Math.round(img.bytes/1024))+' KB'+(index===coverIndex?' · 封面':'')+'</p><button class="btn secondary small" data-action="cover">設為封面</button></div><div class="story-photo-actions"><button data-action="up" '+(index===0?'disabled':'')+'>↑</button><button data-action="down" '+(index===images.length-1?'disabled':'')+'>↓</button><button data-action="remove">×</button></div></div>';
    }).join("");
    listEl.querySelectorAll("[data-action]").forEach(function(button){
      button.onclick=function(){
        var row=button.closest("[data-index]"),i=Number(row.dataset.index),action=button.dataset.action;
        if(action==="cover"){coverIndex=i;render();return}
        if(action==="remove"){
          images.splice(i,1);
          if(coverIndex===i)coverIndex=0;
          else if(coverIndex>i)coverIndex--;
        }
        if(action==="up"&&i>0){
          var item=images.splice(i,1)[0];images.splice(i-1,0,item);
          if(coverIndex===i)coverIndex=i-1;else if(coverIndex===i-1)coverIndex=i;
        }
        if(action==="down"&&i<images.length-1){
          var item2=images.splice(i,1)[0];images.splice(i+1,0,item2);
          if(coverIndex===i)coverIndex=i+1;else if(coverIndex===i+1)coverIndex=i;
        }
        render();
      };
    });
  }
  async function add(files){
    files=Array.prototype.slice.call(files||[]).slice(0,MAX-images.length);
    for(var i=0;i<files.length;i++){
      try{images.push(await CrewLiveUI.prepareImage(files[i],{maxSide:1600,quality:.84}));render()}
      catch(error){CrewAI.toast(error.message)}
    }
    if(images.length>=MAX)CrewAI.toast("最多 8 張故事照片");
  }
  document.getElementById("addPhotos").onclick=function(){document.getElementById("photoInput").click()};
  document.getElementById("photoInput").onchange=function(){add(this.files);this.value=""};
  generate.onclick=async function(){
    var idea=document.getElementById("storyIdea").value.trim();
    if(!idea&&!images.length){CrewAI.toast("寫一句靈感或加入照片");return}
    if(!CrewAI.requireKey())return;
    CrewAI.busy(generate,true,"阿奇創作中…");progress.classList.add("show");
    try{
      var output=await CrewStoryGenerator.create(idea,images.map(function(x){return {data:x.data,mimeType:x.mimeType}}));
      var book={
        id:CrewDB.id("story"),
        title:output.title,
        summary:output.summary,
        idea:idea,
        coverIndex:images.length?coverIndex:-1,
        images:images.slice(),
        pages:output.pages,
        currentPage:0
      };
      await CrewStoryStore.save(book);
      location.href="story-reader.html?id="+encodeURIComponent(book.id);
    }catch(error){CrewAI.toast(error.message)}
    finally{CrewAI.busy(generate,false);progress.classList.remove("show")}
  };
  render();
})();