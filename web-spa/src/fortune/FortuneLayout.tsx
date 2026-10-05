import{Link,Outlet}from"react-router-dom";
import{AppChrome}from"../components/AppChrome";
export function FortuneLayout(){return <AppChrome product="fortune" headerAction={<Link className="fortune-header-history" to="/fortune/history">歷史</Link>}><Outlet/></AppChrome>}
