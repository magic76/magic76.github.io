/* An explicitly opened, same-origin friend chat. The lab owns the creature
   and its save. The frame owns the microphone and reports completed turns. */
(()=>{'use strict';
 const byId=id=>document.getElementById(id);
 const ROUTE=location.pathname.startsWith('/crew-app/')
  ?'/crew-app/#/friend/live?id=zoe&from=creature&embed=1'
  :'/friend/live?id=zoe&from=creature&embed=1';
 const TURN_ID=/^[A-Za-z0-9_.:-]{1,160}$/;

 function mount({getContext,recordTurn,evolve}){
  const open=byId('openVoice'),close=byId('closeVoice'),panel=byId('voicePanel');
  const local=byId('localChatPanel'),host=byId('voiceFrameHost'),status=byId('voiceStatus');
  const evolveHere=byId('voiceEvolve');
  let active=null;

  function setStatus(text){
   status.textContent=text;
   status.hidden=!text;
  }
  function send(message){
   active.frame.contentWindow?.postMessage(message,location.origin);
  }
  function sendContext(force){
   if(!active?.ready)return;
   const creature=getContext();
   const signature=JSON.stringify(creature);
   if(!force&&(active.closing||signature===active.lastContext))return;
   active.lastContext=signature;
   send({type:'CREW_CREATURE_VOICE_CONTEXT',channelId:active.channelId,creature});
  }
  function sync(){
   if(!active)return;
   const meter=byId('energyText').textContent,name=byId('creatureName').textContent;
   const summary=name+' · '+meter,progress=byId('voiceProgress');
   if(progress.textContent!==summary)progress.textContent=summary;
   const main=byId('evolveBtn');
   evolveHere.hidden=main.hidden||main.disabled||active.closing;
   evolveHere.textContent=main.textContent;
   sendContext(false);
  }
  function finish(session){
   if(active!==session)return;
   clearTimeout(session.timer);
   active=null;
   session.frame.remove();
   panel.hidden=true;
   local.hidden=false;
   open.textContent='和 Zoe 語音聊天';
   open.setAttribute('aria-expanded','false');
   close.disabled=false;
   if(session.after)session.after();
   if(session.returnFocus)open.focus();
  }
  function stop(){
   if(!active||active.closing)return;
   const session=active;
   session.closing=true;
   close.disabled=true;
   clearTimeout(session.timer);
   setStatus('正在結束對話…');
   sync();
   session.timer=setTimeout(()=>finish(session),3000);
   send({type:'CREW_CREATURE_VOICE_STOP',channelId:session.channelId});
  }
  function afterStop(action){
   if(!active)return action();
   if(active.after)return false;
   active.after=action;
   stop();
   return true;
  }
  function receive(event){
   if(!active||event.origin!==location.origin||!active.frame.contentWindow||event.source!==active.frame.contentWindow)return;
   const msg=event.data;
   if(!msg||typeof msg!=='object')return;
   if(msg.type==='CREW_CREATURE_VOICE_READY'){
    active.ready=true;
    if(!active.closing){clearTimeout(active.timer);setStatus('');}
    sendContext(true);
    if(active.closing)send({type:'CREW_CREATURE_VOICE_STOP',channelId:active.channelId});
    return;
   }
   if(msg.channelId!==active.channelId)return;
   if(msg.type==='CREW_CREATURE_VOICE_STOPPED'&&active.closing){finish(active);return;}
   if(msg.type!=='CREW_CREATURE_VOICE_TURN'||!active.ready||typeof msg.turnId!=='string'||
      !TURN_ID.test(msg.turnId)||active.seen.has(msg.turnId))return;
   if(typeof msg.input!=='string'||!msg.input.trim()||typeof msg.output!=='string'||!msg.output.trim())return;
   active.seen.add(msg.turnId);
   recordTurn(msg.input);
  }
  function start(){
   if(!active){
    const frame=document.createElement('iframe');
    frame.title='和 Zoe 即時對話';
    frame.allow='microphone';
    frame.src=ROUTE;
    const channelId=window.crypto.randomUUID?.()||Array.from(window.crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
    const session={frame,channelId,seen:new Set(),ready:false,closing:false,after:null,returnFocus:true,timer:0,lastContext:''};
    active=session;
    local.hidden=true;
    panel.hidden=false;
    open.setAttribute('aria-expanded','true');
    open.textContent='回到語音對話';
    setStatus('正在開啟 Zoe 的即時對話…');
    session.timer=setTimeout(()=>{
     if(active===session&&!session.ready&&!session.closing)setStatus('語音頁還沒連上。可關閉對話後重試，或繼續用本機文字聊天。');
    },15000);
    host.appendChild(frame);
    sync();
   }
   panel.scrollIntoView({block:'start'});
   close.focus({preventScroll:true});
  }
  open.hidden=false;
  open.addEventListener('click',start);
  close.addEventListener('click',stop);
  evolveHere.addEventListener('click',()=>{if(!evolveHere.hidden)evolve();});
  window.addEventListener('message',receive);
  window.addEventListener('pagehide',()=>{if(active){active.returnFocus=false;stop();}});
  return {sync,afterStop};
 }
 window.CrewCreatureVoice={mount};
})();
