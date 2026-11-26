import {LearningMaterialGate} from "./teacher/LearningMaterialGate";
import{Navigate,Route,Routes,useLocation,useParams}from"react-router-dom";
import{useEffect,lazy,Suspense}from"react";
import{useTranslation}from"react-i18next";
import{uiLocaleFailedToLoad,loadUiNamespace,type RouteNamespace}from"./i18n";
// Route catalogs load with the route chunk so the page never renders raw keys.
const withNamespace=<T,>(namespaces:RouteNamespace|RouteNamespace[],module:Promise<T>)=>Promise.all([module,...[namespaces].flat().map(loadUiNamespace)]).then(([m])=>m as T);
import{trackAppOpen,trackPageView}from"./analytics/usage";
import{GlobalNav}from"./components/AppChrome";
import{KooloLoader}from"./components/KooloLoader";
import{sectionForRoute}from"./pages/crewNavigation";
import{RouteErrorBoundary}from"./components/RouteErrorBoundary";
import{OptionalWidgetBoundary}from"./components/OptionalWidgetBoundary";
import{GameRouteMonitor,GameRouteReady}from"./analytics/gameRouteDiagnostics";
import{AppChrome}from"./components/AppChrome";


const CrewUpdateNotice=lazy(()=>import("./components/CrewUpdateNotice").then(m=>({default:m.CrewUpdateNotice})));
const CrewInstallNudge=lazy(()=>import("./components/CrewInstallEntry").then(m=>({default:m.CrewInstallNudge})));
const PhoneLabPage=lazy(()=>import("./pages/PhoneLabPage").then(m=>({default:m.PhoneLabPage})));
const TruthNewsPage=lazy(()=>import("./games/TruthNewsPage").then(m=>({default:m.TruthNewsPage})));
const CyberOrbPage=lazy(()=>import("./pages/CyberOrbPage").then(m=>({default:m.CyberOrbPage})));

const FeedbackPage=lazy(()=>withNamespace("feedback",import("./pages/FeedbackPage")).then(m=>({default:m.FeedbackPage})));
const PurchaseInfoPage=lazy(()=>import("./pages/PurchaseSupportPage").then(m=>({default:m.PurchaseInfoPage})));const PurchaseOrdersPage=lazy(()=>import("./pages/PurchaseSupportPage").then(m=>({default:m.PurchaseOrdersPage})));
const PrivacyPage=lazy(()=>import("./pages/PrivacyPage").then(m=>({default:m.PrivacyPage})));const HomePage=lazy(()=>import("./pages/HomePage").then(m=>({default:m.HomePage})));const SettingsPage=lazy(()=>import("./pages/SettingsPage").then(m=>({default:m.SettingsPage})));
const TeacherFortunePage=lazy(()=>import("./teacher/TeacherFortunePage").then(m=>({default:m.TeacherFortunePage})));const TeacherLayout=lazy(()=>import("./teacher/TeacherLayout").then(m=>({default:m.TeacherLayout})));const PracticePage=lazy(()=>withNamespace("lesson",import("./teacher/PracticePage")).then(m=>({default:m.PracticePage})));const TutorPage=lazy(()=>import("./teacher/TutorPage").then(m=>({default:m.TutorPage})));const MyPage=lazy(()=>import("./teacher/MyPage").then(m=>({default:m.MyPage})));const VocabularyPage=lazy(()=>import("./teacher/VocabularyPage").then(m=>({default:m.VocabularyPage})));const CoursePage=lazy(()=>withNamespace("lesson",import("./teacher/CoursePage")).then(m=>({default:m.CoursePage})));const PronunciationPage=lazy(()=>withNamespace(["lesson","voice"],import("./teacher/PronunciationPage")).then(m=>({default:m.PronunciationPage})));const TextbookPage=lazy(()=>withNamespace(["lesson","voice"],import("./teacher/TextbookPage")).then(m=>({default:m.TextbookPage})));const PhrasebookPage=lazy(()=>import("./teacher/PhrasebookPage").then(m=>({default:m.PhrasebookPage})));const ReportsPage=lazy(()=>import("./teacher/ReportsPage").then(m=>({default:m.ReportsPage})));const ReadingLibraryPage=lazy(()=>import("./teacher/ReadingLibraryPage").then(m=>({default:m.ReadingLibraryPage})));const TeacherLivePage=lazy(()=>withNamespace(["lesson","voice"],import("./teacher/LivePage")).then(m=>({default:m.TeacherLivePage})));
const TeacherBoardPage=lazy(()=>withNamespace("voice",import("./teacher/TeacherBoardPage")).then(m=>({default:m.TeacherBoardPage})));
const StudentMemoryPage=lazy(()=>import("./teacher/StudentMemoryPage").then(m=>({default:m.StudentMemoryPage})));const RolesPage=lazy(()=>import("./teacher/RolesPage").then(m=>({default:m.RolesPage})));
const StoryLayout=lazy(()=>import("./story/StoryLayout").then(m=>({default:m.StoryLayout})));const StoryShelfPage=lazy(()=>import("./story/ShelfPage").then(m=>({default:m.StoryShelfPage})));const StoryMyPage=lazy(()=>import("./story/MyPage").then(m=>({default:m.StoryMyPage})));const StoryCreatePage=lazy(()=>import("./story/CreatePage").then(m=>({default:m.StoryCreatePage})));const StoryReaderPage=lazy(()=>import("./story/ReaderPage").then(m=>({default:m.StoryReaderPage})));const StoryEditorPage=lazy(()=>import("./story/EditorPage").then(m=>({default:m.StoryEditorPage})));const PhysicalBookPage=lazy(()=>import("./story/PhysicalBookPage").then(m=>({default:m.PhysicalBookPage})));const StoryLivePage=lazy(()=>withNamespace("voice",import("./story/LivePage")).then(m=>({default:m.StoryLivePage})));
const FortuneLayout=lazy(()=>import("./fortune/FortuneLayout").then(m=>({default:m.FortuneLayout})));const FortuneHomePage=lazy(()=>import("./fortune/HomePage").then(m=>({default:m.FortuneHomePage})));const FortuneHistoryPage=lazy(()=>import("./fortune/HistoryPage").then(m=>({default:m.FortuneHistoryPage})));const FortunePurchasedReportsPage=lazy(()=>import("./fortune/PurchasedReportsPage").then(m=>({default:m.FortunePurchasedReportsPage})));const FortuneEcpayStagePage=lazy(()=>import("./fortune/EcpayStagePage").then(m=>({default:m.FortuneEcpayStagePage})));const FortunePurchasedReportDetailPage=lazy(()=>import("./fortune/PurchasedReportsPage").then(m=>({default:m.FortunePurchasedReportDetailPage})));const FortunePremiumPage=lazy(()=>import("./fortune/FortunePremiumPage").then(m=>({default:m.FortunePremiumPage})));const FortuneReadingPage=lazy(()=>import("./fortune/ReadingPage").then(m=>({default:m.FortuneReadingPage})));const FortuneLivePage=lazy(()=>withNamespace("voice",import("./fortune/LivePage")).then(m=>({default:m.FortuneLivePage})));
const VoiceLabPage=lazy(()=>import("./teacher/VoiceLabPage").then(m=>({default:m.VoiceLabPage})));
const UsageDashboardPage=lazy(()=>import("./analytics/UsageDashboardPage").then(m=>({default:m.UsageDashboardPage})));
const FeedbackInboxPage=lazy(()=>import("./analytics/FeedbackInboxPage").then(m=>({default:m.FeedbackInboxPage})));
const AccountPage=lazy(()=>withNamespace("voice",import("./pages/AccountPage")).then(m=>({default:m.AccountPage})));const VoiceCreditsPage=lazy(()=>import("./pages/VoiceCreditsPage").then(m=>({default:m.VoiceCreditsPage})));
const TimelinePage=lazy(()=>import("./timeline/TimelinePage").then(m=>({default:m.TimelinePage})));


const TimelineComparePage=lazy(()=>import("./timeline/TimelineComparePage").then(m=>({default:m.TimelineComparePage})));
const TimelineLivePage=lazy(()=>withNamespace("voice",import("./timeline/TimelineLivePage")).then(m=>({default:m.TimelineLivePage})));
const FriendsPage=lazy(()=>import("./friends/FriendsPage").then(m=>({default:m.FriendsPage})));const FriendLivePage=lazy(()=>withNamespace("voice",import("./friends/FriendLivePage")).then(m=>({default:m.FriendLivePage})));const FriendGomokuPage=lazy(()=>withNamespace(["voice","games"],import("./games/FriendGomokuPage")).then(m=>({default:m.FriendGomokuPage})));
const CrewPlayHubPage=lazy(()=>import("./games/CrewPlayHubPage").then(m=>({default:m.CrewPlayHubPage})));
const CrewPlayGamePage=lazy(()=>withNamespace(["voice","games"],import("./games/CrewPlayGamePage")).then(m=>({default:m.CrewPlayGamePage})));
const NumberGamePage=lazy(()=>withNamespace(["games","voice"],import("./games/NumberGamePage")).then(m=>({default:m.NumberGamePage})));
const QuickPlayGamePage=lazy(()=>import("./games/QuickPlayGamePage").then(m=>({default:m.QuickPlayGamePage})));
const TabooGamePage=lazy(()=>withNamespace(["games","voice"],import("./games/TabooGamePage")).then(m=>({default:m.TabooGamePage})));
const CrazyCourtPage=lazy(()=>withNamespace("voice",import("./games/CrazyCourtPage")).then(m=>({default:m.CrazyCourtPage})));
const WerewolfPage=lazy(()=>import("./games/WerewolfPage").then(m=>({default:m.WerewolfPage})));
const NonsenseChampionshipPage=lazy(()=>import("./games/NonsenseLiveNewsPage").then(m=>({default:m.NonsenseLiveNewsPage})));
const BriefingPage=lazy(()=>import("./briefing/BriefingPage").then(m=>({default:m.BriefingPage})));
const BriefingDetailPage=lazy(()=>import("./briefing/BriefingDetailPage").then(m=>({default:m.BriefingDetailPage})));
const BriefingBoardPage=lazy(()=>import("./briefing/BriefingBoardPage").then(m=>({default:m.BriefingBoardPage})));
const ShortsProfilePage=lazy(()=>import("./teacher/ShortsProfilePage").then(m=>({default:m.ShortsProfilePage})));
const ShortsPage=lazy(()=>import("./teacher/ShortsPage").then(m=>({default:m.ShortsPage})));
const MatePage=lazy(()=>withNamespace("mate",import("./mate/MatePage")).then(m=>({default:m.MatePage})));
const CrewTownPage=lazy(()=>import("./town/Town3DPage").then(m=>({default:m.Town3DPage})));
const SandboxLab=lazy(()=>import("./sandbox/SandboxLab").then(m=>({default:m.SandboxLab})));
const SoulsPage=lazy(()=>withNamespace("voice",import("./souls/SoulsPage")).then(m=>({default:m.SoulsPage})));
const BooksPage=lazy(()=>import("./books/BooksPage"));
const OnboardingGate=lazy(()=>import("./onboarding/OnboardingGate").then(m=>({default:m.OnboardingGate})));
const LearningLanguageGate=lazy(()=>import("./onboarding/LearningLanguageGate").then(m=>({default:m.LearningLanguageGate})));
const CrewSectionPage=lazy(()=>withNamespace("lesson",import("./pages/CrewSectionPage")).then(m=>({default:m.CrewSectionPage})));
const GuidePage=lazy(()=>import("./guides/GuidePage").then(m=>({default:m.GuidePage})));
// zh-TW is the canonical *unprefixed* locale; old prefixed bookmarks still work.
function ZhTwCanonicalRedirect(){
 const {pathname,search,hash}=useLocation();
 const canonical=pathname.replace(/^\/zh-TW(?=\/|$)/,"")||"/";
 return <Navigate to={{pathname:canonical==="/play"?"/games":canonical,search,hash}} replace/>;
}
function BriefingLegacyRedirect(){const {date="",id=""}=useParams();return <Navigate to={"/research/"+encodeURIComponent(date)+"/"+encodeURIComponent(id)} replace/>}
export function App(){const {t}=useTranslation("common");useEffect(()=>{trackAppOpen()},[]);const {pathname,search}=useLocation();useEffect(()=>{trackPageView(pathname)},[pathname]);
 useEffect(()=>{
  // Remember the last opened play/friend destination locally; never persist speech or messages.
  const game=/^\/games\/(friend-gomoku|connect4|twenty-questions|reversi|mystery|1a2b|number-bomb|memory|taboo|crazy-court|werewolf)$/.test(pathname);
  const friendId=pathname==="/friend/live"?new URLSearchParams(search).get("id"):null;
  if(!game&&!(friendId&&/^[a-z0-9-]{1,32}$/.test(friendId)))return;
  try{localStorage.setItem("crew_home_last_activity_v1",JSON.stringify({path:pathname,friendId:friendId||undefined,at:Date.now()}))}catch{/* Optional navigation history. */}
 },[pathname,search]);const active=sectionForRoute(pathname,search);return <>{uiLocaleFailedToLoad&&<div className="crew-locale-error" role="alert">{t("language.loadError")}</div>}<RouteErrorBoundary key={pathname}><GameRouteMonitor pathname={pathname}><Suspense fallback={<KooloLoader label={t("loading")}/>}><Routes>
<Route path="/" element={<AppChrome product="home"><HomePage/></AppChrome>}/>
<Route path="/phone" element={<PhoneLabPage/>}/>
<Route path="/chat" element={<AppChrome product="home"><CrewSectionPage section="chat"/></AppChrome>}/>
<Route path="/explore" element={<AppChrome product="home"><CrewSectionPage section="explore"/></AppChrome>}/>
<Route path="/discover" element={<Navigate to="/explore" replace/>}/>
 <Route path="/mate" element={<AppChrome product="home"><MatePage/></AppChrome>}/>
<Route path="/town" element={<AppChrome product="home"><CrewTownPage/></AppChrome>}/>
<Route path="/magic" element={<Navigate to="/explore" replace/>}/>
 <Route path="/souls" element={<AppChrome product="home"><SoulsPage/></AppChrome>}/>
<Route path="/learn" element={<AppChrome product="teacher"><CrewSectionPage section="learn"/></AppChrome>}/>
<Route path="/me" element={<AppChrome product="settings"><CrewSectionPage section="me"/></AppChrome>}/>
<Route path="/research" element={<AppChrome product="briefing"><BriefingPage/></AppChrome>}/>
<Route path="/research/board" element={<AppChrome product="briefing"><BriefingBoardPage/></AppChrome>}/>
<Route path="/research/:date/:id" element={<AppChrome product="briefing"><BriefingDetailPage/></AppChrome>}/>
{/* Keep old research bookmarks alive during the switch. */}
<Route path="/briefing" element={<Navigate to="/research" replace/>}/>
<Route path="/briefing/board" element={<Navigate to="/research/board" replace/>}/>
<Route path="/briefing/:date/:id" element={<BriefingLegacyRedirect/>}/>
<Route path="/orb" element={<AppChrome product="home"><CyberOrbPage/></AppChrome>}/>
<Route path="/try" element={<Navigate to="/teacher/roles?mode=teacher" replace/>}/>
<Route path="/settings" element={<AppChrome product="settings"><SettingsPage/></AppChrome>}/>
<Route path="/account" element={<AppChrome product="settings"><AccountPage/></AppChrome>}/>
<Route path="/me/voice-credits" element={<AppChrome product="settings"><VoiceCreditsPage/></AppChrome>}/>
<Route path="/feedback" element={<AppChrome product="settings"><FeedbackPage/></AppChrome>}/>
<Route path="/purchase-info" element={<AppChrome product="settings"><PurchaseInfoPage/></AppChrome>}/>
<Route path="/me/orders" element={<AppChrome product="settings"><PurchaseOrdersPage/></AppChrome>}/>
<Route path="/privacy" element={<AppChrome product="settings"><PrivacyPage/></AppChrome>}/>
<Route path="/guides/:slug" element={<AppChrome product="teacher"><GuidePage/></AppChrome>}/>
<Route path="/sandbox-lab" element={<AppChrome product="briefing"><SandboxLab/></AppChrome>}/>
<Route path="/usage" element={<AppChrome product="briefing"><UsageDashboardPage/></AppChrome>}/>
<Route path="/usage/feedback" element={<AppChrome product="briefing"><FeedbackInboxPage/></AppChrome>}/>
<Route path="/teacher" element={<TeacherLayout/>}><Route index element={<PracticePage/>}/><Route path="practice" element={<PracticePage/>}/><Route path="fortune" element={<TeacherFortunePage/>}/><Route path="shorts" element={<ShortsPage/>}/><Route path="shorts/:friendId" element={<ShortsProfilePage/>}/><Route path="friends" element={<Navigate to="/teacher/roles?mode=friends" replace/>}/><Route path="roles" element={<RolesPage/>}/><Route path="learn" element={<Navigate to="/learn" replace/>}/><Route path="tutor" element={<Navigate to="/teacher/roles?mode=teacher" replace/>}/><Route path="me" element={<MyPage/>}/><Route path="vocabulary" element={<LearningMaterialGate material="vocabulary"><VocabularyPage/></LearningMaterialGate>}/><Route path="course" element={<CoursePage/>}/><Route path="course/:slug" element={<CoursePage/>}/><Route path="pronunciation" element={<PronunciationPage/>}/><Route path="textbook" element={<TextbookPage/>}/><Route path="phrasebook" element={<LearningMaterialGate material="phrasebook"><PhrasebookPage/></LearningMaterialGate>}/><Route path="reports" element={<ReportsPage/>}/><Route path="memory" element={<StudentMemoryPage/>}/><Route path="reading-library" element={<ReadingLibraryPage/>}/></Route>
<Route path="/circle" element={<BooksPage/>}/>
<Route path="/play" element={<Navigate to="/games" replace/>}/>
<Route path="/games" element={<AppChrome product="home"><GameRouteReady/><CrewPlayHubPage/></AppChrome>}/>
<Route path="/games/friend-gomoku" element={<AppChrome product="home"><GameRouteReady/><FriendGomokuPage/></AppChrome>}/>
<Route path="/games/gomoku" element={<Navigate to="/games/friend-gomoku" replace/>}/>
<Route path="/games/1a2b" element={<AppChrome product="home"><GameRouteReady/><NumberGamePage/></AppChrome>}/>
<Route path="/games/number-bomb" element={<AppChrome product="home"><GameRouteReady/><QuickPlayGamePage kind="number-bomb"/></AppChrome>}/>
<Route path="/games/memory" element={<AppChrome product="home"><GameRouteReady/><QuickPlayGamePage kind="memory"/></AppChrome>}/>
<Route path="/games/taboo" element={<AppChrome product="home"><GameRouteReady/><TabooGamePage/></AppChrome>}/>
<Route path="/games/crazy-court" element={<AppChrome product="home"><GameRouteReady/><CrazyCourtPage/></AppChrome>}/>
<Route path="/games/werewolf" element={<AppChrome product="home"><GameRouteReady/><WerewolfPage/></AppChrome>}/>
<Route path="/games/truth-news" element={<AppChrome product="home"><GameRouteReady/><TruthNewsPage/></AppChrome>}/>
 <Route path="/games/nonsense" element={<AppChrome product="home"><GameRouteReady/><NonsenseChampionshipPage/></AppChrome>}/>
<Route path="/games/:gameId" element={<AppChrome product="home"><GameRouteReady/><CrewPlayGamePage/></AppChrome>}/>
<Route path="/timeline" element={<AppChrome product="teacher"><TimelinePage/></AppChrome>}/>
<Route path="/timeline/simulate" element={<Navigate to="/games" replace/>}/>
<Route path="/timeline/observe" element={<Navigate to="/games" replace/>}/>
<Route path="/timeline/observe/classic" element={<Navigate to="/games" replace/>}/>
 <Route path="/timeline/compare" element={<AppChrome product="teacher"><TimelineComparePage/></AppChrome>}/>
<Route path="/timeline/live" element={<TimelineLivePage/>}/>
<Route path="/teacher/voice-lab" element={<VoiceLabPage/>}/>
<Route path="/teacher/board" element={<TeacherBoardPage/>}/>
<Route path="/teacher/live" element={<TeacherLivePage/>}/><Route path="/friend/live" element={<FriendLivePage/>}/>
<Route path="/story" element={<StoryLayout/>}><Route index element={<StoryShelfPage/>}/><Route path="shelf" element={<StoryShelfPage/>}/><Route path="me" element={<StoryMyPage/>}/><Route path="create" element={<StoryCreatePage/>}/><Route path="edit/:id" element={<StoryEditorPage/>}/><Route path="physical" element={<PhysicalBookPage/>}/><Route path="physical/:id" element={<PhysicalBookPage/>}/><Route path="read/:id" element={<StoryReaderPage/>}/></Route>
<Route path="/story/live" element={<StoryLivePage/>}/>
<Route path="/fortune" element={<FortuneLayout/>}><Route index element={<FortuneHomePage/>}/><Route path="history" element={<FortuneHistoryPage/>}/><Route path="purchases" element={<FortunePurchasedReportsPage/>}/><Route path="ecpay/test" element={<FortuneEcpayStagePage/>}/><Route path="purchases/:reportId" element={<FortunePurchasedReportDetailPage/>}/><Route path="reading" element={<FortuneReadingPage/>}/><Route path="premium" element={<FortunePremiumPage/>}/></Route>
<Route path="/fortune/live" element={<FortuneLivePage/>}/>
<Route path="/zh-TW/*" element={<ZhTwCanonicalRedirect/>}/>
<Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></Suspense></GameRouteMonitor></RouteErrorBoundary>{!pathname.endsWith("/live")&&pathname!=="/teacher/board"&&pathname!=="/phone"&&<GlobalNav active={active} mobileImmersive={false}/>}{(pathname==="/"||pathname==="/settings")&&<OptionalWidgetBoundary><Suspense fallback={null}><OnboardingGate pathname={pathname}/></Suspense></OptionalWidgetBoundary>}{(pathname==="/learn"||pathname==="/teacher"||pathname==="/teacher/practice")&&<OptionalWidgetBoundary><Suspense fallback={null}><LearningLanguageGate pathname={pathname}/></Suspense></OptionalWidgetBoundary>}<OptionalWidgetBoundary><Suspense fallback={null}><CrewUpdateNotice pathname={pathname}/></Suspense></OptionalWidgetBoundary>{pathname==="/"&&<OptionalWidgetBoundary><Suspense fallback={null}><CrewInstallNudge/></Suspense></OptionalWidgetBoundary>}</>}
