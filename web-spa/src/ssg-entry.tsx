import React from "react";
import {renderToString} from "react-dom/server";
import {StaticRouter} from "react-router-dom";
import i18n from "./i18n";
import {App} from "./App";

/** Render the actual React Router screen, not a second marketing template. */
export async function renderStaticRoute(path:string,locale:"zh-TW"|"en"):Promise<string>{
 await i18n.changeLanguage(locale);
 const prefix=locale==="en"?"/en":"";
 const location=prefix+(path==="/"?"/":path);
 const basename=prefix||"/";
 return renderToString(
  <StaticRouter basename={basename} location={location}>
   <App/>
  </StaticRouter>
 );
}
