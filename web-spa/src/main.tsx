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
// Keep the scrollbar policy last so route and dialog styles cannot bring tracks back.
import "./scrollbar-policy.css";
import "./i18n";
import { App } from "./App";
import {PublicResearchProvider,type PublicResearchSeed} from "./briefing/PublicResearchContext";

const root = document.getElementById("root");
if (!root) throw new Error("Crew root not found");

// Dual deployment during migration: GitHub Pages retains legacy links;
// Cloudflare serves clean BrowserRouter URLs from the website root.
const legacy = window.location.pathname.startsWith("/crew-app/");
const languagePrefix = !legacy && /^\/en(?:\/|$)/.test(window.location.pathname) ? "/en" : undefined;

// Only deep links with no dedicated SSG snapshot require a temporary hide.
function FinishSsgMount() {
  React.useLayoutEffect(() => {
    document.documentElement.classList.remove("crew-dynamic-route");
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
if(!legacy&&prerenderedPath===pathname)hydrateRoot(root,app);
else createRoot(root).render(app);
