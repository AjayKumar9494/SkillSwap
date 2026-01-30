import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { PrivateRoute } from "./components/PrivateRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import SkillsPage from "./pages/SkillsPage";
import SkillDetailsPage from "./pages/SkillDetailsPage";
import SkillFormPage from "./pages/SkillFormPage";
import BookingsPage from "./pages/BookingsPage";
import RatingsPage from "./pages/RatingsPage";
import TransactionsPage from "./pages/TransactionsPage";
import PreferencesPage from "./pages/PreferencesPage";
import ProfilePage from "./pages/ProfilePage";
import VideoCallPage from "./pages/VideoCallPage";
import NotificationsPage from "./pages/NotificationsPage";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route path="/skills" element={<SkillsPage />} />
            <Route
              path="/skills/new"
              element={
                <PrivateRoute>
                  <SkillFormPage />
                </PrivateRoute>
              }
            />
            <Route path="/skills/:id" element={<SkillDetailsPage />} />
            <Route
              path="/skills/:id/edit"
              element={
                <PrivateRoute>
                  <SkillFormPage editMode />
                </PrivateRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <PrivateRoute>
                  <BookingsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/ratings"
              element={
                <PrivateRoute>
                  <RatingsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/credits"
              element={
                <PrivateRoute>
                  <TransactionsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/preferences"
              element={
                <PrivateRoute>
                  <PreferencesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/video-call/:bookingId"
              element={
                <PrivateRoute>
                  <VideoCallPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <NotificationsPage />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
