export function normalizeAuthCredentials(stored, defaults) {
  return {
    username: stored?.username?.trim() || defaults.username,
    email: stored?.email?.trim() || defaults.email,
    password: stored?.password ?? defaults.password,
  };
}

export function validateUsername(username) {
  const trimmed = username?.trim();
  if (!trimmed) return 'Username is required';
  if (trimmed.length < 3) return 'Username must be at least 3 characters';
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, dots, hyphens and underscores';
  }
  return null;
}

export function validateEmail(email) {
  const trimmed = email?.trim();
  if (!trimmed) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address';
  }
  return null;
}

export function validatePassword(password, { required = true, minLength = 6 } = {}) {
  if (!password) {
    return required ? 'Password is required' : null;
  }
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters`;
  }
  return null;
}

export function credentialsMatch(identifier, password, credentials) {
  const id = identifier.trim().toLowerCase();
  const username = credentials.username.trim().toLowerCase();
  const email = credentials.email.trim().toLowerCase();
  return (id === username || id === email) && password === credentials.password;
}

export function validateCredentialUpdate({ currentPassword, username, email, newPassword, confirmPassword }, credentials) {
  if (!currentPassword) {
    return 'Current password is required to save account changes';
  }

  if (currentPassword !== credentials.password) {
    return 'Current password is incorrect';
  }

  const usernameError = validateUsername(username);
  if (usernameError) return usernameError;

  const emailError = validateEmail(email);
  if (emailError) return emailError;

  if (newPassword) {
    const passwordError = validatePassword(newPassword);
    if (passwordError) return passwordError;

    if (newPassword !== confirmPassword) {
      return 'New password and confirmation do not match';
    }
  }

  return null;
}
