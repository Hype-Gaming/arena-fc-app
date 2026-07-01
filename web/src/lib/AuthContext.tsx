// web/src/lib/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { tokenStorage, type Tokens } from './tokenStorage';

interface AuthValue {
  isAuthenticated: boolean;
  login: (tokens: Tokens) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState<boolean>(
    () => tokenStorage.getAccessToken() !== null,
  );

  const login = useCallback((tokens: Tokens) => {
    tokenStorage.setTokens(tokens);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
