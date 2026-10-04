(function(global){
  "use strict";
  var STORE="teacher_textbooks";
  async function save(session){
    session.updatedAt=new Date().toISOString();
    if(!session.createdAt)session.createdAt=session.updatedAt;
    await CrewDB.put(STORE,session);
    localStorage.setItem("crew_teacher_textbook_last_id",session.id);
    return session;
  }
  async function load(id){return id?CrewDB.get(STORE,id):null}
  async function last(){
    var id=localStorage.getItem("crew_teacher_textbook_last_id");
    if(id){
      var item=await load(id);
      if(item)return item;
    }
    var list=await CrewDB.list(STORE);
    return list[0]||null;
  }
  async function list(){return CrewDB.list(STORE)}
  async function remove(id){
    await CrewDB.remove(STORE,id);
    if(localStorage.getItem("crew_teacher_textbook_last_id")===id)localStorage.removeItem("crew_teacher_textbook_last_id");
  }
  global.CrewTextbookStore={save:save,load:load,last:last,list:list,remove:remove};
})(window);