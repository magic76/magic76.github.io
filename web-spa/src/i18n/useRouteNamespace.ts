import {useEffect,useReducer} from "react";
import {useTranslation} from "react-i18next";
import {loadUiNamespace,routeNamespaceReady,type RouteNamespace} from "./index";
/**
 * Safety net for shared components: routes preload their catalogs in App.tsx,
 * but if a new route forgets, render nothing until the catalog arrives instead
 * of flashing raw keys.
 */
export function useRouteNamespace(namespace:RouteNamespace):boolean{
 useTranslation();
 const[,refresh]=useReducer((n:number)=>n+1,0);
 const ready=routeNamespaceReady(namespace);
 useEffect(()=>{if(!ready)void loadUiNamespace(namespace).then(refresh,()=>{})},[ready,namespace]);
 return ready;
}
