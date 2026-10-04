import{Navigate,Route,Routes}from"react-router-dom";
import{AppChrome}from"./components/AppChrome";
import{HomePage}from"./pages/HomePage";import{SettingsPage}from"./pages/SettingsPage";
import{TeacherLayout}from"./teacher/TeacherLayout";import{PracticePage}from"./teacher/PracticePage";import{LearnPage}from"./teacher/LearnPage";import{TutorPage}from"./teacher/TutorPage";import{MyPage}from"./teacher/MyPage";import{VocabularyPage}from"./teacher/VocabularyPage";import{CoursePage}from"./teacher/CoursePage";import{PronunciationPage}from"./teacher/PronunciationPage";import{TextbookPage}from"./teacher/TextbookPage";import{TeacherLivePage}from"./teacher/LivePage";
import{StoryLayout}from"./story/StoryLayout";import{StoryShelfPage}from"./story/ShelfPage";import{StoryCreatePage}from"./story/CreatePage";import{StoryReaderPage}from"./story/ReaderPage";import{StoryEditorPage}from"./story/EditorPage";import{PhysicalBookPage}from"./story/PhysicalBookPage";import{StoryLivePage}from"./story/LivePage";
import{FortuneLayout}from"./fortune/FortuneLayout";import{FortuneHomePage}from"./fortune/HomePage";import{FortuneHistoryPage}from"./fortune/HistoryPage";import{FortuneReadingPage}from"./fortune/ReadingPage";import{FortuneLivePage}from"./fortune/LivePage";
export function App(){return <Routes>
<Route path="/" element={<AppChrome product="home"><HomePage/></AppChrome>}/>
<Route path="/settings" element={<AppChrome product="settings"><SettingsPage/></AppChrome>}/>
<Route path="/teacher" element={<TeacherLayout/>}><Route index element={<Navigate to="/teacher/practice" replace/>}/><Route path="practice" element={<PracticePage/>}/><Route path="learn" element={<LearnPage/>}/><Route path="tutor" element={<TutorPage/>}/><Route path="me" element={<MyPage/>}/><Route path="vocabulary" element={<VocabularyPage/>}/><Route path="course" element={<CoursePage/>}/><Route path="pronunciation" element={<PronunciationPage/>}/><Route path="textbook" element={<TextbookPage/>}/></Route>
<Route path="/teacher/live" element={<TeacherLivePage/>}/>
<Route path="/story" element={<StoryLayout/>}><Route index element={<Navigate to="/story/shelf" replace/>}/><Route path="shelf" element={<StoryShelfPage/>}/><Route path="create" element={<StoryCreatePage/>}/><Route path="edit/:id" element={<StoryEditorPage/>}/><Route path="physical" element={<PhysicalBookPage/>}/><Route path="physical/:id" element={<PhysicalBookPage/>}/><Route path="read/:id" element={<StoryReaderPage/>}/></Route>
<Route path="/story/live" element={<StoryLivePage/>}/>
<Route path="/fortune" element={<FortuneLayout/>}><Route index element={<FortuneHomePage/>}/><Route path="history" element={<FortuneHistoryPage/>}/><Route path="reading" element={<FortuneReadingPage/>}/></Route>
<Route path="/fortune/live" element={<FortuneLivePage/>}/>
<Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>}
