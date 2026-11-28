import definitions from "../../../config/ui-locales.json";

export type UiLocale = "zh-TW" | "en" | "ja" | "es" | "pt-BR" | "id" | "fr" | "de" | "ko" | "vi" | "th";
export const UI_LOCALE_KEY = "crew_ui_locale_v1";
export const UI_LOCALE_CATALOG = definitions.locales as ReadonlyArray<{code: UiLocale; label: string; stage: "published" | "priority"}>;
export const UI_LOCALES: readonly UiLocale[] = UI_LOCALE_CATALOG.map(item => item.code);
export const SEO_PRIORITY_LOCALES: readonly UiLocale[] = UI_LOCALE_CATALOG.map(item => item.code);
export const PUBLISHED_SEO_LOCALES: readonly UiLocale[] = UI_LOCALE_CATALOG.filter(item => item.stage === "published").map(item => item.code);

/** Public URLs determine UI locale without mutating a learner's target language. */
export function normalizeUiLocale(value: unknown): UiLocale | null {
 if(typeof value !== "string")return null;
 const lang=value.trim().replace(/_/g,"-").toLowerCase();
 if(/^zh-(hant|tw|hk|mo)(-|$)/.test(lang))return "zh-TW";
 if(/^zh-(hans|cn|sg)(-|$)/.test(lang))return "zh-TW";
 if(lang==="zh")return "zh-TW";
 if(/^pt(-|$)/.test(lang))return "pt-BR";
 const exact=UI_LOCALES.find(code=>code.toLowerCase()===lang);
 if(exact)return exact;
 const base=lang.split("-")[0];
 return UI_LOCALES.find(code=>code.toLowerCase()===base)||null;
}
export function localeFromPublicPath(pathname:string):UiLocale|null {
 const candidate=pathname.split("/")[1];
 if(!candidate)return null;
 return UI_LOCALES.find(code=>code.toLowerCase()===candidate.toLowerCase())||null;
}
export function localePrefix(locale:UiLocale):string {
 return locale==="zh-TW"?"":"/"+locale;
}

/** Public URLs are authoritative; unprefixed URLs always use Traditional Chinese.
 * Only the legacy HashRouter retains a manually stored UI preference.
 */
export function resolveInitialUiLocale(options:{
 pathname:string;
 storedLocale:string|null;
 isBrowser?:boolean;
}):UiLocale {
 const {pathname,storedLocale,isBrowser=true}=options;
 if(!isBrowser)return "zh-TW";
 if(pathname.startsWith("/crew-app/"))return normalizeUiLocale(storedLocale)||"zh-TW";
 return localeFromPublicPath(pathname)||"zh-TW";
}
