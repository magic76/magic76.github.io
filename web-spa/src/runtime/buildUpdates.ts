import {useSyncExternalStore} from "react";

export type BuildInfo = {
  schema: 1;
  buildId: string | null;
  builtAt: string | null;
  commit: string | null;
  version: string | null;
  environment: string;
};

declare const __CREW_BUILD_INFO__: BuildInfo;
export const currentBuild = __CREW_BUILD_INFO__;

function isBuildInfo(value: unknown): value is BuildInfo {
  if (!value || typeof value !== "object") return false;
  const info = value as Partial<BuildInfo>;
  return info.schema === 1 && typeof info.buildId === "string" &&
    info.buildId.length > 0 && typeof info.builtAt === "string" &&
    Number.isFinite(Date.parse(info.builtAt)) &&
    (info.commit === null || typeof info.commit === "string") &&
    (info.version === null || typeof info.version === "string") &&
    typeof info.environment === "string";
}

let latest: BuildInfo | null = null;
let pending = false;
let timer: ReturnType<typeof setInterval> | null = null;
let controller: AbortController | null = null;
const listeners = new Set<() => void>();

export async function checkCrewBuild() {
  if (document.visibilityState === "hidden" || navigator.onLine === false) return;
  // StrictMode subscription replay can abort an in-flight check and re-subscribe
  // immediately; do not stall the next attempt until the polling interval.
  if (pending && controller && !controller.signal.aborted) return;
  pending = true;
  const request = new AbortController();
  controller = request;
  try {
    const url = import.meta.env.BASE_URL + "version.json?check=" + Date.now();
    const response = await fetch(url, {cache: "no-store", signal: request.signal});
    if (!response.ok) return;
    const data: unknown = await response.json();
    if (isBuildInfo(data) && data.buildId !== latest?.buildId) {
      latest = data;
      listeners.forEach(listener => listener());
    }
  } catch {
    // Offline or interrupted requests must not disrupt an active session.
  } finally {
    if (controller === request) {
      controller = null;
      pending = false;
    }
  }
}

const onVisible = () => {
  if (document.visibilityState === "visible") void checkCrewBuild();
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void checkCrewBuild();
    timer = setInterval(() => void checkCrewBuild(), 90_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer !== null) clearInterval(timer);
      timer = null;
      controller?.abort();
      controller = null;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
    }
  };
}

export function useBuildUpdate() {
  return useSyncExternalStore(subscribe, () => latest, () => null);
}

export function hasNewBuild(latestBuild: BuildInfo | null) {
  return Boolean(currentBuild.buildId && latestBuild?.buildId &&
    latestBuild.buildId !== currentBuild.buildId);
}

export function refreshCrewBuild() {
  // A cache-busting navigation gets fresh HTML; main.tsx removes this marker.
  const url = new URL(window.location.href);
  url.searchParams.set("__crew_reload", Date.now().toString(36));
  window.location.assign(url.toString());
}
