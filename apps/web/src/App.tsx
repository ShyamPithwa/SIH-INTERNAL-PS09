import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, ReactNode } from 'react';
import supabase from './lib/supabase';
import ConfigurationPage from './pages/ConfigurationPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';

// ProtectedRoute: redirects to /login if there is no active Supabase session
function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      setChecking(false);
    });

    // Listen for auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    // Minimal loading state while we verify the session
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-4xl animate-pulse">🔋</div>
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        {/* Redirect root to /login; LoginPage auto-redirects to /dashboard if authed */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected routes — require an active Supabase session */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/bess/new" element={<ProtectedRoute><ConfigurationPage /></ProtectedRoute>} />
        <Route path="/bess/:id/configuration" element={<ProtectedRoute><ConfigurationPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
