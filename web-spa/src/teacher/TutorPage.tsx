import{useState}from"react";import{Link}from"react-router-dom";
import{useTeacherStore}from"../store/teacherStore";
import{NATIVE_LANGUAGES,teacherText}from"./teacherLocale";import{getTeacherProfile}from"./teacherProfiles";
import{TeacherProfilePicker}from"./TeacherProfilePicker";import{TeacherAvatar}from"./TeacherAvatar";


export function TutorPage(){
 const s=useTeacherStore(),[picker,setPicker]=useState(false),profile=getTeacherProfile(s.teacherProfile);
 return <><section className="hero"><span className="kicker">老師</span><h1>老師</h1><p>直接開始說，需要時再調整老師帶你的方式。</p></section>
 <section className="section"><div className="person-card card">
  <button className="teacher-avatar-button" onClick={()=>setPicker(true)} aria-label="更換老師"><span className="avatar"><TeacherAvatar profile={profile}/></span></button>
  <h2>{profile.name} 老師準備好了</h2><p>{profile.description}<br/>直接開口就好，老師會主動帶話題，你卡住時再接住你。</p>
  <div className="actions"><button className="btn secondary" onClick={()=>setPicker(true)}>更換老師</button><Link className="primary-wide" to="/teacher/live">開始聊天</Link></div>
 </div></section>
 <section className="section"><div className="section-head"><h2>快捷設定</h2><small>立即生效</small></div><div className="settings-grid">
 <button className="panel teacher-current-row" onClick={()=>setPicker(true)}><span className="teacher-current-avatar"><TeacherAvatar profile={profile} decorative/></span><span><span className="label">目前老師</span><strong>{profile.name} · {profile.title}</strong><small>點擊切換</small></span></button>
 <label className="panel"><span className="label">{teacherText(s.nativeLanguage,"nativeLanguage")}</span><select className="field" value={s.nativeLanguage} onChange={e=>s.setNativeLanguage(e.target.value as typeof s.nativeLanguage)}>{NATIVE_LANGUAGES.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><small className="meta">{teacherText(s.nativeLanguage,"languageHelp")}</small></label>
 <label className="panel"><span className="label">{teacherText(s.nativeLanguage,"targetLanguage")}</span><select className="field" value={s.targetLanguage} onChange={e=>s.setTargetLanguage(e.target.value)}><option>英文</option><option>日文</option><option>韓文</option><option>西班牙文</option><option>法文</option></select></label>
 <label className="panel"><span className="label">聊天模式</span><select className="field" value={s.conversationMode} onChange={e=>s.setConversationMode(e.target.value as typeof s.conversationMode)}><option value="natural">自然聊天</option><option value="scenario">情境聊天</option><option value="practice">練習聊天</option></select></label>
 <label className="panel"><span className="label">練習方式</span><select className="field" value={s.guidance} onChange={e=>s.setGuidance(e.target.value as typeof s.guidance)}><option value="light">輕度引導</option><option value="normal">適時修正</option><option value="strict">積極糾正</option></select></label>
 <div className="panel"><span className="label">老師聲音</span><strong>{profile.voiceLabel}</strong><p className="meta">切換老師時會自動套用適合這個角色的聲音。</p></div>
 <label className="panel"><span className="label">老師語言風格</span><select className="field" value={s.languageStyle} disabled={s.targetLanguage!=="英文"} onChange={e=>s.setLanguageStyle(e.target.value as typeof s.languageStyle)}><option value="auto">自動推薦</option><option value="us">美國 · 自然</option><option value="gb">英國 · 自然</option><option value="au">澳洲 · 自然</option></select></label>
 </div></section>{picker&&<TeacherProfilePicker onClose={()=>setPicker(false)}/>}</>
}
