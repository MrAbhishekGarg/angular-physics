import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home.jsx';
import Courses from '../pages/Courses.jsx';
import CourseDetail from '../pages/CourseDetail.jsx';
import Videos from '../pages/Videos.jsx';
import Blog from '../pages/Blog.jsx';
import ArticleDetail from '../pages/ArticleDetail.jsx';
import Mentor from '../pages/Mentor.jsx';
import About from '../pages/About.jsx';
import Contact from '../pages/Contact.jsx';
import Login from '../pages/Login.jsx';
import Signup from '../pages/Signup.jsx';
import StudentDashboard from '../pages/dashboard/StudentDashboard.jsx';
import MentorDashboard from '../pages/dashboard/MentorDashboard.jsx';
import CourseEditor from '../pages/dashboard/CourseEditor.jsx';
import NotesManager from '../pages/dashboard/NotesManager.jsx';
import NotesLibrary from '../pages/dashboard/NotesLibrary.jsx';
import CourseLearn from '../pages/dashboard/CourseLearn.jsx';
import TestManager from '../pages/dashboard/TestManager.jsx';
import TestEditor from '../pages/dashboard/TestEditor.jsx';
import TestResults from '../pages/dashboard/TestResults.jsx';
import TestsLibrary from '../pages/dashboard/TestsLibrary.jsx';
import TestHistory from '../pages/dashboard/TestHistory.jsx';
import TestAttempt from '../pages/dashboard/TestAttempt.jsx';
import TestResult from '../pages/dashboard/TestResult.jsx';
import QuestionBank from '../pages/dashboard/QuestionBank.jsx';
import ConceptCodes from '../pages/dashboard/ConceptCodes.jsx';
import WorksheetManager from '../pages/dashboard/WorksheetManager.jsx';
import WorksheetsLibrary from '../pages/dashboard/WorksheetsLibrary.jsx';
import ArticleManager from '../pages/dashboard/ArticleManager.jsx';
import ToppersManager from '../pages/dashboard/ToppersManager.jsx';
import TestimonialManager from '../pages/dashboard/TestimonialManager.jsx';
import VideoLibraryManager from '../pages/dashboard/VideoLibraryManager.jsx';
import AdminMentors from '../pages/dashboard/AdminMentors.jsx';
import AdminStudents from '../pages/dashboard/AdminStudents.jsx';
import AllStudents from '../pages/dashboard/AllStudents.jsx';
import Enquiries from '../pages/dashboard/Enquiries.jsx';
import StudentDetail from '../pages/dashboard/StudentDetail.jsx';
import DoubtsManager from '../pages/dashboard/DoubtsManager.jsx';
import DoubtsPanel from '../pages/dashboard/DoubtsPanel.jsx';
import PracticeGenerator from '../pages/dashboard/PracticeGenerator.jsx';
import NotFound from '../pages/NotFound.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/:slug" element={<CourseDetail />} />
      <Route path="/videos" element={<Videos />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<ArticleDetail />} />
      <Route path="/mentor" element={<Mentor />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard/student"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor"
        element={
          <ProtectedRoute role="mentor">
            <MentorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/courses/new"
        element={
          <ProtectedRoute role="mentor">
            <CourseEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/courses/:id/edit"
        element={
          <ProtectedRoute role="mentor">
            <CourseEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/notes"
        element={
          <ProtectedRoute role="mentor">
            <NotesManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/tests"
        element={
          <ProtectedRoute role="mentor">
            <TestManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/tests/new"
        element={
          <ProtectedRoute role="mentor">
            <TestEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/tests/:id/edit"
        element={
          <ProtectedRoute role="mentor">
            <TestEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/tests/:id/results"
        element={
          <ProtectedRoute role="mentor">
            <TestResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/tests/attempts/:attemptId/result"
        element={
          <ProtectedRoute role="mentor">
            <TestResult />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/questions"
        element={
          <ProtectedRoute role="mentor">
            <QuestionBank />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/concept-codes"
        element={
          <ProtectedRoute role="mentor">
            <ConceptCodes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/worksheets"
        element={
          <ProtectedRoute role="mentor">
            <WorksheetManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/articles"
        element={
          <ProtectedRoute role="mentor">
            <ArticleManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/toppers"
        element={
          <ProtectedRoute role="mentor">
            <ToppersManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/testimonials"
        element={
          <ProtectedRoute role="mentor">
            <TestimonialManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/videos"
        element={
          <ProtectedRoute role="mentor">
            <VideoLibraryManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/admin/mentors"
        element={
          <ProtectedRoute role="admin">
            <AdminMentors />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/admin/students"
        element={
          <ProtectedRoute role="admin">
            <AdminStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/enquiries"
        element={
          <ProtectedRoute role="mentor">
            <Enquiries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/students"
        element={
          <ProtectedRoute role="mentor">
            <AllStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/students/:studentId"
        element={
          <ProtectedRoute role="mentor">
            <StudentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mentor/doubts"
        element={
          <ProtectedRoute role="mentor">
            <DoubtsManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/student/notes"
        element={
          <ProtectedRoute role="student">
            <NotesLibrary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/student/courses/:courseId/learn"
        element={
          <ProtectedRoute role="student">
            <CourseLearn />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/student/tests"
        element={
          <ProtectedRoute role="student">
            <TestsLibrary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/student/worksheets"
        element={
          <ProtectedRoute role="student">
            <WorksheetsLibrary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/student/tests/history"
        element={
          <ProtectedRoute role="student">
            <TestHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/student/tests/attempts/:attemptId/result"
        element={
          <ProtectedRoute role="student">
            <TestResult />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/student/tests/:id"
        element={
          <ProtectedRoute role="student">
            <TestAttempt />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/student/practice"
        element={
          <ProtectedRoute role="student">
            <PracticeGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/student/doubts"
        element={
          <ProtectedRoute role="student">
            <DoubtsPanel />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
