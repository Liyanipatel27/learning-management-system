import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import RequestAccount from './pages/RequestAccount';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';
import LiveClassroom from './pages/LiveClassroom';
import ProtectedRoute from './components/ProtectedRoute';
import StudentAIHub from './pages/StudentAIHub';
import { ChatProvider } from './context/ChatContext';

function App() {
  return (
    <ChatProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/request-account" element={<RequestAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-hub"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentAIHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher-dashboard"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-class/:roomId"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher']}>
                <LiveClassroom />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ChatProvider>
  );
}

export default App;
