(function(global){
  "use strict";
  var PROFILE_KEY="crew_fortune_profile_v2",HISTORY_KEY="crew_fortune_readings_v2";
  function load(){
    try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}")}catch(_){return{}}
  }
  function save(value){localStorage.setItem(PROFILE_KEY,JSON.stringify(value||{}));return value}
  function addHistory(item){
    var list=history();
    list.unshift(item);
    localStorage.setItem(HISTORY_KEY,JSON.stringify(list.slice(0,30)));
    localStorage.setItem("crew_fortune_last_reading",JSON.stringify(item));
    return item;
  }
  function history(){
    try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]")}catch(_){return[]}
  }
  function last(){
    try{return JSON.parse(localStorage.getItem("crew_fortune_last_reading")||"null")}catch(_){return null}
  }
  global.CrewFortuneProfile={load:load,save:save,addHistory:addHistory,history:history,last:last};
})(window);