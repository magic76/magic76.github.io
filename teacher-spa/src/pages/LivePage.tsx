import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import avatarUrl from "../../../assets/teacher/teacher-emma.webp";
import { readLastTeacherSession, vocabularyLevel } from "../lib/legacy";
import { useTeacherStore } from "../store/teacherStore";
import { useLiveSession } from "../live/useLiveSession";

const missions: Record<string, { title: string; scene: string; goals: string[] }> = {
  hotel_checkin: { title: "飯店入住", scene: "飯店", goals: ["說出訂房姓名", "確認早餐時間", "詢問退房時間"] },
  restaurant_order: { title: "餐廳點餐", scene: "餐廳", goals: ["詢問推薦菜色", "說明飲食限制", "請服務生結帳"] },
  work_meeting: { title: "工作會議", scene: "工作", goals: ["表達一個風險", "提出替代方案", "確認 action item"] },
  transport: { title: "問路與交通", scene: "旅遊", goals: ["問目的地方向", "確認月台", "確認這班車是否正確"] }
};

function duration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

function styleInstruction(style: string, language: string) {
  if (language !== "英文" || style === "auto") return "";
  const label = style === "gb" ? "英國" : style === "au" ? "澳洲" : "美國";
  return "英文使用自然的" + label + "當代日常口音與常見措辭；不要誇張或刻板化。";
}

export function LivePage() {
  const [params] = useSearchParams();
  const store = useTeacherStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const mission = missions[params.get("mission") || ""] || null;
  const requestedScene = params.get("scene") || mission?.scene || "";
  const resume = params.get("resume") === "1";
  const previous = resume ? readLastTeacherSession() : null;

  useEffect(() => {
    document.body.classList.add("session-page");
    return () => document.body.classList.remove("session-page");
  }, []);

  const system = useMemo(() => {
    const guidance = store.guidance === "light"
      ? "優先保持對話流暢，只修正會造成誤解的錯誤。"
      : store.guidance === "strict"
        ? "文法、用字與不自然表達都要短暫指出，給自然說法後讓學生重說一次。"
        : "明顯錯誤時用簡短 recast 修正，不要把對話變成長篇講課。";
    const mode = mission
      ? "你正在帶一個結構化情境任務。扮演情境中的真人角色，不先給答案。逐步讓學生完成：" + mission.goals.join("、") + "。"
      : store.conversationMode === "scenario"
        ? "使用情境角色扮演方式聊天，像真人互動。"
        : store.conversationMode === "practice"
          ? "偏向口說教練模式，比自然聊天多一點具體修正與重說。"
          : "使用自然聊天模式，像真人老師陪學生聊，不要每回合都糾正。";
    return "你是 Crew Teacher 的真人感 Live 語言老師 Emma。" +
      "目標語言：" + store.targetLanguage + "。學生目前推估程度：" + vocabularyLevel() + "。" +
      (requestedScene ? "目前情境：" + requestedScene + "。" : "") +
      mode + guidance + styleInstruction(store.languageStyle, store.targetLanguage) +
      "以目標語言為主，學生明顯卡住時才用繁體中文短解釋。一次 1-3 句，每回合留一個可直接回答的短問題。";
  }, [mission, requestedScene, store.conversationMode, store.guidance, store.languageStyle, store.targetLanguage]);

  const openingPrompt = useMemo(() => {
    if (previous?.turns?.length) {
      const context = previous.turns
        .slice(-4)
        .map((turn) => [turn.input ? "學生：" + turn.input : "", turn.output ? "老師：" + turn.output : ""].filter(Boolean).join("\n"))
        .join("\n");
      return "以下是上次練習最後幾輪，請自然接著聊，不要重新自我介紹：\n" + context;
    }
    if (mission) return "直接進入「" + mission.title + "」角色扮演。你先以情境中的真人角色開口，不要解釋課程規則。";
    return "現在開始一對一 Live 練習。請依目前聊天模式先自然開口，問我第一個簡短問題。";
  }, [mission, previous]);

  const live = useLiveSession({
    system,
    openingPrompt,
    voice: store.voice,
    title: (mission?.title || requestedScene || "口說練習") + " · " + store.targetLanguage,
    language: store.targetLanguage
  });

  const active = ["requesting-mic", "connecting", "ready", "listening", "speaking", "ending", "reporting"].includes(live.state);

  return (
    <>
      <header className="app-header">
        <div className="shell inner">
          <div className="app-brand">
            <Link className="back-btn" to="/practice" aria-label="回 Crew Teacher">‹</Link>
            <div className="app-title"><strong>Emma</strong><small>Crew Teacher</small></div>
          </div>
          <span className="status connected"><i className="status-dot" /><span>{live.state === "speaking" ? "老師說話中" : live.state === "listening" ? "正在聽你說" : "Live"}</span></span>
        </div>
      </header>

      <main className="session-shell">
        <section className="session-person">
          <div className="avatar"><img src={avatarUrl} alt="Emma" /></div>
          <h1>{mission?.title || "Emma 老師"}</h1>
          <p>{mission ? "完成任務即可，不需要把整段對話背起來。" : "直接說就好，Emma 會先開口。"}</p>
        </section>

        {mission && <div className="notice"><div><b>情境任務</b><p>{mission.goals.join(" · ")}</p></div><span className="pill">任務模式</span></div>}

        <section className="live-stage" data-state={live.state}>
          <h2 className="live-title">{mission ? mission.title : "1 對 1 語言練習"}</h2>
          <p className="live-sub">畫面跟著 Live state 變化；底層仍沿用已驗證的 Crew Live runtime。</p>
          <div className="live-orb"><span>E</span></div>
          <div className="live-status">{live.status}</div>

          <div className="live-controls">
            {!active && <button className="live-btn" onClick={() => void live.start()}>開始聊天</button>}
            {active && <button className="live-btn end" onClick={() => void live.stop()} disabled={live.state === "ending" || live.state === "reporting"}>{live.state === "reporting" ? "整理報告中…" : "結束"}</button>}
          </div>

          <div className="live-callbar">
            <div className="live-timer">{duration(live.durationMs)}</div>
            <div className="live-call-actions">
              <button className={"live-tool-btn " + (live.muted ? "active" : "")} onClick={live.toggleMute} disabled={!active}>{live.muted ? "開啟麥克風" : "麥克風靜音"}</button>
              <button className="live-tool-btn" onClick={() => live.interrupt()} disabled={!active}>打斷老師</button>
            </div>
            <label className="live-volume">音量 <input type="range" min="0" max="100" value={live.volume} onChange={(e) => live.setVolume(Number(e.target.value))} /><span>{live.volume}%</span></label>
          </div>

          <div className="live-presets">
            <button onClick={() => live.sendText("換一個更生活化的話題，直接問我一個短問題。")}>換話題</button>
            <button onClick={() => live.sendText("請糾正我剛剛最明顯的一個錯誤，給我自然說法後讓我重說一次。")}>糾正我</button>
            <button onClick={() => live.sendText("現在進入角色扮演，請扮演情境裡的真人角色。")}>角色扮演</button>
            <button onClick={() => live.sendText("請把接下來的語速稍微放慢，但保持自然發音。")}>說慢一點</button>
          </div>

          <details className="live-settings">
            <summary>快捷設定</summary>
            <div className="live-setup-grid">
              <label><span className="label">目標語言</span><select className="field" value={store.targetLanguage} onChange={(e) => store.setTargetLanguage(e.target.value)}><option>英文</option><option>日文</option><option>韓文</option><option>西班牙文</option><option>法文</option></select></label>
              <label><span className="label">聊天模式</span><select className="field" value={store.conversationMode} onChange={(e) => store.setConversationMode(e.target.value as typeof store.conversationMode)}><option value="natural">自然聊天</option><option value="scenario">情境聊天</option><option value="practice">練習聊天</option></select></label>
              <label><span className="label">練習方式</span><select className="field" value={store.guidance} onChange={(e) => store.setGuidance(e.target.value as typeof store.guidance)}><option value="light">輕度引導</option><option value="normal">適時修正</option><option value="strict">積極糾正</option></select></label>
              <label><span className="label">老師音色</span><select className="field" value={store.voice} onChange={(e) => store.setVoice(e.target.value)}><option>Kore</option><option>Aoede</option><option>Puck</option><option>Charon</option><option>Fenrir</option></select></label>
              <label><span className="label">老師語言風格</span><select className="field" value={store.languageStyle} disabled={store.targetLanguage !== "英文"} onChange={(e) => store.setLanguageStyle(e.target.value as typeof store.languageStyle)}><option value="auto">自動推薦</option><option value="us">美國 · 自然</option><option value="gb">英國 · 自然</option><option value="au">澳洲 · 自然</option></select></label>
            </div>
          </details>

          <div className="vision-box">
            <div className="vision-head"><strong>讓 Emma 看一張圖</strong><span>教材 · 題目 · 菜單 · 路牌</span></div>
            <div className="vision-actions"><button className="vision-btn" onClick={() => fileRef.current?.click()} disabled={!active}>選圖片</button></div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void live.sendImageFile(file); e.currentTarget.value = ""; }} />
          </div>

          <div className="live-transcript">
            <div className={"live-line user " + (live.input ? "show" : "")}><small>你剛剛說</small><span>{live.input}</span></div>
            <div className={"live-line " + (live.output ? "show" : "")}><small>Emma</small><span>{live.output}</span></div>
          </div>

          <details className="live-history">
            <summary><span>完整對話</span><span>{live.turns.length} 輪</span></summary>
            <div className="live-history-list">
              {live.turns.length ? live.turns.map((turn, index) => (
                <div key={index}>
                  {turn.input && <div className="live-history-turn user"><small>你</small><div>{turn.input}</div></div>}
                  {turn.output && <div className="live-history-turn ai"><small>Emma</small><div>{turn.output}</div></div>}
                </div>
              )) : <div className="live-history-empty">完整對話會保留在這裡。</div>}
            </div>
          </details>
        </section>

        {live.report && <section className="report-card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div><span className="kicker">Session Report</span><h3 style={{ margin: "4px 0 0" }}>課後學習報告</h3></div>
            <div className="report-score">{String(live.report.overall_score ?? "--")}</div>
          </div>
          <div className="report-grid">
            <div className="report-stat"><b>{String(live.report.fluency_score ?? "--")}</b><span>流暢度</span></div>
            <div className="report-stat"><b>{String(live.report.vocab_score ?? "--")}</b><span>詞彙</span></div>
            <div className="report-stat"><b>{String(live.report.grammar_score ?? "--")}</b><span>文法</span></div>
          </div>
          <div className="report-body">{String(live.report.summary ?? "")}</div>
        </section>}
      </main>
    </>
  );
}
