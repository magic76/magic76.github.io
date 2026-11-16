import {useState} from "react";
import {useTranslation} from "react-i18next";
import {hasNewBuild,refreshCrewBuild,useBuildUpdate} from "../runtime/buildUpdates";
import "./crew-update-notice.css";

const labels: Record<string, [string,string,string]> = {
  "zh-TW": ["Koolo 有新版可用", "立即更新", "稍後"],
  en: ["A Koolo update is available", "Update", "Later"],
  ja: ["Koolo の新しいバージョンがあります", "更新", "後で"],
  ko: ["새 Koolo 버전이 있습니다", "업데이트", "나중에"],
  de: ["Eine neue Koolo-Version ist verfügbar", "Aktualisieren", "Später"],
  fr: ["Une mise à jour de Koolo est disponible", "Actualiser", "Plus tard"],
  es: ["Hay una actualización de Koolo", "Actualizar", "Más tarde"],
  id: ["Pembaruan Koolo tersedia", "Perbarui", "Nanti"],
  "pt-BR": ["Uma atualização do Koolo está disponível", "Atualizar", "Depois"],
  th: ["มี Koolo เวอร์ชันใหม่", "อัปเดต", "ภายหลัง"],
  vi: ["Đã có bản cập nhật Koolo", "Cập nhật", "Để sau"]
};

export function canOfferCrewRefresh(pathname: string) {
 // Suppress prompts anywhere a refresh can interrupt ongoing play, narration,
 // writing, a call, a 3D world or a multi-step Mate handoff. The notice will
 // reappear automatically when the visitor returns to a safe destination.
 const path=pathname.replace(/^\/(?:en|ja|es|pt-BR|id|fr|de|ko|vi|th)(?=\/|$)/,"")||"/";
 return !(/\/live(?:\/|$)/.test(path) ||
  /^\/(?:games|mate|magic|town|orb)(?:\/|$)/.test(path) ||
  /^\/teacher\/(?:board|voice-lab|textbook|course|practice|vocabulary|pronunciation)(?:\/|$)/.test(path) ||
  /^\/story\/(?:edit|create|read|physical)(?:\/|$)/.test(path) ||
  /^\/timeline\/compare(?:\/|$)/.test(path) ||
  /^\/fortune\/reading(?:\/|$)/.test(path));
}

export function CrewUpdateNotice({pathname}: {pathname:string}) {
  const latest = useBuildUpdate();
  const {i18n} = useTranslation();
  const [dismissed, setDismissed] = useState<string|null>(null);
  if (!hasNewBuild(latest) || !latest?.buildId || !canOfferCrewRefresh(pathname) ||
      dismissed === latest.buildId) return null;
  const [message,update,later] = labels[i18n.resolvedLanguage || ""] ||
    labels[i18n.language] || labels.en;
  return <aside className="crew-update-notice" role="status" aria-live="polite">
    <span>{message}</span>
    <button type="button" onClick={refreshCrewBuild}>{update}</button>
    <button type="button" className="crew-update-later" onClick={() => setDismissed(latest.buildId)} aria-label={later}>{later}</button>
  </aside>;
}
