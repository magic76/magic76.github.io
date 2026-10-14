/**
 * Isolated Firebase AI Logic guest transport. No developer Gemini key enters the browser.
 *
 * Firebase's *web config* apiKey is a public Firebase identifier, not a Gemini
 * Developer API secret. Keep App Check ENFORCED and the linked Gemini project on
 * Spark (no billing) until a trusted server-side quota solution exists.
 */
export const GUEST_DAILY_SESSIONS = 3;
export const GUEST_SESSION_SECONDS = 180;

const sdkVersion = "12.19.0";
const cdn = `https://www.gstatic.com/firebasejs/${sdkVersion}/`;

function config() {
  return {
    apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || ""),
    appId: String(import.meta.env.VITE_FIREBASE_APP_ID || ""),
    projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || ""),
  };
}
function siteKey() { return String(import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY || ""); }
// Firebase App Check debug provider is available ONLY on the Vite localhost
// development server, never in Cloudflare production or preview deployments.
function localDebug() {
  return import.meta.env.DEV
    && typeof window !== "undefined"
    && ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export function guestTrialConfigured() {
  const c = config();
  return import.meta.env.VITE_CREW_GUEST_TRIAL_ENABLED === "1"
    && Boolean(c.apiKey && c.appId && c.projectId && (siteKey() || localDebug()));
}

function today() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function counterKey() { return "crew_firebase_guest_" + today(); }
export function guestSessionsRemaining(): number {
  if (typeof window === "undefined") return 0;
  try {
    const value = Number(localStorage.getItem(counterKey()) || 0);
    return Math.max(0, GUEST_DAILY_SESSIONS - (Number.isFinite(value) ? Math.max(0, value) : GUEST_DAILY_SESSIONS));
  } catch {
    return 0; // Fail closed when local storage is unavailable.
  }
}
export function recordGuestSession(): boolean {
  if (guestSessionsRemaining() === 0) return false;
  try {
    const key = counterKey();
    localStorage.setItem(key, String(GUEST_DAILY_SESSIONS - guestSessionsRemaining() + 1));
    return true;
  } catch { return false; }
}

type SDK = {
  initializeApp: (config: Record<string, string>, name?: string) => unknown;
  initializeAppCheck: (app: unknown, options: Record<string, unknown>) => unknown;
  ReCaptchaEnterpriseProvider: new (key: string) => unknown;
  getAI: (app: unknown, options: Record<string, unknown>) => unknown;
  GoogleAIBackend: new () => unknown;
  getLiveGenerativeModel: (ai: unknown, options: Record<string, unknown>) => {connect: () => Promise<GuestLiveSession>};
  startAudioConversation: (session: GuestLiveSession) => Promise<GuestAudioController>;
};
export type GuestAudioController = {stop: () => Promise<void>};
export type GuestLiveSession = {
  close: () => Promise<void>;
  send: (text: string, turnComplete?: boolean) => Promise<void>;
};
let sdkPromise: Promise<SDK> | null = null;
async function sdk(): Promise<SDK> {
  if (!sdkPromise) sdkPromise = (async () => {
    // Official Firebase CDN modules avoid modifying the existing npm lockfile.
    // These modules load only on the optional guest route.
    const [app, check, ai] = await Promise.all([
      import(/* @vite-ignore */ cdn + "firebase-app.js"),
      import(/* @vite-ignore */ cdn + "firebase-app-check.js"),
      import(/* @vite-ignore */ cdn + "firebase-ai.js"),
    ]);
    return {...app, ...check, ...ai} as SDK;
  })().catch(err => { sdkPromise = null; throw err; });
  return sdkPromise;
}
let aiPromise: Promise<{sdk: SDK; ai: unknown}> | null = null;
async function initialize() {
  if (!guestTrialConfigured()) throw new Error("Firebase 免費試用尚未啟用。");
  if (!aiPromise) aiPromise = (async () => {
    if (localDebug()) {
      // The SDK will print a browser-specific debug token to the console.
      // The owner must register it under Firebase App Check -> Manage debug
      // tokens before the Firebase AI Logic backend will accept requests.
      // NEVER include the token in code, env or Cloudflare deployments.
      (globalThis as typeof globalThis & {
        FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean;
      }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const modules = await sdk();
    const app = modules.initializeApp(config(), "crew-web-guest");
    modules.initializeAppCheck(app, {
      // The dummy provider string is ignored by the SDK while the debug
      // provider is active. This path is hard-gated to Vite localhost only.
      provider: new modules.ReCaptchaEnterpriseProvider(siteKey() || "dev-only-no-site-key"),
      isTokenAutoRefreshEnabled: true,
    });
    return {sdk: modules, ai: modules.getAI(app, {backend: new modules.GoogleAIBackend()})};
  })().catch(err => { aiPromise = null; throw err; });
  return aiPromise;
}

export async function connectGuestLive(system: string) {
  const {sdk: modules, ai} = await initialize();
  const model = modules.getLiveGenerativeModel(ai, {
    model: "gemini-3.1-flash-live-preview",
    systemInstruction: system,
    generationConfig: {responseModalities: ["AUDIO"]},
  });
  const session = await model.connect();
  return {session, startAudio: () => modules.startAudioConversation(session)};
}
