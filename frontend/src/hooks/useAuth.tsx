import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { isAuthenticated, getUser, login as authLogin, logout as authLogout, type AuthUser } from '@/lib/auth';
import { api } from '@/lib/api';

interface AuthContextType {
  isLoggedIn: boolean;
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Check JWT on mount
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      if (authenticated) {
        setUser(getUser());
        
        // Refresh and verify user details from the database
        try {
          const res = await api.verifyToken();
          if (res.valid && res.user) {
            setUser(res.user as AuthUser);
            localStorage.setItem('mcms_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.error('Failed to auto-verify token on mount:', err);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (username: string, password: string) => {
    const result = await authLogin(username, password);
    if (result.success) {
      setIsLoggedIn(true);
      setUser(getUser());
    }
    return result;
  };

  const logout = () => {
    authLogout();
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
