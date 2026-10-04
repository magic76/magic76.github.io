(function(global){
  "use strict";
  var DB_NAME="crew_web_v1",DB_VERSION=1,dbPromise=null;
  function open(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise(function(resolve,reject){
      var req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=function(){
        var db=req.result;
        ["teacher_textbooks","story_books","media"].forEach(function(name){
          if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:"id"});
        });
      };
      req.onsuccess=function(){resolve(req.result)};
      req.onerror=function(){reject(req.error||new Error("IndexedDB open failed"))};
    });
    return dbPromise;
  }
  async function put(store,value){
    var db=await open();
    return new Promise(function(resolve,reject){
      var tx=db.transaction(store,"readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete=function(){resolve(value)};
      tx.onerror=function(){reject(tx.error||new Error("IndexedDB write failed"))};
    });
  }
  async function get(store,id){
    var db=await open();
    return new Promise(function(resolve,reject){
      var req=db.transaction(store,"readonly").objectStore(store).get(id);
      req.onsuccess=function(){resolve(req.result||null)};
      req.onerror=function(){reject(req.error||new Error("IndexedDB read failed"))};
    });
  }
  async function list(store){
    var db=await open();
    return new Promise(function(resolve,reject){
      var req=db.transaction(store,"readonly").objectStore(store).getAll();
      req.onsuccess=function(){resolve((req.result||[]).sort(function(a,b){return String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))}))};
      req.onerror=function(){reject(req.error||new Error("IndexedDB list failed"))};
    });
  }
  async function remove(store,id){
    var db=await open();
    return new Promise(function(resolve,reject){
      var tx=db.transaction(store,"readwrite");
      tx.objectStore(store).delete(id);
      tx.oncomplete=function(){resolve()};
      tx.onerror=function(){reject(tx.error||new Error("IndexedDB delete failed"))};
    });
  }
  function id(prefix){return (prefix||"item")+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
  global.CrewDB={open:open,put:put,get:get,list:list,remove:remove,id:id};
})(window);