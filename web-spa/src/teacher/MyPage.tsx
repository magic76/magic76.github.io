import{Link}from"react-router-dom";
import{PlayStoreLink}from"../components/PlayStoreLink";
import{history}from"../lib/runtime";
import{completedLessons,totalStars}from"./courseProgress";
import{PhrasebookPanel}from"./PhrasebookPanel";
import{phrasebookItems}from"./phrasebook";
import{SessionReports}from"./SessionReports";
import{vocabularySummary}from"./learningCoordinator";
import{todayVocabulary}from"./vocabularyProgress";

export function MyPage(){
 const h=history("teacher"),v=vocabularySummary(),saved=phrasebookItems().length,courses=completedLessons();
 return <><section className="hero"><span className="kicker">My learning</span><h1>我的</h1><p>學習進度、收藏片語與課後報告。</p></section>
 <section className="section panel"><div className="teacher-stats"><div><strong>{h.length}</strong><span>口說練習</span></div><div><strong>{v.level}</strong><span>目前單字程度</span></div><div><strong>{todayVocabulary()}</strong><span>今日單字</span></div></div><div className="teacher-stats teacher-stats-secondary"><div><strong>{courses}</strong><span>完成課程</span></div><div><strong>★ {totalStars()}</strong><span>課程星星</span></div><div><strong>{saved}</strong><span>收藏片語</span></div></div></section>
 <section className="section"><div className="section-head"><h2>紀錄與設定</h2><small>與 App 同步</small></div><div className="teacher-library-list"><PhrasebookPanel/><details className="teacher-library-panel" open><summary><span><strong>練習報告</strong><small>{h.filter((x:any)=>x.report).length} 份課後報告</small></span><b>›</b></summary><SessionReports/></details><Link className="teacher-library-link" to="/settings"><span><strong>App 設定</strong><small>語言、音訊、API Key 與進階選項</small></span><b>›</b></Link></div></section>
 <section className="section panel"><div className="section-head"><h2>Android App</h2><small>Google Play</small></div><p className="meta">想在手機上使用完整的 Crew Teacher，可以直接安裝 Android App。</p><PlayStoreLink product="teacher" compact/></section>
 </>;
}
