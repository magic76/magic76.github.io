import {useCallback, useEffect, useRef, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {geminiKey} from "../lib/runtime";
import {
  connectGuestLive, guestTrialConfigured, guestSessionsRemaining, recordGuestSession,
  GUEST_SESSION_SECONDS, type GuestAudioController, type GuestLiveSession,
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
  const [phase, setPhase] = useState<"idle"|"connecting"|"connected"|"ending">("idle");
  const [remaining, setRemaining] = useState(() => guestSessionsRemaining());
  const [seconds, setSeconds] = useState(GUEST_SESSION_SECONDS);
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

  const start = useCallback(async () => {
    if (busyRef.current || !guestTrialConfigured()) return;
    if (guestSessionsRemaining() <= 0) {
      setRemaining(0); setStatus("今天的體驗次數已用完，明天再來，或使用自己的 Gemini Key。"); return;
    }
    busyRef.current = true;
    cancelledRef.current = false;
    setPhase("connecting"); setStatus("正在安全連線 Firebase AI Logic…");
    setSeconds(GUEST_SESSION_SECONDS);
    const system = role === "friend"
      ? "You are Zoe, the user's friendly, natural conversational companion. Speak primarily in the user's language (Traditional Chinese by default), follow their topic, and do not act like a teacher or constantly ask questions. This is a brief voice demonstration."
      : "You are a friendly Crew language teacher. Speak Traditional Chinese to guide the learner, introduce one practical English sentence, then invite them to say it. Stay concise and encouraging. This is a brief voice demonstration.";
    try {
      const {session, startAudio} = await connectGuestLive(system);
      if (cancelledRef.current) {await session.close(); return;}
      sessionRef.current = session;
      // Firebase's audio helper owns capture/playback in this preview path.
      // Do not silently substitute Crew's full BYOK audio controls.
      const audio = await startAudio();
      if (cancelledRef.current) {await audio.stop(); await cleanup(); return;}
      audioRef.current = audio;
      if (!recordGuestSession()) {
        await cleanup();
        setStatus("本日試用額度已用完。");
        setPhase("idle");
        return;
      }
      setRemaining(guestSessionsRemaining());
      setPhase("connected");
      setStatus("語音已連線，可以開始說話。");
      const until = Date.now() + GUEST_SESSION_SECONDS * 1000;
      timerRef.current = window.setInterval(() => {
        const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        if (mountedRef.current) setSeconds(left);
        if (left <= 0) {void stop();}
      }, 300);
      void session.send(
        role === "friend"
          ? "Start naturally as Zoe with one friendly, brief observation. No interview."
          : "Start a short, natural language practice now. No generic intro.",
        true
      ).catch(() => {if (mountedRef.current) setStatus("已連線；你可以先開口說話。");});
    } catch (error) {
      await cleanup();
      if (mountedRef.current && !cancelledRef.current) {
        setPhase("idle");
        setStatus("Firebase 試用無法啟動：" + (error instanceof Error ? error.message : String(error)));
      }
    } finally {
      if (!audioRef.current) {
        busyRef.current = false;
        if (mountedRef.current) setPhase("idle");
      }
    }
  }, [cleanup, role, stop]);

  const available = guestTrialConfigured();
  const active = phase === "connected" || phase === "connecting";
  return <main className="shell" style={{maxWidth:820,padding:"32px 16px 100px"}}>
    <div className="actions"><Link className="btn secondary small" to="/teacher">← 返回 Crew Teacher</Link></div>
    <section className="hero">
      <span className="kicker">CREW · FIREBASE PILOT</span>
      <h1>免費語音體驗</h1>
      <p>不用申請 Gemini Key，就能試著和 Crew 老師或 Zoe 聊天。</p>
    </section>
    <section className="section panel" style={{display:"grid",gap:16}}>
      {!available
        ? <p role="status">網站尚未啟用 Firebase 試用。請先完成 Firebase AI Logic、App Check 與 Cloudflare 環境設定。</p>
        : <>
          <div className="actions">
            <button className={"btn " + (role === "teacher" ? "" : "secondary")} disabled={active} onClick={() => setRole("teacher")}>Crew 老師</button>
            <button className={"btn " + (role === "friend" ? "" : "secondary")} disabled={active} onClick={() => setRole("friend")}>Crew 朋友 · Zoe</button>
          </div>
          <p>今天剩餘 <strong>{remaining}</strong> / 3 次 · 每次最多 3 分鐘</p>
          <p role="status" aria-live="polite">{status}</p>
          {phase === "connected" && <p style={{fontSize:28,fontWeight:700}} aria-label="剩餘時間">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</p>}
          <div className="actions">
            {!active
              ? <button className="btn" disabled={remaining === 0 || phase === "ending"} onClick={() => void start()}>開始語音體驗</button>
              : <button className="btn secondary" onClick={() => void stop()}>{phase === "connecting" ? "取消連線" : "結束體驗"}</button>}
          </div>
        </>}
      <p className="meta">目前是獨立的 Firebase 語音預覽：不儲存對話記憶、不產生課後報告，也不支援完整的手動打斷、教材相機與 Agent 功能。試用次數是裝置端提醒，不是防刷或費用上限。</p>
      <p className="meta">{geminiKey() ? "你已設定自己的 Gemini Key，原本的完整對話仍可照常使用。" : "想使用完整的 Crew Teacher／Crew Friends？可免費申請自己的 Gemini API Key。"}</p>
      <div className="actions"><Link className="btn secondary" to="/settings">設定自己的 Gemini Key</Link></div>
    </section>
  </main>;
}
