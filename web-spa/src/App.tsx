import{Navigate,Route,Routes,useLocation}from"react-router-dom";
import{GlobalNav,type Product}from"./components/AppChrome";
import{AppChrome}from"./components/AppChrome";
import{HomePage}from"./pages/HomePage";import{SettingsPage}from"./pages/SettingsPage";
import{TeacherLayout}from"./teacher/TeacherLayout";import{PracticePage}from"./teacher/PracticePage";import{LearnPage}from"./teacher/LearnPage";import{TutorPage}from"./teacher/TutorPage";import{MyPage}from"./teacher/MyPage";import{VocabularyPage}from"./teacher/VocabularyPage";import{CoursePage}from"./teacher/CoursePage";import{PronunciationPage}from"./teacher/PronunciationPage";import{TextbookPage}from"./teacher/TextbookPage";import{PhrasebookPage}from"./teacher/PhrasebookPage";import{ReportsPage}from"./teacher/ReportsPage";import{ReadingLibraryPage}from"./teacher/ReadingLibraryPage";import{TeacherLivePage}from"./teacher/LivePage";
import{StudentMemoryPage}from"./teacher/StudentMemoryPage";
import{StoryLayout}from"./story/StoryLayout";import{StoryShelfPage}from"./story/ShelfPage";import{StoryMyPage}from"./story/MyPage";import{StoryCreatePage}from"./story/CreatePage";import{StoryReaderPage}from"./story/ReaderPage";import{StoryEditorPage}from"./story/EditorPage";import{PhysicalBookPage}from"./story/PhysicalBookPage";import{StoryLivePage}from"./story/LivePage";
import{FortuneLayout}from"./fortune/FortuneLayout";import{FortuneHomePage}from"./fortune/HomePage";import{FortuneHistoryPage}from"./fortune/HistoryPage";import{FortuneReadingPage}from"./fortune/ReadingPage";import{FortuneLivePage}from"./fortune/LivePage";
export function App(){const {pathname}=useLocation();const section=pathname.split("/")[1];const active:Product=section==="teacher"||section==="story"||section==="fortune"||section==="settings"?section:"home";return <><Routes>
<Route path="/" element={<AppChrome product="home"><HomePage/></AppChrome>}/>
<Route path="/settings" element={<AppChrome product="settings"><SettingsPage/></AppChrome>}/>
<Route path="/teacher" element={<TeacherLayout/>}><Route index element={<Navigate to="/teacher/practice" replace/>}/><Route path="practice" element={<PracticePage/>}/><Route path="learn" element={<LearnPage/>}/><Route path="tutor" element={<TutorPage/>}/><Route path="me" element={<MyPage/>}/><Route path="vocabulary" element={<VocabularyPage/>}/><Route path="course" element={<CoursePage/>}/><Route path="pronunciation" element={<PronunciationPage/>}/><Route path="textbook" element={<TextbookPage/>}/><Route path="phrasebook" element={<PhrasebookPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="memory" element={<StudentMemoryPage/>}/><Route path="reading-library" element={<ReadingLibraryPage/>}/></Route>
<Route path="/teacher/live" element={<TeacherLivePage/>}/>
<Route path="/story" element={<StoryLayout/>}><Route index element={<Navigate to="/story/shelf" replace/>}/><Route path="shelf" element={<StoryShelfPage/>}/><Route path="me" element={<StoryMyPage/>}/><Route path="create" element={<StoryCreatePage/>}/><Route path="edit/:id" element={<StoryEditorPage/>}/><Route path="physical" element={<PhysicalBookPage/>}/><Route path="physical/:id" element={<PhysicalBookPage/>}/><Route path="read/:id" element={<StoryReaderPage/>}/></Route>
<Route path="/story/live" element={<StoryLivePage/>}/>
<Route path="/fortune" element={<FortuneLayout/>}><Route index element={<FortuneHomePage/>}/><Route path="history" element={<FortuneHistoryPage/>}/><Route path="reading" element={<FortuneReadingPage/>}/></Route>
<Route path="/fortune/live" element={<FortuneLivePage/>}/>
<Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>{!pathname.endsWith("/live")&&<GlobalNav active={active}/>}</>}
