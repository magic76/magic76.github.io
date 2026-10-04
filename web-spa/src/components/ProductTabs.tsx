import {NavLink} from "react-router-dom";
export function ProductTabs({items}:{items:Array<[string,string]>}){return <nav className="subnav route-tabs">{items.map(([to,label])=><NavLink key={to} to={to} className={({isActive})=>isActive?"active":""}>{label}</NavLink>)}</nav>}
