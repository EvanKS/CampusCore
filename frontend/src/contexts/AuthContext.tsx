'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { API_URL } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  phone?: string;
  avatar_url?: string;
  theme_preference: 'light' | 'dark' | 'system';
  notification_prefs: { in_app: boolean; whatsapp: boolean; email: boolean };
  institution_id: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string, opts?: { role?: string; institutionSlug?: string }) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  institutionSlug: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================================
// Demo users — work with NO backend, NO database, NO keys
// Used when the backend is unreachable (NEXT_PUBLIC_API_URL offline)
// ============================================================
const DEMO_USERS: Record<string, User> = {
  'rahul.verma@demo-university.edu': {
    id: 'demo-student-1',
    email: 'rahul.verma@demo-university.edu',
    full_name: 'Rahul Verma',
    role: 'student',
    phone: '+919876543211',
    theme_preference: 'system',
    notification_prefs: { in_app: true, whatsapp: true, email: true },
    institution_id: 'demo-institution-1',
  },
  'priya.sharma@demo-university.edu': {
    id: 'demo-teacher-1',
    email: 'priya.sharma@demo-university.edu',
    full_name: 'Prof. Priya Sharma',
    role: 'teacher',
    theme_preference: 'system',
    notification_prefs: { in_app: true, whatsapp: false, email: true },
    institution_id: 'demo-institution-1',
  },
  'parent@demo-university.edu': {
    id: 'demo-parent-1',
    email: 'parent@demo-university.edu',
    full_name: 'Mr. Suresh Verma',
    role: 'parent',
    theme_preference: 'system',
    notification_prefs: { in_app: true, whatsapp: true, email: false },
    institution_id: 'demo-institution-1',
  },
  'admin@demo-university.edu': {
    id: 'demo-admin-1',
    email: 'admin@demo-university.edu',
    full_name: 'Dr. Admin Singh',
    role: 'admin',
    theme_preference: 'system',
    notification_prefs: { in_app: true, whatsapp: false, email: true },
    institution_id: 'demo-institution-1',
  },
};

const DEMO_PASSWORDS: Record<string, string> = {
  'rahul.verma@demo-university.edu': 'Student@123',
  'priya.sharma@demo-university.edu': 'Teacher@123',
  'parent@demo-university.edu': 'Parent@123',
  'admin@demo-university.edu': 'Admin@123',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('campusflow_access_token');
    if (token) {
      try {
        const { data } = await api.get<User>('/auth/me');
        setUser(data);
        setIsDemoMode(false);
        localStorage.removeItem('campusflow_demo_user');
        return;
      } catch {
        // Token expired or invalid, fall through
      }
    }

    // Fallback to demo mode if demo user flag exists and no valid token
    const demoEmail = localStorage.getItem('campusflow_demo_user');
    if (demoEmail && DEMO_USERS[demoEmail]) {
      setUser(DEMO_USERS[demoEmail]);
      setIsDemoMode(true);
      return;
    }

    setUser(null);
    setIsDemoMode(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('campusflow_access_token');
    const demoEmail = localStorage.getItem('campusflow_demo_user');
    if (token || demoEmail) {
      fetchUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    // Try real backend API first
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('campusflow_access_token', data.accessToken);
      localStorage.setItem('campusflow_refresh_token', data.refreshToken);
      localStorage.removeItem('campusflow_demo_user');
      setIsDemoMode(false);
      await fetchUser();
      return;
    } catch (err: unknown) {
      // If real backend failed, check if it's a demo account fallback
      const demoUser = DEMO_USERS[email];
      if (demoUser && DEMO_PASSWORDS[email] === password) {
        localStorage.setItem('campusflow_demo_user', email);
        setUser(demoUser);
        setIsDemoMode(true);
        return;
      }

      const isNetworkError = (err as { code?: string })?.code === 'ERR_NETWORK'
        || (err as { message?: string })?.message?.includes('Network Error');
      if (isNetworkError) {
        throw new Error(`Backend unreachable at ${API_URL}. Ensure backend server is active and CORS is configured.`);
      }
      throw err;
    }
  };


  const loginWithGoogle = async (
    idToken: string,
    opts?: { role?: string; institutionSlug?: string }
  ) => {
    const { data } = await api.post('/auth/google', { idToken, ...opts });
    localStorage.setItem('campusflow_access_token', data.accessToken);
    localStorage.setItem('campusflow_refresh_token', data.refreshToken);
    await fetchUser();
  };

  const register = async (registerData: RegisterData) => {
    const { data } = await api.post('/auth/register', registerData);
    localStorage.setItem('campusflow_access_token', data.accessToken);
    localStorage.setItem('campusflow_refresh_token', data.refreshToken);
    await fetchUser();
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('campusflow_refresh_token');
    try {
      if (refreshToken && !isDemoMode) {
        await api.post('/auth/logout', { refreshToken });
      }
    } finally {
      localStorage.removeItem('campusflow_access_token');
      localStorage.removeItem('campusflow_refresh_token');
      localStorage.removeItem('campusflow_demo_user');
      setUser(null);
      setIsDemoMode(false);
    }
  };

  const refreshUser = fetchUser;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isDemoMode,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
