import { Icon } from "../components/Icon";

const items = [
  { href: "/teacher-textbook.html", icon: "book" as const, title: "教材陪讀", note: "1–4 張教材或照片，AI 備課後逐頁陪讀" },
  { href: "/teacher-vocabulary.html", icon: "cards" as const, title: "單字練習", note: "快速作答，難度會依表現即時調整" },
  { href: "/teacher-course.html", icon: "scene" as const, title: "情境課程", note: "用有目標的任務練真實會話" },
  { href: "/teacher-pronunciation.html", icon: "mic" as const, title: "朗讀糾音", note: "選文章、開口朗讀、抓重點糾音、再練一次" }
];

export function LearnPage() {
  return (
    <>
      <section className="hero"><span className="kicker">Learn</span><h1>學習</h1><p>教材、單字與課程都集中在這裡。</p></section>
      <section className="section">
        <div className="list">
          {items.map((item) => (
            <a className="list-item" href={item.href} key={item.href}>
              <span className="list-icon"><Icon name={item.icon} /></span>
              <span className="list-copy"><strong>{item.title}</strong><small>{item.note}</small></span>
              <span className="chevron">›</span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
