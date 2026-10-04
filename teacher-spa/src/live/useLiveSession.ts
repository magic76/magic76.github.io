import { useCallback, useEffect, useRef, useState } from "react";
import { ensureLiveRuntime, ensureReportRuntime, hasGeminiKey, saveTeacherSnapshot, type LiveSession, type LiveTurn, type TeacherSnapshot } from "../lib/legacy";

export type LiveState = "idle" | "requesting-mic" | "connecting" | "ready" | "listening" | "speaking" | "ending" | "reporting" | "ended" | "error";

type Config = {
  system: string;
  openingPrompt: string;
  voice: string;
  title: string;
  language: string;
};

export function useLiveSession(config: Config) {
  const configRef = useRef(config);
  const sessionRef = useRef<LiveSession | null>(null);
  const turnsRef = useRef<LiveTurn[]>([]);
  const savedRef = useRef(false);
  const [state, setState] = useState<LiveState>("idle");
  const [status, setStatus] = useState("按開始後，Emma 會先開口。");
  const [turns, setTurns] = useState<LiveTurn[]>([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(Number(localStorage.getItem("crew_live_volume") || 100));
  const [durationMs, setDurationMs] = useState(0);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);

  useEffect(() => { configRef.current = config; }, [config]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (sessionRef.current) setDurationMs(sessionRef.current.getDurationMs());
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const captureSnapshot = useCallback((reason: string) => {
    const session = sessionRef.current;
    if (savedRef.current || !turnsRef.current.length) return null;
    savedRef.current = true;
    const text = turnsRef.current
      .map((t) => [t.input ? "你：" + t.input : "", t.output ? "Emma：" + t.output : ""].filter(Boolean).join("\n"))
      .filter(Boolean)
      .join("\n\n");
    const snapshot: TeacherSnapshot = {
      title: configRef.current.title,
      preview: text.slice(0, 180),
      turns: turnsRef.current.slice(),
      durationMs: session?.getDurationMs() || 0,
      model: session?.model || "",
      reason,
      ts: new Date().toISOString()
    };
    saveTeacherSnapshot(snapshot);
    return snapshot;
  }, []);

  const finishSession = useCallback(async (snapshot: TeacherSnapshot | null) => {
    if (!snapshot) {
      setState("ended");
      setStatus("這次練習已結束。");
      return;
    }
    try {
      await ensureReportRuntime();
      if (window.CrewTeacherReport?.eligible(snapshot)) {
        setState("reporting");
        setStatus("正在整理課後學習報告…");
        const result = await window.CrewTeacherReport.generate(snapshot, { language: configRef.current.language });
        if (result) setReport(result);
      }
    } finally {
      setState("ended");
      setStatus("這次練習已結束。");
    }
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    if (!hasGeminiKey()) {
      setState("error");
      setStatus("尚未設定 Gemini API key。");
      window.setTimeout(() => { window.location.href = "/settings.html"; }, 500);
      return;
    }
    try {
      setReport(null);
      setTurns([]);
      turnsRef.current = [];
      savedRef.current = false;
      setInput("");
      setOutput("");
      setMuted(false);
      setDurationMs(0);
      setState("requesting-mic");
      setStatus("正在準備麥克風…");
      await ensureLiveRuntime();
      if (!window.CrewLive) throw new Error("Crew Live runtime 未載入");

      const session = new window.CrewLive.Session({
        system: configRef.current.system,
        openingPrompt: configRef.current.openingPrompt,
        voice: configRef.current.voice,
        volume,
        maxLiveAttempts: 2,
        maxResumeAttempts: 2,
        onStatus: setStatus,
        onState: (value) => {
          if (value === "requesting-mic") setState("requesting-mic");
          else if (value === "connecting") setState("connecting");
          else if (value === "ready") setState("listening");
          else if (value === "error") setState("error");
        },
        onSpeaking: (speaking) => setState(speaking ? "speaking" : "listening"),
        onMicMuted: () => setMuted(Boolean(sessionRef.current?.micMuted)),
        onInputTranscript: setInput,
        onOutputTranscript: setOutput,
        onTranscriptTurn: (_turn, all) => {
          turnsRef.current = all.slice();
          setTurns(all.slice());
        },
        onError: (error) => { setState("error"); setStatus("Live 連線問題：" + error.message); },
        onTerminal: (info) => {
          const snapshot = captureSnapshot(info?.status || "terminal");
          sessionRef.current = null;
          void finishSession(snapshot);
        }
      });
      sessionRef.current = session;
      await session.start();
      session.setVolume(volume);
      setState("listening");
    } catch (error) {
      sessionRef.current = null;
      setState("error");
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }, [captureSnapshot, finishSession, volume]);

  const stop = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    setState("ending");
    setStatus("正在結束通話…");
    const snapshot = captureSnapshot("user-stop");
    try {
      await session.stop({ reason: "user-stop", silentStatus: true, emitTerminal: false });
    } finally {
      sessionRef.current = null;
    }
    await finishSession(snapshot);
  }, [captureSnapshot, finishSession]);

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session?.ready) return;
    session.toggleMic();
    setMuted(session.micMuted);
  }, []);

  const interrupt = useCallback(() => sessionRef.current?.interrupt() ?? false, []);
  const sendText = useCallback((text: string) => sessionRef.current?.sendText(text) ?? false, []);
  const setVolume = useCallback((value: number) => {
    const next = Math.max(0, Math.min(100, value));
    setVolumeState(next);
    localStorage.setItem("crew_live_volume", String(next));
    sessionRef.current?.setVolume(next);
  }, []);

  const sendImageFile = useCallback(async (file: File) => {
    const session = sessionRef.current;
    if (!session?.ready) return false;
    await ensureLiveRuntime();
    const image = await window.CrewLiveUI?.prepareImage(file, { maxSide: 1600, quality: 0.84 });
    if (!image) return false;
    return session.sendImage(image, {
      prompt: "請先真的看這張圖，再以目前目標語言帶我學。不要一次把答案講完，先問我一個和圖片直接相關的問題。",
      statusText: "圖片已送給老師，正在看圖…"
    });
  }, []);

  useEffect(() => () => {
    const session = sessionRef.current;
    if (session) void session.stop({ reason: "page-leave", silentStatus: true, emitTerminal: false });
  }, []);

  return { state, status, turns, input, output, muted, volume, durationMs, report, start, stop, toggleMute, interrupt, sendText, setVolume, sendImageFile };
}
