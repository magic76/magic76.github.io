import {useCallback, useEffect, useRef, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {geminiKey} from "../lib/runtime";
import {
  connectGuestLive, guestManualPreviewAvailable, configureGuestManualPreview,
  guestTrialConfigured, guestTrialMissingSetup, guestSessionsRemaining, recordGuestSession,
  GUEST_SESSION_SECONDS, startPreparedGuestAudio, type GuestAudioController, type GuestLiveSession,
} from "../lib/firebaseGuest";

/**
 * Deliberately separate from the canonical BYOK Live runtime:
 * Firebase Web managed audio is preview-only and does not yet provide Crew's
 * deterministic button-only interruption, transcripts, reports or memory flow.
 */
export function FirebaseGuestLivePage() {
  const [params] = useSearchParams();
  const [role, setRole] = useState<"teacher"|"friend">(params.get("mode") === "friend" ? "friend" : "teacher");
  const [status, setStatus] = useState("按下開始後即可直接用語音對話。");
  const [phase, setPhase] = useState<"idle"|"connecting"|"ready"|"starting"|"connected"|"ending">("idle");
  const [remaining, setRemaining] = useState(() => guestSessionsRemaining());
  const [seconds, setSeconds] = useState(GUEST_SESSION_SECONDS);
  const [manualApiKey, setManualApiKey] = useState("");
  const [manualAppId, setManualAppId] = useState("");
  const [manualProjectId, setManualProjectId] = useState("crew-e13f9");
  const [manualStatus, setManualStatus] = useState("");
  const [manualActivated, setManualActivated] = useState(false);
  const sessionRef = useRef<GuestLiveSession|null>(null);
  const audioRef = useRef<GuestAudioController|null>(null);
  const timerRef = useRef<number|null>(null);
  const busyRef = useRef(false);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);

  const cleanup = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const audio = audioRef.current;
    const session = sessionRef.current;
    audioRef.current = null;
    sessionRef.current = null;
    try { await audio?.stop(); } catch { /* The SDK may already have closed. */ }
    try { await session?.close(); } catch { /* The SDK may already have closed. */ }
  }, []);

  const stop = useCallback(async () => {
    cancelledRef.current = true;
    if (mountedRef.current) {setPhase("ending"); setStatus("正在結束語音對話…");}
    await cleanup();
    busyRef.current = false;
    if (mountedRef.current) {setPhase("idle"); setStatus("體驗已結束。");}
  }, [cleanup]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {mountedRef.current = false; cancelledRef.current = true; void cleanup();};
  }, [cleanup]);

  // Two gestures are deliberate: the Firebase Web SDK explicitly requires
  // startAudioConversation() to be called within a user click handler. Doing
  // async SDK loading and WebSocket connect first can lose browser activation.
  const prepare = useCallback(async () => {
    if (busyRef.current || !guestTrialConfigured() || sessionRef.current) return;
    if (guestSessionsRemaining() <= 0) {
      setRemaining(0);
      setStatus("今天的體驗次數已用完，明天再來，或使用自己的 Gemini Key。");
      return;
    }
    busyRef.current = true;
    cancelledRef.current = false;
    setPhase("connecting");
    setStatus("正在安全連線 Firebase AI Logic…");
    setSeconds(GUEST_SESSION_SECONDS);
    const system = role === "friend"
      ? "You are Zoe, the user's friendly, natural conversational companion. Speak primarily in the user's language (Traditional Chinese by default), follow their topic, and do not act like a teacher or constantly ask questions. This is a brief voice demonstration."
      : "You are a friendly Crew language teacher. Speak Traditional Chinese to guide the learner, introduce one practical English sentence, then invite them to say it. Stay concise and encouraging. This is a brief voice demonstration.";
    try {
      const {session} = await connectGuestLive(system);
      if (cancelledRef.current) {await session.close(); return;}
      sessionRef.current = session;
      setPhase("ready");
      setStatus("已準備好。再按「啟動麥克風」開始說話。");
    } catch (error) {
      await cleanup();
      if (mountedRef.current && !cancelledRef.current) {
        setPhase("idle");
        setStatus("Firebase 試用無法連線：" + (error instanceof Error ? error.message : String(error)));
      }
    } finally {
      busyRef.current = false;
    }
  }, [cleanup, role]);

  const activateAudio = useCallback(() => {
    const session = sessionRef.current;
    if (busyRef.current || !session || cancelledRef.current) return;
    busyRef.current = true;
    setPhase("starting");
    setStatus("正在取得麥克風權限…");
    // Important: Call the SDK microphone helper synchronously from onClick,
    // BEFORE the first await or another task queue turn.
    const audioPromise = startPreparedGuestAudio(session);
    void audioPromise.then(async audio => {
      if (cancelledRef.current) {await audio.stop(); await cleanup(); return;}
      audioRef.current = audio;
      if (!recordGuestSession()) {
        await cleanup();
        if (mountedRef.current) {setRemaining(0); setPhase("idle"); setStatus("本日試用額度已用完。");}
        return;
      }
      if (!mountedRef.current) {await cleanup(); return;}
      setRemaining(guestSessionsRemaining());
      setPhase("connected");
      setStatus("語音已連線，可以開始說話。");
      const until = Date.now() + GUEST_SESSION_SECONDS * 1000;
      timerRef.current = window.setInterval(() => {
        const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        if (mountedRef.current) setSeconds(left);
        if (left <= 0) void stop();
      }, 300);
      void session.send(
        role === "friend"
          ? "Start naturally as Zoe with one friendly, brief observation. No interview."
          : "Start a short, natural language practice now. No generic intro.",
        true
      ).catch(() => {if (mountedRef.current) setStatus("已連線；你可以先開口說話。");});
    }).catch(async error => {
      await cleanup();
      if (mountedRef.current && !cancelledRef.current) {
        setPhase("idle");
        setStatus("無法啟動麥克風：" + (error instanceof Error ? error.message : String(error)));
      }
    }).finally(() => { busyRef.current = false; });
  }, [cleanup, role, stop]);

  const available = guestTrialConfigured();
  const active = phase !== "idle";
  const manualPreview = guestManualPreviewAvailable();
  const activateManualPreview = () => {
    if (active) return;
    try {
      configureGuestManualPreview({
        apiKey: manualApiKey, appId: manualAppId, projectId: manualProjectId
      });
      setManualActivated(true);
      setManualStatus("已啟用此分頁的臨時 Firebase Web 設定。請按「準備連線」測試；若 App Check 尚未註冊 Debug Token，第一次連線可能失敗。");
      setStatus("已準備使用手動 Firebase 設定。");
    } catch (error) {
      setManualStatus(error instanceof Error ? error.message : String(error));
    }
  };
  return <main className="shell" style={{maxWidth:820,padding:"32px 16px 100px"}}>
    <div className="actions"><Link className="btn secondary small" to="/teacher">← 返回 Crew Teacher</Link></div>
    <section className="hero">
      <span className="kicker">CREW · FIREBASE PILOT</span>
      <h1>免費語音體驗</h1>
      <p>不用申請 Gemini Key，就能試著和 Crew 老師或 Zoe 聊天。</p>
    </section>
    {manualPreview && <section className="section panel" style={{display:"grid",gap:12}} aria-label="Firebase Preview 手動設定">
      <h2 style={{margin:0}}>Preview 手動連線測試</h2>
      <p className="meta">Cloudflare 環境變數尚未讀到時，可先手動輸入 Firebase Web 的公開設定來測試流程。僅限分支 Preview，不會寫入瀏覽器儲存空間，也不會影響正式網站。重新整理就會清除。</p>
      <p className="meta">請確認這個 Preview 已由 Cloudflare Access 限制只有你能進入。<strong>不要輸入私人 Gemini API Key、服務帳戶私鑰或 Debug Token。</strong></p>
      <label className="label" htmlFor="firebase-preview-api-key">Firebase Web apiKey</label>
      <input className="field" id="firebase-preview-api-key" value={manualApiKey} onChange={event => {setManualApiKey(event.target.value); setManualStatus("");}} placeholder="AIza..." autoComplete="off" spellCheck={false} disabled={active || manualActivated} />
      <label className="label" htmlFor="firebase-preview-app-id">Firebase Web appId</label>
      <input className="field" id="firebase-preview-app-id" value={manualAppId} onChange={event => {setManualAppId(event.target.value); setManualStatus("");}} placeholder="1:123456789:web:abcdef" autoComplete="off" spellCheck={false} disabled={active || manualActivated} />
      <label className="label" htmlFor="firebase-preview-project-id">Firebase projectId</label>
      <input className="field" id="firebase-preview-project-id" value={manualProjectId} onChange={event => {setManualProjectId(event.target.value); setManualStatus("");}} placeholder="crew-e13f9" autoComplete="off" spellCheck={false} disabled={active || manualActivated} />
      <div className="actions">
        <button className="btn" onClick={activateManualPreview} disabled={active || manualActivated}>使用這組設定測試</button>
        {manualActivated && <button className="btn secondary" onClick={() => window.location.reload()} disabled={active}>清除並重新輸入</button>}
      </div>
      {manualStatus && <p role="status" className="meta">{manualStatus}</p>}
      <p className="meta">Firebase AI Logic 的 App Check 仍需要有效權杖：按「準備連線」後，從開發者工具 Console 複製本機產生的 Debug Token，至 Firebase App Check 管理頁註冊，再重新測試。請勿分享 Token。</p>
    </section>}
    <section className="section panel" style={{display:"grid",gap:16}}>
      {!available
        ? <div role="status" style={{display:"grid",gap:8}}>
            <p>Firebase 試用目前尚未啟用，以下是此部署未通過的檢查：</p>
            <ul style={{paddingLeft:22,margin:0}}>{guestTrialMissingSetup().map(item => <li key={item}>{item}</li>)}</ul>
            <p className="meta">Cloudflare Pages 的 Preview 環境變數需重新部署才會生效；請使用 PR #125 對應的分支 Preview 網址。設定值不會顯示在此頁面。</p>
          </div>
        : <>
          <div className="actions">
            <button className={"btn " + (role === "teacher" ? "" : "secondary")} disabled={active} onClick={() => setRole("teacher")}>Crew 老師</button>
            <button className={"btn " + (role === "friend" ? "" : "secondary")} disabled={active} onClick={() => setRole("friend")}>Crew 朋友 · Zoe</button>
          </div>
          <p>今天剩餘 <strong>{remaining}</strong> / 3 次 · 每次最多 3 分鐘</p>
          <p role="status" aria-live="polite">{status}</p>
          {phase === "connected" && <p style={{fontSize:28,fontWeight:700}} aria-label="剩餘時間">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</p>}
          <div className="actions">
            {phase === "idle" && <button className="btn" disabled={remaining === 0} onClick={() => void prepare()}>準備連線</button>}
            {phase === "ready" && <button className="btn" onClick={activateAudio}>啟動麥克風</button>}
            {active && <button className="btn secondary" onClick={() => void stop()} disabled={phase === "ending"}>{phase === "connected" ? "結束體驗" : "取消連線"}</button>}
          </div>
        </>}
      <p className="meta">目前是獨立的 Firebase 語音預覽：不儲存對話記憶、不產生課後報告，也不支援完整的手動打斷、教材相機與 Agent 功能。試用次數是裝置端提醒，不是防刷或費用上限。</p>
      <p className="meta">{geminiKey() ? "你已設定自己的 Gemini Key，原本的完整對話仍可照常使用。" : "想使用完整的 Crew Teacher／Crew Friends？可免費申請自己的 Gemini API Key。"}</p>
      <div className="actions"><Link className="btn secondary" to="/settings">設定自己的 Gemini Key</Link></div>
    </section>
  </main>;
}
