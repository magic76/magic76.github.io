(function(global){
  "use strict";
  var STORE="story_books";
  async function save(book){
    book.updatedAt=new Date().toISOString();
    if(!book.createdAt)book.createdAt=book.updatedAt;
    await CrewDB.put(STORE,book);
    localStorage.setItem("crew_story_last_book_id",book.id);
    return book;
  }
  function get(id){return CrewDB.get(STORE,id)}
  async function list(){return CrewDB.list(STORE)}
  async function remove(id){
    await CrewDB.remove(STORE,id);
    if(localStorage.getItem("crew_story_last_book_id")===id)localStorage.removeItem("crew_story_last_book_id");
  }
  async function last(){
    var id=localStorage.getItem("crew_story_last_book_id");
    return id?get(id):null;
  }
  global.CrewStoryStore={save:save,get:get,list:list,remove:remove,last:last};
})(window);