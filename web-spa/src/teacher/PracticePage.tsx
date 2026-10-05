import{Link}from"react-router-dom";import{Icon}from"../components/Icon";import{history}from"../lib/runtime";import{PracticeContinueCard,PracticeTutorStrip}from"./PracticeContinueCard";
export function PracticePage(){const h=history("teacher"),v=Number(localStorage.getItem("crew_vocab_today")||0);return <>
<section className="hero"><span className="kicker">Crew Teacher</span><h1>今天想學點什麼？</h1><p>Crew Teacher 幫你把下一步準備好。</p></section>
<section className="section"><PracticeTutorStrip/><PracticeContinueCard/></section>
<section className="section"><div className="section-head"><h2>和老師練習</h2><small>選一種方式</small></div><div className="grid two-col">
<Link className="feature-card" to="/teacher/live"><span className="feature-icon"><Icon name="chat"/></span><strong>跟老師聊</strong><span>直接開口，老師主動接話</span></Link>
<Link className="feature-card teacher-material" to="/teacher/textbook"><span className="feature-icon"><Icon name="book"/></span><strong>教材陪讀</strong><span>拍教材，老師逐頁帶你讀</span></Link>
<Link className="feature-card teacher-vocab" to="/teacher/vocabulary"><span className="feature-icon"><Icon name="cards"/></span><strong>單字練習</strong><span>自動難度、發音與間隔複習</span></Link>
<Link className="feature-card teacher-scene" to="/teacher/course"><span className="feature-icon"><Icon name="scene"/></span><strong>情境課程</strong><span>旅遊、工作與真實任務</span></Link>
</div></section>
<section className="section"><div className="section-head"><h2>今天</h2><small>學習紀錄</small></div><div className="notice"><div><b>{h.length||v?"今天已經開始學習":"還沒有練習紀錄"}</b><p>{h.length||v?[h.length?h.length+" 次口說練習":"",v?v+" 題單字":""].filter(Boolean).join(" · "):"完成一次學習後會顯示在這裡。"}</p></div></div></section>
</>}
