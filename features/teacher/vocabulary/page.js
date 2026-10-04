(function(){
"use strict";
CrewAI.nav("teacher");
var WORDS=[
["borrow","借用","Can I borrow your charger for a minute?","A2","日常",24],
["receipt","收據","Could I get a receipt, please?","A2","購物",28],
["available","可用的／有空的","Is this seat available?","A2","日常",32],
["recommend","推薦","What would you recommend here?","A2","餐廳",35],
["appointment","預約","I need to make an appointment.","A2","生活",38],
["deadline","截止期限","We need to meet the deadline.","B1","工作",45],
["priority","優先事項","This task is our top priority.","B1","工作",48],
["confirm","確認","Could you confirm the booking?","B1","旅遊",50],
["approach","做法／方法","We need a different approach.","B1","工作",53],
["concern","擔憂／關切","My main concern is the schedule.","B1","工作",55],
["flexible","有彈性的","The plan is flexible.","B1","日常",56],
["clarify","釐清","Could you clarify what you mean?","B1","工作",58],
["efficient","有效率的","This is a more efficient process.","B1","工作",60],
["estimate","估計","Can you give me an estimate?","B1","工作",62],
["negotiate","協商","We may need to negotiate the terms.","B2","工作",67],
["constraint","限制條件","Time is our biggest constraint.","B2","工作",70],
["trade-off","取捨","There is a trade-off between speed and quality.","B2","工作",72],
["subtle","細微的","There is a subtle difference in tone.","B2","表達",74],
["perspective","觀點","I understand your perspective.","B2","表達",76],
["feasible","可行的","Is this solution feasible by Friday?","B2","工作",78],
["allocate","分配","We should allocate more time to testing.","B2","工作",80],
["ambiguous","模糊不清的","The requirement is still ambiguous.","B2","工作",82],
["mitigate","降低／緩解","This change should mitigate the risk.","C1","工作",86],
["counterpart","對應的人／單位","I spoke with my counterpart in London.","C1","工作",87],
["nuance","細微差異","That translation misses an important nuance.","C1","表達",88],
["articulate","清楚表達","She articulated the idea clearly.","C1","表達",90],
["concede","承認／讓步","He conceded that the timeline was unrealistic.","C1","表達",92],
["pragmatic","務實的","We need a pragmatic solution.","C1","工作",93],
["scrutinize","仔細審查","The team will scrutinize the proposal.","C1","工作",95],
["ubiquitous","無所不在的","Smartphones have become ubiquitous.","C1","一般",97]
];
var state={score:Number(localStorage.getItem("crew_vocab_score")||50),done:Number(localStorage.getItem("crew_vocab_today")||0),streak:0,current:null,locked:false};
var els={word:document.getElementById("wordText"),example:document.getElementById("wordExample"),choices:document.getElementById("choices"),feedback:document.getElementById("feedback"),level:document.getElementById("levelBadge"),wordLevel:document.getElementById("wordLevel"),topic:document.getElementById("wordTopic"),status:document.getElementById("vocabStatus"),fill:document.getElementById("progressFill"),streak:document.getElementById("streakBadge")};

function cefr(score){if(score<30)return"A1";if(score<45)return"A2";if(score<62)return"B1";if(score<82)return"B2";return"C1"}
function speak(text){
 if(!("speechSynthesis" in window))return;
 speechSynthesis.cancel();
 var u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=.9;speechSynthesis.speak(u);
}
function shuffle(items){
 var a=items.slice();
 for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}
 return a;
}
function pick(){
 var pool=WORDS.filter(function(w){return Math.abs(w[5]-state.score)<=14});
 if(pool.length<4)pool=WORDS.slice();
 var next=pool[Math.floor(Math.random()*pool.length)];
 if(state.current&&pool.length>1&&next[0]===state.current[0])next=pool[(pool.indexOf(next)+1)%pool.length];
 return next;
}
function renderMeta(){
 var level=cefr(state.score);
 els.level.textContent=state.done<6?level+" · 探測中":level;
 els.status.textContent=state.done+" / 20";
 els.fill.style.width=Math.min(100,state.done/20*100)+"%";
 els.streak.textContent=(state.streak>=2?"⚡ ":"")+state.streak+" 連擊";
 localStorage.setItem("crew_vocab_score",String(Math.round(state.score)));
 localStorage.setItem("crew_vocab_today",String(state.done));
}
function next(){
 state.locked=false;state.current=pick();
 var w=state.current;
 els.word.textContent=w[0];els.example.textContent=w[2];els.wordLevel.textContent=w[3];els.topic.textContent=w[4];
 els.feedback.textContent="選出最接近的中文意思。";
 var wrong=shuffle(WORDS.filter(function(x){return x[0]!==w[0]&&Math.abs(x[5]-w[5])<20})).slice(0,2).map(function(x){return x[1]});
 var options=shuffle([w[1]].concat(wrong));
 els.choices.innerHTML=options.map(function(x){return'<button class="quiz-choice" data-answer="'+CrewAI.esc(x)+'">'+CrewAI.esc(x)+'</button>'}).join("");
 els.choices.querySelectorAll(".quiz-choice").forEach(function(btn){btn.onclick=function(){answer(btn)}});
 renderMeta();
}
function answer(btn){
 if(state.locked)return;
 state.locked=true;
 var correct=btn.dataset.answer===state.current[1],buttons=els.choices.querySelectorAll(".quiz-choice");
 buttons.forEach(function(x){x.disabled=true;if(x.dataset.answer===state.current[1])x.classList.add("correct")});
 if(correct){
   state.streak++;state.score=Math.min(100,state.score+Math.min(8,4+Math.floor(state.streak/4)));state.done++;
   btn.classList.add("correct");els.feedback.textContent="答對了。"+state.current[2];speak(state.current[0]);
   renderMeta();setTimeout(next,1100);
 }else{
   state.streak=0;state.score=Math.max(0,state.score-10);state.done++;
   btn.classList.add("wrong");els.feedback.textContent="正確是「"+state.current[1]+"」。例句："+state.current[2]+"　可以再點一次發音。";speak(state.current[0]);
   renderMeta();setTimeout(next,3000);
 }
}
document.getElementById("speakWord").onclick=function(){if(state.current)speak(state.current[0])};
next();
})();