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
// Debug App Check is allowed only in Vite localhost or a Cloudflare Pages
// PREVIEW subdomain with an explicit preview-only build flag. Configure the
// Pages preview environment behind Cloudflare Access BEFORE enabling the flag.
// No registered debug tokens are ever bundled or sent to other visitors.
function localDebug() {
  return import.meta.env.DEV
    && typeof window !== "undefined"
    && ["localhost", "127.0.0.1"].includes(window.location.hostname);
}
function previewDebug() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return import.meta.env.VITE_CREW_FIREBASE_PREVIEW_DEBUG === "1"
    && /^[a-z0-9-]+\.magic76-github-io\.pages\.dev$/.test(host);
}
function appCheckDebug() { return localDebug() || previewDebug(); }

export function guestTrialConfigured() {
  const c = config();
  return import.meta.env.VITE_CREW_GUEST_TRIAL_ENABLED === "1"
    && Boolean(c.apiKey && c.appId && c.projectId && (siteKey() || appCheckDebug()));
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
let preparedAudioStarter: SDK["startAudioConversation"] | null = null;
export function startPreparedGuestAudio(session: GuestLiveSession): Promise<GuestAudioController> {
  if (!preparedAudioStarter) throw new Error("Firebase Live 尚未完成連線準備。");
  // Called directly in the user click handler, not after an async import.
  return preparedAudioStarter(session);
}
let aiPromise: Promise<{sdk: SDK; ai: unknown}> | null = null;
async function initialize() {
  if (!guestTrialConfigured()) throw new Error("Firebase 免費試用尚未啟用。");
  if (!aiPromise) aiPromise = (async () => {
    if (appCheckDebug()) {
      // The SDK will print a browser-specific debug token to the console.
      // The owner must register it under Firebase App Check -> Manage debug
      // tokens before the Firebase AI Logic backend will accept requests.
      // NEVER include the token in code, env or Cloudflare deployments.
      (globalThis as typeof globalThis & {
        FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean;
      }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const modules = await sdk();
    preparedAudioStarter = modules.startAudioConversation;
    const app = modules.initializeApp(config(), "crew-web-guest");
    modules.initializeAppCheck(app, {
      // The dummy provider string is ignored while the debug provider is active.
      // Hostname + compile-time flags constrain the debug path to local/preview.
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
