import{Outlet}from"react-router-dom";
import{AppChrome}from"../components/AppChrome";

// Crew already provides the global navigation. Avoid a second Teacher tab row.
export function TeacherLayout(){return <AppChrome product="teacher"><Outlet/></AppChrome>}
