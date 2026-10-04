import { teacherHistory, vocabularyLevel } from "../lib/legacy";

export function MyPage() {
  const history = teacherHistory();
  const reports = history.filter((item) => item.report);
  const vocabToday = Number(localStorage.getItem("crew_vocab_today") || 0);

  return (
    <>
      <section className="hero"><span className="kicker">My learning</span><h1>我的</h1><p>學習進度、練習報告與個人設定。</p></section>
      <section className="section panel">
        <div className="section-head"><h2>你的學習狀態</h2><small>這台裝置</small></div>
        <div className="teacher-stats">
          <div><strong>{history.length}</strong><span>口說練習</span></div>
          <div><strong>{vocabularyLevel()}</strong><span>目前程度</span></div>
          <div><strong>{vocabToday}</strong><span>今日單字</span></div>
        </div>
      </section>
      <section className="section">
        <div className="section-head"><h2>練習報告</h2><small>{reports.length} 份</small></div>
        <div className="list">
          {reports.length ? reports.slice(0, 5).map((item) => {
            const report = item.report as { summary?: string; overall_score?: number };
            return <div className="list-item" key={item.ts}><span className="list-icon">R</span><span className="list-copy"><strong>{item.title}</strong><small>{report?.summary || item.preview}</small></span><span className="pill">{report?.overall_score ?? "--"}</span></div>;
          }) : <div className="notice"><div><b>還沒有課後報告</b><p>口說練習達到時間與內容門檻後才會產生。</p></div></div>}
        </div>
      </section>
      <section className="section">
        <a className="list-item" href="/settings.html"><span className="list-icon">⚙</span><span className="list-copy"><strong>Crew 設定</strong><small>Gemini API key、音量與進階設定</small></span><span className="chevron">›</span></a>
      </section>
    </>
  );
}
