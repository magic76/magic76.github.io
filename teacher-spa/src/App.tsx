import { Navigate, Route, Routes } from "react-router-dom";
import { TeacherShell } from "./components/TeacherShell";
import { PracticePage } from "./pages/PracticePage";
import { LearnPage } from "./pages/LearnPage";
import { TutorPage } from "./pages/TutorPage";
import { MyPage } from "./pages/MyPage";
import { LivePage } from "./pages/LivePage";

export function App() {
  return (
    <Routes>
      <Route element={<TeacherShell />}>
        <Route index element={<Navigate to="/practice" replace />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/tutor" element={<TutorPage />} />
        <Route path="/me" element={<MyPage />} />
      </Route>
      <Route path="/live" element={<LivePage />} />
      <Route path="*" element={<Navigate to="/practice" replace />} />
    </Routes>
  );
}
