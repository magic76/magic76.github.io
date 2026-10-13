import{Navigate,Route,Routes,useLocation,useParams}from"react-router-dom";
import{GlobalNav,type Product}from"./components/AppChrome";
import {BuildVersion} from "./components/BuildVersion";
import{AppChrome}from"./components/AppChrome";
import{HomePage}from"./pages/HomePage";import{SettingsPage}from"./pages/SettingsPage";
import{TeacherLayout}from"./teacher/TeacherLayout";import{PracticePage}from"./teacher/PracticePage";import{LearnPage}from"./teacher/LearnPage";import{TutorPage}from"./teacher/TutorPage";import{MyPage}from"./teacher/MyPage";import{VocabularyPage}from"./teacher/VocabularyPage";import{CoursePage}from"./teacher/CoursePage";import{PronunciationPage}from"./teacher/PronunciationPage";import{TextbookPage}from"./teacher/TextbookPage";import{PhrasebookPage}from"./teacher/PhrasebookPage";import{ReportsPage}from"./teacher/ReportsPage";import{ReadingLibraryPage}from"./teacher/ReadingLibraryPage";import{TeacherLivePage}from"./teacher/LivePage";
import{StudentMemoryPage}from"./teacher/StudentMemoryPage";import{RolesPage}from"./teacher/RolesPage";
import{StoryLayout}from"./story/StoryLayout";import{StoryShelfPage}from"./story/ShelfPage";import{StoryMyPage}from"./story/MyPage";import{StoryCreatePage}from"./story/CreatePage";import{StoryReaderPage}from"./story/ReaderPage";import{StoryEditorPage}from"./story/EditorPage";import{PhysicalBookPage}from"./story/PhysicalBookPage";import{StoryLivePage}from"./story/LivePage";
import{FortuneLayout}from"./fortune/FortuneLayout";import{FortuneHomePage}from"./fortune/HomePage";import{FortuneHistoryPage}from"./fortune/HistoryPage";import{FortuneReadingPage}from"./fortune/ReadingPage";import{FortuneLivePage}from"./fortune/LivePage";
import {VoiceLabPage} from "./teacher/VoiceLabPage";
import {FriendsPage} from "./friends/FriendsPage";import {FriendLivePage} from "./friends/FriendLivePage";
import {BriefingPage} from "./briefing/BriefingPage";
import {BriefingDetailPage} from "./briefing/BriefingDetailPage";
import {BriefingBoardPage} from "./briefing/BriefingBoardPage";
function BriefingLegacyRedirect(){const {date="",id=""}=useParams();return <Navigate to={"/research/"+encodeURIComponent(date)+"/"+encodeURIComponent(id)} replace/>}
export function App(){const {pathname}=useLocation();const section=pathname.split("/")[1];const active:Product=section==="research"?"briefing":section==="teacher"||section==="story"||section==="fortune"||section==="settings"||section==="briefing"?section:"home";return <><Routes>
<Route path="/" element={<AppChrome product="home"><HomePage/></AppChrome>}/>
<Route path="/research" element={<AppChrome product="briefing"><BriefingPage/></AppChrome>}/>
<Route path="/research/board" element={<AppChrome product="briefing"><BriefingBoardPage/></AppChrome>}/>
<Route path="/research/:date/:id" element={<AppChrome product="briefing"><BriefingDetailPage/></AppChrome>}/>
{/* Keep old research bookmarks alive during the switch. */}
<Route path="/briefing" element={<Navigate to="/research" replace/>}/>
<Route path="/briefing/board" element={<Navigate to="/research/board" replace/>}/>
<Route path="/briefing/:date/:id" element={<BriefingLegacyRedirect/>}/>
<Route path="/settings" element={<AppChrome product="settings"><SettingsPage/></AppChrome>}/>
<Route path="/teacher" element={<TeacherLayout/>}><Route index element={<PracticePage/>}/><Route path="practice" element={<PracticePage/>}/><Route path="friends" element={<Navigate to="/teacher/roles?mode=friends" replace/>}/><Route path="roles" element={<RolesPage/>}/><Route path="learn" element={<LearnPage/>}/><Route path="tutor" element={<Navigate to="/teacher/roles?mode=teacher" replace/>}/><Route path="me" element={<MyPage/>}/><Route path="vocabulary" element={<VocabularyPage/>}/><Route path="course" element={<CoursePage/>}/><Route path="pronunciation" element={<PronunciationPage/>}/><Route path="textbook" element={<TextbookPage/>}/><Route path="phrasebook" element={<PhrasebookPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="memory" element={<StudentMemoryPage/>}/><Route path="reading-library" element={<ReadingLibraryPage/>}/></Route>
<Route path="/teacher/voice-lab" element={<VoiceLabPage/>}/>
<Route path="/teacher/live" element={<TeacherLivePage/>}/><Route path="/friend/live" element={<FriendLivePage/>}/>
<Route path="/story" element={<StoryLayout/>}><Route index element={<StoryShelfPage/>}/><Route path="shelf" element={<StoryShelfPage/>}/><Route path="me" element={<StoryMyPage/>}/><Route path="create" element={<StoryCreatePage/>}/><Route path="edit/:id" element={<StoryEditorPage/>}/><Route path="physical" element={<PhysicalBookPage/>}/><Route path="physical/:id" element={<PhysicalBookPage/>}/><Route path="read/:id" element={<StoryReaderPage/>}/></Route>
<Route path="/story/live" element={<StoryLivePage/>}/>
<Route path="/fortune" element={<FortuneLayout/>}><Route index element={<FortuneHomePage/>}/><Route path="history" element={<FortuneHistoryPage/>}/><Route path="reading" element={<FortuneReadingPage/>}/></Route>
<Route path="/fortune/live" element={<FortuneLivePage/>}/>
<Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>{!pathname.endsWith("/live")&&<GlobalNav active={active}/>}<BuildVersion/></>}
