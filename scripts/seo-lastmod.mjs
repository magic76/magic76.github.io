import {statSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
// Map public URLs to their content sources; generated HTML must never be used
// because that would make every deployment appear to be a content update.
const SOURCE_PATHS={
 "":"web-spa/src/pages/HomePage.tsx",
 teacher:"web-spa/src/teacher/PracticePage.tsx",
 story:"web-spa/src/story/ShelfPage.tsx",
 fortune:"web-spa/src/fortune/HomePage.tsx",
 research:"web-spa/src/briefing/BriefingPage.tsx",
 games:"web-spa/src/games/CrewPlayHubPage.tsx",
 "games/friend-gomoku":"web-spa/src/games/FriendGomokuPage.tsx",
 "games/1a2b":"web-spa/src/games/NumberGamePage.tsx",
 "games/taboo":"web-spa/src/games/TabooGamePage.tsx",
 "games/number-bomb":"web-spa/src/games/QuickPlayGamePage.tsx",
 "games/memory":"web-spa/src/games/QuickPlayGamePage.tsx",
 "games/connect4":"web-spa/src/games/CrewPlayGamePage.tsx",
 "games/reversi":"web-spa/src/games/CrewPlayGamePage.tsx",
 "games/twenty-questions":"web-spa/src/games/CrewPlayGamePage.tsx",
 "games/mystery":"web-spa/src/games/CrewPlayGamePage.tsx",
 "games/crazy-court":"web-spa/src/games/CrazyCourtPage.tsx",
 "games/werewolf":"web-spa/src/games/WerewolfPage.tsx",
 "games/truth-news":"web-spa/src/games/TruthNewsPage.tsx",
 "games/nonsense":"web-spa/src/games/NonsenseLiveNewsPage.tsx"
};
const cache=new Map();
export function seoLastmod(slug){
 const source=slug.startsWith("guides/")?"web-spa/src/guides/catalog.ts":
   slug.startsWith("teacher/course/")?"scripts/course-seo.mjs":SOURCE_PATHS[slug];
 if(!source)throw Error("Missing lastmod source mapping: "+slug);
 if(cache.has(source))return cache.get(source);
 let date;
 try{
  date=execFileSync("git",["log","-1","--format=%cs","--",source],{cwd:root,encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:3000}).trim();
 }catch{/* ZIP snapshots have no git history; use source's preserved mtime. */}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))date=statSync(join(root,source)).mtime.toISOString().slice(0,10);
 cache.set(source,date);
 return date;
}
