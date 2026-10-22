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

/** Keep search-engine SSG snapshots at their canonical language. */
export function isAutomatedLocaleVisitor(userAgent:string):boolean {
 return /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|whatsapp|telegrambot|discordbot|linkedinbot|googleother|bingpreview|lighthouse|headlesschrome|prerender/i.test(userAgent);
}

/** URL language > existing preference > device languages > English.
 * Existing stored preferences are preserved even though older releases also
 * wrote automatic defaults; there is no reliable way to distinguish those.
 * The legacy HashRouter still has no public language-prefix URLs.
 */
export function resolveInitialUiLocale(options:{
 pathname:string;
 storedLocale:string|null;
 browserLanguages:readonly string[];
 userAgent?:string;
 isBrowser?:boolean;
}):UiLocale {
 const {pathname,storedLocale,browserLanguages,userAgent="",isBrowser=true}=options;
 if(!isBrowser)return "zh-TW"; // Deterministic SSG output.
 if(!pathname.startsWith("/crew-app/")){
  const fromPath=localeFromPublicPath(pathname);
  if(fromPath)return fromPath;
  if(isAutomatedLocaleVisitor(userAgent))return "zh-TW";
 }
 const saved=normalizeUiLocale(storedLocale);
 if(saved)return saved;
 for(const tag of browserLanguages){
  const language=normalizeUiLocale(tag);
  if(language)return language;
 }
 return "en";
}

/** Replace only implicit public routes, never explicit language URLs or legacy links. */
export function preferredPublicLocaleDestination(
 pathname:string,locale:UiLocale,search="",hash="",userAgent=""
):string|null {
 if(!pathname.startsWith("/")||pathname.startsWith("/crew-app/")||
    localeFromPublicPath(pathname)||locale==="zh-TW"||isAutomatedLocaleVisitor(userAgent))return null;
 return localePrefix(locale)+pathname+search+hash;
}
