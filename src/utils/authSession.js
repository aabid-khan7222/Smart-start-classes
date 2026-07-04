import { STORAGE_KEYS } from './constants';

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readRememberMePreference() {
  const raw = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
  if (raw == null) return true;
  const value = parseJson(raw);
  return value !== false;
}

export function saveRememberMePreference(rememberMe) {
  try {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(Boolean(rememberMe)));
  } catch {
    // Ignore quota or private mode errors
  }
}

export function readAuthSession() {
  try {
    const persistent = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (persistent) {
      const session = parseJson(persistent);
      if (session?.username) {
        return { ...session, rememberMe: true };
      }
    }

    const temporary = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    if (temporary) {
      const session = parseJson(temporary);
      if (session?.username) {
        return { ...session, rememberMe: false };
      }
    }
  } catch {
    // Fall through to null
  }

  return null;
}

export function writeAuthSession(session, rememberMe) {
  clearAuthSession();

  if (!session?.username) return;

  const payload = JSON.stringify({
    username: session.username,
    email: session.email,
    loggedInAt: session.loggedInAt,
  });

  try {
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.SESSION, payload);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.SESSION, payload);
    }
    saveRememberMePreference(rememberMe);
  } catch {
    // Ignore quota or private mode errors
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch {
    // Ignore storage errors
  }
}
