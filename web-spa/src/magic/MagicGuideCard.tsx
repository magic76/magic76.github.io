import {Link} from 'react-router-dom';
export type MagicVoiceState='idle'|'connecting'|'listening'|'speaking'|'error';
export function MagicGuideCard({zh,voiceState,isOnline,muted,volume,hasKey,starting,toolsAvailable,notice,heard,said,onStop,onStart,onToggleMic,onVolume}:{
 zh:boolean;voiceState:MagicVoiceState;isOnline:boolean;muted:boolean;volume:number;hasKey:boolean;starting:boolean;
 toolsAvailable:boolean;notice:string;heard:string;said:string;
 onStop:()=>void;onStart:()=>void;onToggleMic:()=>void;onVolume:(n:number)=>void;
}){
 const t=(a:string,b:string)=>zh?a:b;
 return <section className="magic-guide-card">
  <div className="magic-guide-row">
   <span className={'magic-lumi'+(voiceState==='speaking'?' is-speaking':'')} aria-hidden="true">✦</span>
   <div className="magic-guide-text"><strong>Lumi <span>{t('· 魔法嚮導','· your magic guide')}</span></strong>
    <small role="status">{voiceState==='speaking'?t('Lumi 正在說話','Lumi is speaking'):
     voiceState==='listening'?t('正在聆聽你的願望','Listening to your wish'):
     voiceState==='connecting'?t('正在連線…','Connecting…'):
     voiceState==='error'?t('暫時離線','Connection lost'):t('等你一起創造世界','Ready to make magic')}</small>
   </div>
  </div>
  <p className="magic-guide-lead">{t('「今天想讓這座島發生什麼奇蹟？」','“What wonderful thing should happen to our island?”')}</p>
  <div className="magic-voice-actions">
   {isOnline||voiceState==='connecting'?<button type="button" className="magic-primary magic-end" onClick={onStop}>{t('結束對話','End conversation')}</button>:
    <button type="button" className="magic-primary" disabled={starting} onClick={onStart}>
     <span aria-hidden="true">◉</span> {starting?t('連線中…','Connecting…'):t('開啟語音魔法','Start voice magic')}
    </button>}
   {isOnline&&<button type="button" className="magic-secondary" onClick={onToggleMic} aria-pressed={muted}>
    {muted?t('開啟麥克風','Unmute'):t('麥克風靜音','Mute')}</button>}
  </div>
  {isOnline&&<label className="magic-volume">{t('Lumi 音量','Lumi volume')} <input aria-label={t('調整 Lumi 音量','Lumi volume')} type="range" min="0" max="150" step="5"
   value={volume} onChange={e=>onVolume(Number(e.target.value))}/><output>{volume}%</output></label>}
  {!hasKey&&<Link className="magic-settings" to="/settings">{t('設定語音連線','Set up voice connection')} →</Link>}
  {!toolsAvailable&&<p className="magic-muted">{t('語音可以繼續；畫面互動仍可透過下方魔法使用。','Voice can continue; use the spells below to change the scene.')}</p>}
  {notice&&<p className="magic-notice" role="status">{notice}</p>}
  {isOnline&&(heard||said)&&<div className="magic-transcripts">
   {heard&&<p><b>{t('你','You')}:</b> {heard}</p>}
   {said&&<p><b>Lumi:</b> {said}</p>}
  </div>}
 </section>;
}
