import {Arrow} from "../components/Arrow";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { trackUsageEvent } from "../analytics/usage";
import { CREATURE_LAB_SAVE, creatureLabHref, readCreatureLabProgress, type CreatureLabProgress } from "./creatureLabProgress";

export function useCreatureLabProgress() {
  const [progress, setProgress] = useState<CreatureLabProgress | null>(null);
  useEffect(() => {
    const refresh = () => setProgress(readCreatureLabProgress());
    const onStorage = (event: StorageEvent) => {
      if (event.key === CREATURE_LAB_SAVE || event.key === null) refresh();
    };
    refresh();
    window.addEventListener("pageshow", refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return progress;
}

export function CreatureLabResume({ progress }: { progress: CreatureLabProgress }) {
  const { t } = useTranslation("home");
  const { form, line, remaining } = progress;
  const href = creatureLabHref();
  const title = form === "egg" ? t("creatureLab.egg") : t("creatureLab.care", { name: t("creatureLab.species." + line) });
  let hint = t("creatureLab.needed", { energy: remaining });
  if (form === "final") hint = t("creatureLab.memory");
  else if (!remaining) hint = t(form === "egg" ? "creatureLab.hatch" : "creatureLab.evolve");
  return <a href={href} className="crew-home-recent crew-creature-resume" onClick={() => trackUsageEvent("home_entry_click", "play")}>
    <span className="crew-home-recent-art" aria-hidden="true">
      <img src={href + "art/creatures/" + (line || "moonfox") + "-" + form + ".webp"} alt="" width="56" height="56" loading="lazy" decoding="async"/>
    </span>
    <span className="crew-home-recent-copy"><strong>{title}</strong><small>{hint}</small></span>
    <Arrow className="crew-home-recent-arrow"/>
  </a>;
}
