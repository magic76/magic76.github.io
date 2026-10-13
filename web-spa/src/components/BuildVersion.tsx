import { useEffect, useState } from "react";
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

/** Version information lives only in Settings, not as a global floating badge. */
export function BuildVersion() {
  const { i18n } = useTranslation();
  const english = i18n.resolvedLanguage?.startsWith("en") ?? false;
  const [ready, setReady] = useState(false);
  const [latest, setLatest] = useState<BuildInfo | null>(null);
  const [expanded, setExpanded] = useState(false);
  const outdated = Boolean(currentBuild.buildId && latest?.buildId && latest.buildId !== currentBuild.buildId);
  const c = english ? {
    label: "Updated", unknown: "Build info", details: "Website version",
    builtAt: "Build time", version: "Version", refresh: "Refresh to update",
    timezone: "Taipei time (UTC+8)", missing: "Unavailable",
    showDetails: "Details", hideDetails: "Hide details"
  } : {
    label: "更新", unknown: "版本資訊", details: "網站版本資訊",
    builtAt: "建置時間", version: "版本", refresh: "重新整理以更新",
    timezone: "台灣時間 (UTC+8)", missing: "無資料",
    showDetails: "查看詳細資訊", hideDetails: "收起詳細資訊"
  };
  // No semantic version is configured; use the non-Git portion of the build ID.
  const versionLabel = currentBuild.version ||
    (currentBuild.buildId ? "Build " + currentBuild.buildId.split("-").at(-1) : c.missing);
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

  return <section className="section panel crew-build-section" aria-label={c.details}>
    <div className="section-head crew-build-heading">
      <h2>{c.details}</h2>
    </div>
    <div className="crew-build-row">
      <strong className="crew-build-summary">{builtTime ? c.label + " " + builtTime : c.unknown}</strong>
      <button type="button" className="crew-build-toggle" aria-expanded={expanded} aria-controls="crew-build-details" onClick={() => setExpanded(v => !v)}>
        {expanded ? c.hideDetails : c.showDetails}
      </button>
    </div>
    {outdated && <button type="button" className="crew-build-refresh" onClick={() => window.location.reload()}>{c.refresh} ↗</button>}
    <div id="crew-build-details" className="crew-build-details" hidden={!expanded}>
      <dl>
        <dt>{c.builtAt}</dt><dd>{formatTime(currentBuild.builtAt, true, english) || c.missing}<small>{c.timezone}</small></dd>
        <dt>{c.version}</dt><dd>{versionLabel}</dd>
      </dl>
    </div>
  </section>;
}
