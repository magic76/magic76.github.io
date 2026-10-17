import{Navigate,Route,Routes,useLocation,useParams}from"react-router-dom";
import{useEffect,lazy,Suspense}from"react";
import{trackAppOpen,trackPageView}from"./analytics/usage";
import{GlobalNav,type Product}from"./components/AppChrome";
import{AppChrome}from"./components/AppChrome";
const PrivacyPage=lazy(()=>import("./pages/PrivacyPage").then(m=>({default:m.PrivacyPage})));const HomePage=lazy(()=>import("./pages/HomePage").then(m=>({default:m.HomePage})));const SettingsPage=lazy(()=>import("./pages/SettingsPage").then(m=>({default:m.SettingsPage})));
const TeacherLayout=lazy(()=>import("./teacher/TeacherLayout").then(m=>({default:m.TeacherLayout})));const PracticePage=lazy(()=>import("./teacher/PracticePage").then(m=>({default:m.PracticePage})));const LearnPage=lazy(()=>import("./teacher/LearnPage").then(m=>({default:m.LearnPage})));const TutorPage=lazy(()=>import("./teacher/TutorPage").then(m=>({default:m.TutorPage})));const MyPage=lazy(()=>import("./teacher/MyPage").then(m=>({default:m.MyPage})));const VocabularyPage=lazy(()=>import("./teacher/VocabularyPage").then(m=>({default:m.VocabularyPage})));const CoursePage=lazy(()=>import("./teacher/CoursePage").then(m=>({default:m.CoursePage})));const PronunciationPage=lazy(()=>import("./teacher/PronunciationPage").then(m=>({default:m.PronunciationPage})));const TextbookPage=lazy(()=>import("./teacher/TextbookPage").then(m=>({default:m.TextbookPage})));const PhrasebookPage=lazy(()=>import("./teacher/PhrasebookPage").then(m=>({default:m.PhrasebookPage})));const ReportsPage=lazy(()=>import("./teacher/ReportsPage").then(m=>({default:m.ReportsPage})));const ReadingLibraryPage=lazy(()=>import("./teacher/ReadingLibraryPage").then(m=>({default:m.ReadingLibraryPage})));const TeacherLivePage=lazy(()=>import("./teacher/LivePage").then(m=>({default:m.TeacherLivePage})));
const StudentMemoryPage=lazy(()=>import("./teacher/StudentMemoryPage").then(m=>({default:m.StudentMemoryPage})));const RolesPage=lazy(()=>import("./teacher/RolesPage").then(m=>({default:m.RolesPage})));
const StoryLayout=lazy(()=>import("./story/StoryLayout").then(m=>({default:m.StoryLayout})));const StoryShelfPage=lazy(()=>import("./story/ShelfPage").then(m=>({default:m.StoryShelfPage})));const StoryMyPage=lazy(()=>import("./story/MyPage").then(m=>({default:m.StoryMyPage})));const StoryCreatePage=lazy(()=>import("./story/CreatePage").then(m=>({default:m.StoryCreatePage})));const StoryReaderPage=lazy(()=>import("./story/ReaderPage").then(m=>({default:m.StoryReaderPage})));const StoryEditorPage=lazy(()=>import("./story/EditorPage").then(m=>({default:m.StoryEditorPage})));const PhysicalBookPage=lazy(()=>import("./story/PhysicalBookPage").then(m=>({default:m.PhysicalBookPage})));const StoryLivePage=lazy(()=>import("./story/LivePage").then(m=>({default:m.StoryLivePage})));
const FortuneLayout=lazy(()=>import("./fortune/FortuneLayout").then(m=>({default:m.FortuneLayout})));const FortuneHomePage=lazy(()=>import("./fortune/HomePage").then(m=>({default:m.FortuneHomePage})));const FortuneHistoryPage=lazy(()=>import("./fortune/HistoryPage").then(m=>({default:m.FortuneHistoryPage})));const FortuneReadingPage=lazy(()=>import("./fortune/ReadingPage").then(m=>({default:m.FortuneReadingPage})));const FortuneLivePage=lazy(()=>import("./fortune/LivePage").then(m=>({default:m.FortuneLivePage})));
const VoiceLabPage=lazy(()=>import("./teacher/VoiceLabPage").then(m=>({default:m.VoiceLabPage})));
const UsageDashboardPage=lazy(()=>import("./analytics/UsageDashboardPage").then(m=>({default:m.UsageDashboardPage})));
const TimelinePage=lazy(()=>import("./timeline/TimelinePage").then(m=>({default:m.TimelinePage})));
const TimelineLivePage=lazy(()=>import("./timeline/TimelineLivePage").then(m=>({default:m.TimelineLivePage})));
const FriendsPage=lazy(()=>import("./friends/FriendsPage").then(m=>({default:m.FriendsPage})));const FriendLivePage=lazy(()=>import("./friends/FriendLivePage").then(m=>({default:m.FriendLivePage})));const FriendGomokuPage=lazy(()=>import("./games/FriendGomokuPage").then(m=>({default:m.FriendGomokuPage})));
const CrewPlayHubPage=lazy(()=>import("./games/CrewPlayHubPage").then(m=>({default:m.CrewPlayHubPage})));
const CrewPlayGamePage=lazy(()=>import("./games/CrewPlayGamePage").then(m=>({default:m.CrewPlayGamePage})));
const NumberGamePage=lazy(()=>import("./games/NumberGamePage").then(m=>({default:m.NumberGamePage})));
const TabooGamePage=lazy(()=>import("./games/TabooGamePage").then(m=>({default:m.TabooGamePage})));
const BriefingPage=lazy(()=>import("./briefing/BriefingPage").then(m=>({default:m.BriefingPage})));
const BriefingDetailPage=lazy(()=>import("./briefing/BriefingDetailPage").then(m=>({default:m.BriefingDetailPage})));
const BriefingBoardPage=lazy(()=>import("./briefing/BriefingBoardPage").then(m=>({default:m.BriefingBoardPage})));
const ShortsPage=lazy(()=>import("./teacher/ShortsPage").then(m=>({default:m.ShortsPage})));
const GuidePage=lazy(()=>import("./guides/GuidePage").then(m=>({default:m.GuidePage})));
function BriefingLegacyRedirect(){const {date="",id=""}=useParams();return <Navigate to={"/research/"+encodeURIComponent(date)+"/"+encodeURIComponent(id)} replace/>}
export function App(){useEffect(()=>{trackAppOpen()},[]);const {pathname,search}=useLocation();useEffect(()=>{trackPageView(pathname)},[pathname]);
 useEffect(()=>{
  // Remember the last opened play/friend destination locally; never persist speech or messages.
  const game=/^\/games\/(friend-gomoku|connect4|twenty-questions|reversi|mystery|1a2b|taboo)$/.test(pathname);
  const friendId=pathname==="/friend/live"?new URLSearchParams(search).get("id"):null;
  if(!game&&!(friendId&&/^[a-z0-9-]{1,32}$/.test(friendId)))return;
  try{localStorage.setItem("crew_home_last_activity_v1",JSON.stringify({path:pathname,friendId:friendId||undefined,at:Date.now()}))}catch{/* Optional navigation history. */}
 },[pathname,search]);const section=pathname.split("/")[1];const active:Product=section==="privacy"?"settings":section==="research"?"briefing":section==="guides"?"teacher":section==="timeline"?"teacher":section==="teacher"||section==="story"||section==="fortune"||section==="settings"||section==="briefing"?section:"home";return <><Suspense fallback={<div className="spa-loading" role="status">Loading…</div>}><Routes>
<Route path="/" element={<AppChrome product="home"><HomePage/></AppChrome>}/>
<Route path="/research" element={<AppChrome product="briefing"><BriefingPage/></AppChrome>}/>
<Route path="/research/board" element={<AppChrome product="briefing"><BriefingBoardPage/></AppChrome>}/>
<Route path="/research/:date/:id" element={<AppChrome product="briefing"><BriefingDetailPage/></AppChrome>}/>
{/* Keep old research bookmarks alive during the switch. */}
<Route path="/briefing" element={<Navigate to="/research" replace/>}/>
<Route path="/briefing/board" element={<Navigate to="/research/board" replace/>}/>
<Route path="/briefing/:date/:id" element={<BriefingLegacyRedirect/>}/>
<Route path="/settings" element={<AppChrome product="settings"><SettingsPage/></AppChrome>}/>
<Route path="/privacy" element={<AppChrome product="settings"><PrivacyPage/></AppChrome>}/>
<Route path="/guides/:slug" element={<AppChrome product="teacher"><GuidePage/></AppChrome>}/>
<Route path="/usage" element={<AppChrome product="briefing"><UsageDashboardPage/></AppChrome>}/>
<Route path="/teacher" element={<TeacherLayout/>}><Route index element={<PracticePage/>}/><Route path="practice" element={<PracticePage/>}/><Route path="shorts" element={<ShortsPage/>}/><Route path="friends" element={<Navigate to="/teacher/roles?mode=friends" replace/>}/><Route path="roles" element={<RolesPage/>}/><Route path="learn" element={<LearnPage/>}/><Route path="tutor" element={<Navigate to="/teacher/roles?mode=teacher" replace/>}/><Route path="me" element={<MyPage/>}/><Route path="vocabulary" element={<VocabularyPage/>}/><Route path="course" element={<CoursePage/>}/><Route path="pronunciation" element={<PronunciationPage/>}/><Route path="textbook" element={<TextbookPage/>}/><Route path="phrasebook" element={<PhrasebookPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="memory" element={<StudentMemoryPage/>}/><Route path="reading-library" element={<ReadingLibraryPage/>}/></Route>
<Route path="/games" element={<AppChrome product="home"><CrewPlayHubPage/></AppChrome>}/>
<Route path="/games/friend-gomoku" element={<AppChrome product="home"><FriendGomokuPage/></AppChrome>}/>
<Route path="/games/1a2b" element={<AppChrome product="home"><NumberGamePage/></AppChrome>}/>
<Route path="/games/taboo" element={<AppChrome product="home"><TabooGamePage/></AppChrome>}/>
<Route path="/games/:gameId" element={<AppChrome product="home"><CrewPlayGamePage/></AppChrome>}/>
<Route path="/timeline" element={<AppChrome product="teacher"><TimelinePage/></AppChrome>}/>
<Route path="/timeline/live" element={<TimelineLivePage/>}/>
<Route path="/teacher/voice-lab" element={<VoiceLabPage/>}/>
<Route path="/teacher/live" element={<TeacherLivePage/>}/><Route path="/friend/live" element={<FriendLivePage/>}/>
<Route path="/story" element={<StoryLayout/>}><Route index element={<StoryShelfPage/>}/><Route path="shelf" element={<StoryShelfPage/>}/><Route path="me" element={<StoryMyPage/>}/><Route path="create" element={<StoryCreatePage/>}/><Route path="edit/:id" element={<StoryEditorPage/>}/><Route path="physical" element={<PhysicalBookPage/>}/><Route path="physical/:id" element={<PhysicalBookPage/>}/><Route path="read/:id" element={<StoryReaderPage/>}/></Route>
<Route path="/story/live" element={<StoryLivePage/>}/>
<Route path="/fortune" element={<FortuneLayout/>}><Route index element={<FortuneHomePage/>}/><Route path="history" element={<FortuneHistoryPage/>}/><Route path="reading" element={<FortuneReadingPage/>}/></Route>
<Route path="/fortune/live" element={<FortuneLivePage/>}/>
<Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></Suspense>{!pathname.endsWith("/live")&&<GlobalNav active={active}/>}</>}
