import type { ReactNode } from "react";

export type IconName = "home"|"teacher"|"story"|"fortune"|"settings"|"chat"|"book"|"cards"|"scene"|"mic"|"sparkles"|"plus"|"history"|"image";

const paths:Record<IconName,ReactNode>={
 home:<><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></>,
 teacher:<><circle cx="12" cy="8" r="3.5"/><path d="M5 21c.6-4 3-6 7-6s6.4 2 7 6"/><path d="M18 5.5 20.5 3"/></>,
 story:<><path d="M4 5.5c2.8-1 5.5-.7 8 1v13c-2.5-1.7-5.2-2-8-1z"/><path d="M20 5.5c-2.8-1-5.5-.7-8 1v13c2.5-1.7 5.2-2 8-1z"/></>,
 fortune:<><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11"/></>,
 settings:<><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.5 1a8 8 0 0 0-1.8-1L14.2 3h-4.4L9.4 6a8 8 0 0 0-1.8 1l-2.5-1-2 3.5L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.5-1a8 8 0 0 0 1.8 1l.4 3h4.4l.4-3a8 8 0 0 0 1.8-1l2.5 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z"/></>,
 chat:<path d="M5 5h14v10H9l-4 4z"/>,
 book:<><path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 8h6M8 12h6"/></>,
 cards:<><rect x="5" y="4" width="10" height="14" rx="2"/><path d="m9 8 2 2 2-2"/><path d="M15 7h2a2 2 0 0 1 2 2v10H9"/></>,
 scene:<><path d="M4 18V6h16v12z"/><path d="M4 9h16M9 9v9"/></>,
 mic:<><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></>,
 sparkles:<><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z"/><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z"/></>,
 plus:<path d="M12 5v14M5 12h14"/>,
 history:<><path d="M4 6v5h5"/><path d="M5.5 17A8 8 0 1 0 4 11"/><path d="M12 8v5l3 2"/></>,
 image:<><rect x="3.5" y="4" width="17" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m5.5 17 4.5-4 3 2.5 2-2 3.5 3.5"/></>
};
export function Icon({name}:{name:IconName}){return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>}
