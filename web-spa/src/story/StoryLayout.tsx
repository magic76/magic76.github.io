import{Outlet}from"react-router-dom";import{AppChrome}from"../components/AppChrome";import{ProductTabs}from"../components/ProductTabs";
export function StoryLayout(){return <AppChrome product="story"><ProductTabs items={[["/story/shelf","書架"],["/story/create","創作"],["/story/live","阿奇"]]}/><Outlet/></AppChrome>}
