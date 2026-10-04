(function(){
"use strict";
CrewAI.nav("teacher");
var passages=[
 {id:"london",title:"Getting around London",meta:"B1 · 旅遊",text:"Excuse me, could you tell me which platform I need for the train to Paddington? I just want to make sure I'm getting on the right train."},
 {id:"meeting",title:"A smaller rollout",meta:"B2 · 工作",text:"I think a smaller rollout would reduce the risk. We can validate the main assumptions first, then expand once the results are stable."},
 {id:"hotel",title:"Late checkout",meta:"B1 · 旅遊",text:"Hi, I was wondering whether a late checkout would be possible tomorrow. If there is an extra fee, could you let me know how much it is?"},
 {id:"opinion",title:"Explaining a concern",meta:"B2 · 表達",text:"My main concern is not the idea itself, but the timing. If we rush the launch, we may create more problems than we solve."}
];
var selected=passages[0],library=document.getElementById("readingLibrary");
function esc(s){return CrewAI.esc(s)}
function renderLibrary(){
 library.innerHTML=passages.map(function(p){return'<button class="reading-card '+(p.id===selected.id?'active':'')+'" data-id="'+p.id+'"><strong>'+esc(p.title)+'</strong><small>'+esc(p.meta)+'</small><p>'+esc(p.text)+'</p></button>'}).join("");
 library.querySelectorAll("[data-id]").forEach(function(btn){btn.onclick=function(){selected=passages.find(function(p){return p.id===btn.dataset.id})||passages[0];renderLibrary();renderPassage()}});
}
function renderPassage(){document.getElementById("readingTitle").textContent=selected.title;document.getElementById("readingMeta").textContent=selected.meta;document.getElementById("readingText").textContent=selected.text}
function system(){
 return "你是 Crew Teacher 的朗讀糾音老師 Emma。學生會朗讀畫面上的英文文章。"+
 "你必須根據你實際聽到的音訊判斷 pronunciation、word stress、sentence stress、rhythm 和 linking；不要從文字 transcript 猜發音。"+
 "每次最多指出 1-2 個最值得修的點。先簡短示範自然讀法，再讓學生重念該片段。"+
 "如果聽不清楚，就明確說聽不清楚並請學生重念，不要假裝判斷。"+
 "學生文章如下：\n"+selected.text;
}
function opening(){
 return "請先簡短說『準備好了，從第一句開始念』，然後安靜等學生朗讀。不要先念完整文章。";
}
var ui=CrewLiveUI.bind({
 pageKey:"teacher_pronunciation",
 labels:{user:"你",ai:"Emma"},
 idleModelLabel:"Live tutor",
 speakingLabel:"老師回饋中",
 notStartedText:"先開始朗讀",
 endedText:"朗讀練習已結束。",
 voice:function(){return localStorage.getItem("crew_teacher_voice")||"Kore"},
 system:system,
 openingPrompt:opening,
 historyTitle:function(){return"朗讀糾音 · "+selected.title}
});
renderLibrary();renderPassage();
})();