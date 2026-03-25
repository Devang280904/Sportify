import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import CreateMatchPage from './pages/CreateMatchPage';
import LiveScoringPage from './pages/LiveScoringPage';
import MatchViewerPage from './pages/MatchViewerPage';
import MatchSummaryPage from './pages/MatchSummaryPage';
import PointsTablePage from './pages/PointsTablePage';
import FixturesPage from './pages/FixturesPage';
import ProfilePage from './pages/ProfilePage';
import RealCricketPage from './pages/RealCricketPage';
import GlobalMatchPage from './pages/GlobalMatchPage';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Routes */}
            <Route element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Tournament Routes */}
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournaments/:id" element={<TournamentDetailPage />} />

              {/* Team Routes */}
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/teams/:id" element={<TeamDetailPage />} />

              {/* Match Routes */}
              <Route path="/matches/create" element={<CreateMatchPage />} />
              <Route path="/match/:id" element={<MatchViewerPage />} />
              <Route path="/match/:id/view" element={<MatchViewerPage />} />
              <Route path="/match/:id/summary" element={<MatchSummaryPage />} />
              <Route path="/match/:id/score" element={<LiveScoringPage />} />

              {/* Viewer Routes */}
              <Route path="/live" element={<FixturesPage />} />
              <Route path="/fixtures" element={<FixturesPage />} />
              <Route path="/points" element={<PointsTablePage />} />
              <Route path="/global-cricket" element={<RealCricketPage />} />
              <Route path="/global-match/:id" element={<GlobalMatchPage />} />
              
              {/* Profile */}
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
