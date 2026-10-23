/** Optional, bounded route preloads. Never fetch user data, keys or Live sessions. */
type Connection = {saveData?: boolean; effectiveType?: string};
const started = new Set<string>();

const routes: Record<string, Array<() => Promise<unknown>>> = {
  "/": [
    () => import("../pages/CrewSectionPage"),
    () => import("../games/CrewPlayHubPage")
  ],
  "/explore": [
    () => import("../friends/FriendsPage"),
    () => import("../games/CrewPlayHubPage")
  ],
  "/learn": [
    () => import("../teacher/VocabularyPage"),
    () => import("../teacher/CoursePage")
  ],
  "/games": [
    () => import("../games/CrewPlayGamePage"),
    () => import("../games/TabooGamePage")
  ]
};

export function scheduleCrewPreload(pathname: string) {
  const loaders = routes[pathname];
  const connection = (navigator as Navigator & {connection?: Connection}).connection;
  if (!loaders || started.has(pathname) || navigator.onLine === false ||
      document.visibilityState !== "visible" || connection?.saveData ||
      /(?:slow-)?2g/.test(connection?.effectiveType || "")) return () => {};
  // Only preload on a settled, visible screen; prioritize foreground requests.
  let cancelled = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    if (cancelled || document.visibilityState !== "visible") return;
    started.add(pathname);
    for (const load of loaders) void load().catch(() => {
      // A missing old chunk is handled by the existing route error boundary.
    });
  };
  timeout = setTimeout(run, 1800);
  return () => {cancelled = true; clearTimeout(timeout);};
}
