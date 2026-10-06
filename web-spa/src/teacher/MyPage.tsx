import{Link}from"react-router-dom";
import{PlayStoreLink}from"../components/PlayStoreLink";
import{history}from"../lib/runtime";
import{completedLessons,totalStars}from"./courseProgress";
import{dueDeckItems,learningDeck}from"./learningDeck";
import{vocabularySummary}from"./learningCoordinator";
import{todayVocabulary}from"./vocabularyProgress";

export function MyPage(){
 const h=history("teacher"),reports=h.filter((x:any)=>x.report),deck=learningDeck(),due=dueDeckItems().length,v=vocabularySummary(),courses=completedLessons();
 return <><section className="hero"><span className="kicker">學習紀錄</span><h1>我的</h1><p>學習進度、收藏與個人設定。</p></section>
 <section className="section panel"><div className="teacher-stats"><div><strong>{h.length}</strong><span>口說練習</span></div><div><strong>{v.level}</strong><span>目前程度</span></div><div><strong>{todayVocabulary()}</strong><span>今日單字</span></div></div><div className="teacher-stats teacher-stats-secondary"><div><strong>{courses}</strong><span>完成課程</span></div><div><strong>★ {totalStars()}</strong><span>課程星星</span></div><div><strong>{deck.length}</strong><span>收藏片語</span></div></div></section>
 <section className="section"><div className="section-head"><h2>紀錄與設定</h2><small>與 App 同步</small></div><div className="list"><Link className="list-item" to="/teacher/phrasebook"><span className="list-icon">★</span><span className="list-copy"><strong>收藏片語</strong><small>{deck.length} 張學習卡 · {due} 張待複習</small></span><span className="chevron">›</span></Link><Link className="list-item" to="/teacher/reports"><span className="list-icon">R</span><span className="list-copy"><strong>練習報告</strong><small>{reports.length} 份課後學習報告</small></span><span className="chevron">›</span></Link><Link className="list-item" to="/teacher/reading-library"><span className="list-icon">▤</span><span className="list-copy"><strong>閱讀素材庫</strong><small>經典短文與朗讀素材</small></span><span className="chevron">›</span></Link></div></section>
 <section className="section panel"><div className="section-head"><h2>Android 版</h2><small>Google Play</small></div><p className="meta">想在手機上使用完整的 Crew Teacher，可以直接安裝 Android App。</p><PlayStoreLink product="teacher" compact/></section>
 </>;
}
