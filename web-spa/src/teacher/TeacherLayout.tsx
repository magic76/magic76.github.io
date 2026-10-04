import{Outlet}from"react-router-dom";import{AppChrome}from"../components/AppChrome";import{ProductTabs}from"../components/ProductTabs";
export function TeacherLayout(){return <AppChrome product="teacher"><ProductTabs items={[["/teacher/practice","練習"],["/teacher/learn","學習"],["/teacher/tutor","老師"],["/teacher/me","我的"]]}/><Outlet/></AppChrome>}
