import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/* ── helper: JSON fetch with auth header ── */
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('bioguard-jwt');
  const res   = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── Restore session on mount ── */
  useEffect(() => {
    const token = localStorage.getItem('bioguard-jwt');
    if (!token) { setLoading(false); return; }
    apiFetch('/api/auth/me')
      .then(data => setUser(data.user))
      .catch(() => localStorage.removeItem('bioguard-jwt'))
      .finally(() => setLoading(false));
  }, []);

  /* ── Sign Up ── */
  const signUp = async (form) => {
    try {
      const data = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body:   JSON.stringify(form),
      });
      localStorage.setItem('bioguard-jwt', data.token);
      setUser(data.user);         // user.role is returned here
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  /* ── Sign In with Google ── */
  const signInWithGoogle = async (credential) => {
    try {
      const data = await apiFetch('/api/auth/google', {
        method: 'POST',
        body:   JSON.stringify({ credential }),
      });
      localStorage.setItem('bioguard-jwt', data.token);
      setUser(data.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  /* ── Sign In ── */
  const signIn = async (email, password) => {
    try {
      const data = await apiFetch('/api/auth/signin', {
        method: 'POST',
        body:   JSON.stringify({ email, password }),
      });
      localStorage.setItem('bioguard-jwt', data.token);
      setUser(data.user);         // user.role included
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  /* ── Sign Out ── */
  const signOut = () => {
    localStorage.removeItem('bioguard-jwt');
    setUser(null);
  };

  /* ── Update profile ── */
  const updateProfile = async (updates) => {
    try {
      const data = await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body:   JSON.stringify(updates),
      });
      setUser(prev => ({ ...prev, ...data.user }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  /* ── Role helpers ── */
  const isAdmin      = user?.role === 'admin';
  const isAshaWorker = ['admin', 'asha_worker'].includes(user?.role);
  const isUser       = user?.role === 'user';

  /* ── Recent activity (mock enriched with role context) ── */
  const recentActivity = [
    { type: 'login',  text: `Signed in as ${user?.role || 'user'}`, time: 'Just now' },
    { type: 'alert',  text: 'New alert in Kaziranga NP',            time: '2 min ago' },
    { type: 'report', text: 'Incident report submitted',             time: '1 hr ago'  },
  ];

  return (
    <AuthContext.Provider value={{
      user: user ? {
        ...user,
        recentActivity,
        joinedVia: user.joinedVia || 'email',
        avatar: user.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.email}`,
      } : null,
      loading,
      signUp, signIn, signInWithGoogle, signOut, updateProfile,
      isAdmin, isAshaWorker, isUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) return {
    user: null, loading: false,
    signUp: () => {}, signIn: () => {}, signOut: () => {}, updateProfile: () => {},
    isAdmin: false, isAshaWorker: false, isUser: true,
  };
  return ctx;
};
