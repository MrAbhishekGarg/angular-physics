import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home.jsx';
import Courses from '../pages/Courses.jsx';
import CourseDetail from '../pages/CourseDetail.jsx';
import Mentor from '../pages/Mentor.jsx';
import About from '../pages/About.jsx';
import Contact from '../pages/Contact.jsx';
import Login from '../pages/Login.jsx';
import Signup from '../pages/Signup.jsx';
import StudentDashboard from '../pages/dashboard/StudentDashboard.jsx';
import MentorDashboard from '../pages/dashboard/MentorDashboard.jsx';
import CourseEditor from '../pages/dashboard/CourseEditor.jsx';
import NotFound from '../pages/NotFound.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/:slug" element={<CourseDetail />} />
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
