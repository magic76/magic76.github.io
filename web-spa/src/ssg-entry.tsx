import React from "react";
import {prerender} from "react-dom/static";
import {StaticRouter} from "react-router-dom";
import i18n,{loadUiLocale,type UiLocale} from "./i18n";
import {localePrefix} from "./i18n/localeCatalog";
import {App} from "./App";
import {PublicResearchProvider,type PublicResearchSeed} from "./briefing/PublicResearchContext";

/** Render the actual React Router screen, not a second marketing template. */
export async function renderStaticRoute(path:string,locale:UiLocale,seed:PublicResearchSeed|null=null):Promise<string>{
 await loadUiLocale(locale);
 await i18n.changeLanguage(locale);
 const prefix=localePrefix(locale);
 const location=prefix+(path==="/"?"/":path);
 const basename=prefix||"/";
 const {prelude}=await prerender(
  <StaticRouter basename={basename} location={location}>
   <PublicResearchProvider seed={seed}><App/></PublicResearchProvider>
  </StaticRouter>
 );
 return new Response(prelude).text();
}
