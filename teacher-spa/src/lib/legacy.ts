export type LiveTurn = { input?: string; output?: string };
export type TeacherSnapshot = {
  title: string;
  preview: string;
  turns: LiveTurn[];
  durationMs: number;
  model: string;
  reason: string;
  ts: string;
  report?: Record<string, unknown>;
};

type LiveSessionOptions = {
  system: string;
  openingPrompt: string;
  voice: string;
  volume: number;
  maxLiveAttempts?: number;
  maxResumeAttempts?: number;
  onStatus?: (value: string) => void;
  onState?: (value: string) => void;
  onSpeaking?: (value: boolean) => void;
  onMicMuted?: () => void;
  onInputTranscript?: (text: string) => void;
  onOutputTranscript?: (text: string) => void;
  onTranscriptTurn?: (turn: LiveTurn, turns: LiveTurn[]) => void;
  onError?: (error: Error) => void;
  onTerminal?: (info?: { status?: string }) => void;
};

export interface LiveSession {
  ready: boolean;
  running: boolean;
  model: string;
  micMuted: boolean;
  start(): Promise<void>;
  stop(options?: { reason?: string; silentStatus?: boolean; emitTerminal?: boolean }): Promise<void>;
  setVolume(value: number): void;
  toggleMic(): void;
  interrupt(): boolean;
  sendText(text: string): boolean;
  sendImage(image: unknown, options?: { prompt?: string; statusText?: string }): boolean;
  getDurationMs(): number;
}

declare global {
  interface Window {
    CrewAI?: {
      key(): string;
      historyAdd(name: string, item: unknown): unknown[];
      call(prompt: string, options?: Record<string, unknown>): Promise<string>;
    };
    CrewLive?: { Session: new (options: LiveSessionOptions) => LiveSession };
    CrewLiveUI?: {
      prepareImage(file: File, options?: Record<string, unknown>): Promise<unknown>;
      transcriptText(turns: LiveTurn[], labels?: { user?: string; ai?: string }): string;
      patchSession(pageKey: string, ts: string, patch: Record<string, unknown>): unknown;
    };
    CrewTeacherReport?: {
      eligible(snapshot: TeacherSnapshot): boolean;
      generate(snapshot: TeacherSnapshot, options?: { language?: string }): Promise<Record<string, unknown> | null>;
    };
  }
}

const loading = new Map<string, Promise<void>>();

function loadScript(src: string) {
  if (loading.has(src)) return loading.get(src)!;
  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-crew-src="${src}"]`);
    if (existing?.dataset.loaded === "true") return resolve();
    const script = existing ?? document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.crewSrc = src;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error(`無法載入 ${src}`));
    if (!existing) document.head.appendChild(script);
  });
  loading.set(src, promise);
  return promise;
}

export async function ensureLiveRuntime() {
  if (!window.CrewAI) await loadScript("/crew.js");
  if (!window.CrewLive) await loadScript("/crew-live.js");
  if (!window.CrewLiveUI) await loadScript("/crew-live-ui.js");
}

export async function ensureReportRuntime() {
  await ensureLiveRuntime();
  if (!window.CrewTeacherReport) await loadScript("/features/teacher/reports/session-report.js");
}

export function hasGeminiKey() {
  return Boolean(localStorage.getItem("crew_gemini_api_key") || sessionStorage.getItem("crew_gemini_api_key_session"));
}

export function readLastTeacherSession(): TeacherSnapshot | null {
  try { return JSON.parse(localStorage.getItem("crew_live_last_teacher") || "null"); }
  catch { return null; }
}

export function teacherHistory(): TeacherSnapshot[] {
  try { return JSON.parse(localStorage.getItem("crew_history_teacher") || "[]"); }
  catch { return []; }
}

export function saveTeacherSnapshot(snapshot: TeacherSnapshot) {
  try { localStorage.setItem("crew_live_last_teacher", JSON.stringify(snapshot)); } catch {}
  if (window.CrewAI?.historyAdd) {
    window.CrewAI.historyAdd("teacher", snapshot);
    return;
  }
  try {
    const items = teacherHistory();
    items.unshift(snapshot);
    localStorage.setItem("crew_history_teacher", JSON.stringify(items.slice(0, 20)));
  } catch {}
}

export function vocabularyLevel() {
  const score = Number(localStorage.getItem("crew_vocab_score") || 50);
  if (score < 30) return "A1";
  if (score < 45) return "A2";
  if (score < 62) return "B1";
  if (score < 82) return "B2";
  return "C1";
}
