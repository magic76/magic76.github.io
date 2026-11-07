import React from "react";
import {createRoot,hydrateRoot} from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "../../features/shared/design-system.css";
import "../../features/teacher/styles.css";
import "../../features/teacher/practice/styles.css";
import "../../features/teacher/textbook/styles.css";
import "../../features/story/styles.css";
import "../../features/fortune/styles.css";
import "./styles.css";
import "./motion.css";
import "./desktop-workspace.css";
import "./teacher/parity.css";
import "./briefing/briefing.css";
import "./guides/guides.css";
import "./uxReadability.css";
import "./uxPass2.css";
// Keep the scrollbar policy last so route and dialog styles cannot bring tracks back.
import "./scrollbar-policy.css";
import "./i18n";
import i18n,{localeResourcesReady} from "./i18n";
import {localeFromPublicPath,localePrefix,normalizeUiLocale,preferredPublicLocaleDestination} from "./i18n/localeCatalog";
import { App } from "./App";

import {PublicResearchProvider,type PublicResearchSeed} from "./briefing/PublicResearchContext";

const root = document.getElementById("root");
if (!root) throw new Error("Crew root not found");

// Dual deployment during migration: GitHub Pages retains legacy links;
// Cloudflare serves clean BrowserRouter URLs from the website root.
const legacy = window.location.pathname.startsWith("/crew-app/");
const languagePrefix = !legacy ? (localePrefix(localeFromPublicPath(window.location.pathname)||"zh-TW")||undefined) : undefined;

// Only deep links with no dedicated SSG snapshot require a temporary hide.
function FinishSsgMount() {
  React.useLayoutEffect(() => {
    document.documentElement.classList.remove("crew-dynamic-route");
    // Clean the temporary cache-busting query after the current app mounts.
    const url=new URL(window.location.href);
    if(url.searchParams.has("__crew_reload")){
      url.searchParams.delete("__crew_reload");
      window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
    }
  }, []);
  return null;
}

// Only a published public research seed is ever embedded into SSG HTML.
let researchSeed:PublicResearchSeed|null=null;
try{const element=document.getElementById("crew-research-seed");if(element?.textContent)researchSeed=JSON.parse(element.textContent) as PublicResearchSeed}catch{/* Invalid or absent seed falls back to the public JSON feed. */}
const app = (
  <React.StrictMode>
    <PublicResearchProvider seed={researchSeed}>
      {legacy ? <HashRouter><App/><FinishSsgMount/></HashRouter> :
        <BrowserRouter basename={languagePrefix}><App/><FinishSsgMount/></BrowserRouter>}
    </PublicResearchProvider>
  </React.StrictMode>
);
const pathname=window.location.pathname.replace(/\/+$/,"")||"/";
const prerenderedPath=root.dataset.crewSsgPath;
// Only hydrate when the delivered SSG HTML belongs to this exact route.
// The root-index SPA fallback is intentionally NOT hydrated for deep links.
// Wait only for the active locale, never for all nine languages.
// Select a localized public URL before hydration, preserving the page and query.
// Native Android WebView loads the same Crew home URL and follows this path.
const destination=!legacy?preferredPublicLocaleDestination(
 window.location.pathname,normalizeUiLocale(i18n.language)||"en",
 window.location.search,window.location.hash,navigator.userAgent
):null;
if(destination){
 window.location.replace(destination);
} else {
 void localeResourcesReady.then(()=>{
  if(!legacy&&prerenderedPath===pathname)hydrateRoot(root,app);
  else createRoot(root).render(app);
 });
}
