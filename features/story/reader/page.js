(function(){
  "use strict";
  var id=new URLSearchParams(location.search).get("id"),book=null,index=0;
  var reader=document.getElementById("reader"),missing=document.getElementById("missingStory");
  function render(){
    if(!book)return;
    var pages=book.pages||[],page=pages[index]||{},imageIndex=Number(page.imageIndex),image=(book.images||[])[imageIndex];
    document.getElementById("readerTitle").textContent=book.title||"我的故事";
    document.getElementById("readerText").textContent=page.text||"";
    document.getElementById("pageCount").textContent="PAGE "+(index+1)+" / "+Math.max(1,pages.length);
    var img=document.getElementById("readerImage");
    if(image){img.src=image.preview;img.style.display=""}else{img.removeAttribute("src");img.style.display="none"}
    document.getElementById("prevStoryPage").disabled=index===0;
    document.getElementById("nextStoryPage").disabled=index>=pages.length-1;
    book.currentPage=index;CrewStoryStore.save(book).catch(function(){});
  }
  document.getElementById("prevStoryPage").onclick=function(){if(index>0){index--;render()}};
  document.getElementById("nextStoryPage").onclick=function(){if(book&&index<(book.pages||[]).length-1){index++;render()}};
  document.getElementById("deleteStory").onclick=async function(){if(!book||!confirm("刪除這本故事？"))return;await CrewStoryStore.remove(book.id);location.href="story-shelf.html"};
  CrewStoryStore.get(id).then(function(value){
    if(!value){missing.hidden=false;return}
    book=value;index=Math.max(0,Math.min(Number(book.currentPage)||0,(book.pages||[]).length-1));reader.hidden=false;render();
  }).catch(function(){missing.hidden=false});
})();