import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// Admin uses the exact same mentor-facing pages/dashboard (see
// ProtectedRoute's role bypass) — anywhere the UI branches on "is this a
// mentor" for routing/rendering purposes, admin needs to land in the same
// branch, or they'd get routed at the student experience instead.
export function isMentorRole(role) {
  return role === 'mentor' || role === 'admin';
}
