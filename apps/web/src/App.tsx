import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import InvitePartner from './pages/InvitePartner';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import ConflictTracker from './pages/ConflictTracker';
import DeEscalate from './pages/DeEscalate';
import MessageRewrite from './pages/MessageRewrite';
import RepairTools from './pages/RepairTools';
import BiometricConnect from './pages/BiometricConnect';
import OuraConnect from './pages/OuraConnect';
import Insights from './pages/Insights';
import AICoach from './pages/AICoach';
import Messages from './pages/Messages';
import Crisis from './pages/Crisis';
import Rituals from './pages/Rituals';
import Therapists from './pages/Therapists';
import Workbook from './pages/Workbook';
import JoinCouple from './pages/JoinCouple';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Wellness from './pages/Wellness';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/join/:code" element={<JoinCouple />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invite-partner"
            element={
              <ProtectedRoute>
                <InvitePartner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/check-in"
            element={
              <ProtectedRoute>
                <CheckIn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conflict-tracker"
            element={
              <ProtectedRoute>
                <ConflictTracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/de-escalate"
            element={
              <ProtectedRoute>
                <DeEscalate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/message-rewrite"
            element={
              <ProtectedRoute>
                <MessageRewrite />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repair"
            element={
              <ProtectedRoute>
                <RepairTools />
              </ProtectedRoute>
            }
          />
          <Route
            path="/biometric"
            element={
              <ProtectedRoute>
                <BiometricConnect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/oura"
            element={
              <ProtectedRoute>
                <OuraConnect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <Insights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-coach"
            element={
              <ProtectedRoute>
                <AICoach />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crisis"
            element={
              <ProtectedRoute>
                <Crisis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rituals"
            element={
              <ProtectedRoute>
                <Rituals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/therapists"
            element={
              <ProtectedRoute>
                <Therapists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workbook"
            element={
              <ProtectedRoute>
                <Workbook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wellness"
            element={
              <ProtectedRoute>
                <Wellness />
              </ProtectedRoute>
            }
          />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
