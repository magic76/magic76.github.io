import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./build-version.css";

type BuildInfo = {
  schema: 1;
  buildId: string | null;
  builtAt: string | null;
  commit: string | null;
  version: string | null;
  environment: string;
};

declare const __CREW_BUILD_INFO__: BuildInfo;

// Bundled metadata describes the JS currently running, not the latest network response.
const currentBuild = __CREW_BUILD_INFO__;

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

function formatTime(value: string | null, full: boolean, english: boolean): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat(english ? "en-GB" : "zh-TW", {
    timeZone: "Asia/Taipei",
    year: full ? "numeric" : undefined,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
}

/** Quiet corner badge; expands on demand. Not part of any route's scrolling layout. */
export function BuildVersion() {
  const { i18n } = useTranslation();
  const english = i18n.resolvedLanguage?.startsWith("en") ?? false;
  const [ready, setReady] = useState(false);
  const [latest, setLatest] = useState<BuildInfo | null>(null);
  const [expanded, setExpanded] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const outdated = Boolean(currentBuild.buildId && latest?.buildId && latest.buildId !== currentBuild.buildId);
  const c = english ? {
    label: "Updated", unknown: "Build info", development: "Development",
    available: "New version available", details: "Build details", close: "Close",
    builtAt: "Build time", version: "Version", commit: "Commit", environment: "Environment",
    status: "Status", current: "Latest version", unverified: "Not checked yet",
    old: "Update available", refresh: "Refresh to update", latestAt: "Latest build",
    timezone: "Taipei time (UTC+8)", missing: "Unavailable"
  } : {
    label: "更新", unknown: "版本資訊", development: "開發版本",
    available: "有新版本", details: "網站版本資訊", close: "關閉",
    builtAt: "建置時間", version: "版本", commit: "Git Commit", environment: "環境",
    status: "更新狀態", current: "已是最新版本", unverified: "尚未確認",
    old: "偵測到新版本", refresh: "重新整理以更新", latestAt: "最新建置",
    timezone: "台灣時間 (UTC+8)", missing: "無資料"
  };
  const builtTime = ready ? formatTime(currentBuild.builtAt, false, english) : null;

  useEffect(() => {
    setReady(true);
    let active = true;
    let checking = false;
    const controller = new AbortController();
    const check = async () => {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        // BASE_URL is "/" on Cloudflare and "./" on the legacy GitHub Pages build.
        const url = import.meta.env.BASE_URL + "version.json?check=" + Date.now();
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (active && isBuildInfo(data)) setLatest(data);
      } catch {
        // Offline browsing and disabled networks are normal; keep current build visible.
      } finally {
        checking = false;
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    const onFocus = () => { if (document.visibilityState === "visible") void check(); };
    void check();
    const interval = window.setInterval(() => void check(), 90_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onOutside = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node)) setExpanded(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [expanded]);

  return <div ref={anchor} className="crew-build-anchor">
    {expanded && <section className="crew-build-popover" id="crew-build-details" aria-label={c.details}>
      <div className="crew-build-heading"><strong>{c.details}</strong>
        <button type="button" aria-label={c.close} onClick={() => setExpanded(false)}>×</button>
      </div>
      <dl>
        <dt>{c.builtAt}</dt><dd>{formatTime(currentBuild.builtAt, true, english) || c.missing}<small>{c.timezone}</small></dd>
        <dt>{c.version}</dt><dd>{currentBuild.version || currentBuild.buildId || c.development}</dd>
        <dt>{c.commit}</dt><dd><code>{currentBuild.commit?.slice(0, 10) || c.missing}</code></dd>
        <dt>{c.environment}</dt><dd>{currentBuild.environment}</dd>
        <dt>{c.status}</dt><dd>{outdated ? c.old : latest ? c.current : c.unverified}</dd>
        {outdated && <><dt>{c.latestAt}</dt><dd>{formatTime(latest?.builtAt || null, true, english) || c.missing}</dd></>}
      </dl>
      {outdated && <button type="button" className="crew-build-refresh" onClick={() => window.location.reload()}>{c.refresh} ↗</button>}
    </section>}
    <button type="button" className={"crew-build-badge" + (outdated ? " has-update" : "")}
      aria-expanded={expanded} aria-controls="crew-build-details" onClick={() => setExpanded(v => !v)}>
      <span className="crew-build-dot" aria-hidden="true"/>
      {outdated ? c.available : builtTime ? c.label + " " + builtTime : currentBuild.environment === "Development" && ready ? c.development : c.unknown}
    </button>
  </div>;
}
