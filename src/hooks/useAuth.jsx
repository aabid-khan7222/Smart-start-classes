import { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '../utils/constants';
import { defaultAuthCredentials } from '../data/defaults';
import {
  credentialsMatch,
  normalizeAuthCredentials,
  validateCredentialUpdate,
  validatePassword,
} from '../utils/authHelpers';
import {
  clearAuthSession,
  readAuthSession,
  readRememberMePreference,
  writeAuthSession,
} from '../utils/authSession';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useLocalStorage(STORAGE_KEYS.AUTH, defaultAuthCredentials);
  const [session, setSessionState] = useState(() => readAuthSession());
  const [rememberMePreference, setRememberMePreference] = useState(() => readRememberMePreference());

  const credentials = useMemo(
    () => normalizeAuthCredentials(auth, defaultAuthCredentials),
    [auth]
  );

  const isAuthenticated = Boolean(session?.username);

  const persistSession = useCallback((nextSession, rememberMe) => {
    if (!nextSession?.username) {
      clearAuthSession();
      setSessionState(null);
      return;
    }

    writeAuthSession(nextSession, rememberMe);
    setSessionState({ ...nextSession, rememberMe: Boolean(rememberMe) });
    setRememberMePreference(Boolean(rememberMe));
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEYS.SESSION) return;
      setSessionState(readAuthSession());
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(
    (identifier, password, rememberMe = false) => {
      const trimmedId = identifier?.trim();
      const trimmedPass = password ?? '';

      if (!trimmedId) {
        return { success: false, error: 'Username or email is required' };
      }

      const passwordError = validatePassword(trimmedPass);
      if (passwordError) {
        return { success: false, error: passwordError };
      }

      if (!credentialsMatch(trimmedId, trimmedPass, credentials)) {
        return { success: false, error: 'Invalid username/email or password' };
      }

      persistSession(
        {
          username: credentials.username,
          email: credentials.email,
          loggedInAt: new Date().toISOString(),
        },
        rememberMe
      );

      return { success: true };
    },
    [credentials, persistSession]
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setSessionState(null);
  }, []);

  const updateCredentials = useCallback(
    ({ currentPassword, username, email, newPassword, confirmPassword }) => {
      const validationError = validateCredentialUpdate(
        { currentPassword, username, email, newPassword, confirmPassword },
        credentials
      );

      if (validationError) {
        return { success: false, error: validationError };
      }

      const updated = {
        username: username.trim(),
        email: email.trim(),
        password: newPassword ? newPassword : credentials.password,
      };

      setAuth(updated);

      if (session) {
        persistSession(
          {
            username: updated.username,
            email: updated.email,
            loggedInAt: session.loggedInAt,
          },
          session.rememberMe ?? rememberMePreference
        );
      }

      return { success: true };
    },
    [credentials, session, rememberMePreference, setAuth, persistSession]
  );

  const value = useMemo(
    () => ({
      credentials,
      session,
      isAuthenticated,
      rememberMePreference,
      login,
      logout,
      updateCredentials,
    }),
    [credentials, session, isAuthenticated, rememberMePreference, login, logout, updateCredentials]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthCredentials() {
  const { credentials, updateCredentials } = useAuth();
  return { credentials, updateCredentials };
}
