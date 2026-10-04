import{Outlet}from"react-router-dom";import{AppChrome}from"../components/AppChrome";import{ProductTabs}from"../components/ProductTabs";
export function FortuneLayout(){return <AppChrome product="fortune"><ProductTabs items={[["/fortune","解讀"],["/fortune/history","歷史"]]}/><Outlet/></AppChrome>}
