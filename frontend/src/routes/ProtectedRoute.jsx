import { Navigate } from 'react-router-dom';
import Spinner from '../components/common/Spinner.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function ProtectedRoute({ role, section, children }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner label="Checking session…" />;
  if (!user) return <Navigate to="/login" replace />;
  // Admin can do anything — reaches every mentor/student route through the
  // exact same pages, no separate admin-only route tree needed.
  if (role && user.role !== role && user.role !== 'admin') return <Navigate to="/" replace />;
  // A logged-in mentor being denied one section — send them to their own
  // dashboard, not the unauthenticated bounce above.
  if (section && user.role === 'mentor' && user.restrictedSections?.includes(section)) {
    return <Navigate to="/dashboard/mentor" replace />;
  }

  return children;
}
