import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, LogIn } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import InstituteLogo from '../components/ui/InstituteLogo';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useData';
import { useAlert } from '../context/AlertContext';

export default function Login() {
  const { isAuthenticated, login, rememberMePreference } = useAuth();
  const { settings } = useSettings();
  const { showError } = useAlert();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(rememberMePreference);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = login(identifier, password, rememberMe);
      if (!result.success) {
        await showError({
          title: 'Login Failed',
          text: result.error,
        });
        return;
      }
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[480px] min-h-dvh bg-slate-50 flex flex-col justify-center px-4 py-8">
      <div className="animate-fade-in space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <InstituteLogo settings={settings} size="xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {settings.className || 'Smart Start Classes'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to manage your institute</p>
          </div>
        </div>

        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Lock size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Login</h2>
              <p className="text-xs text-slate-500">Use your username or email</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username or Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="text-sm text-slate-600 leading-snug">
                Remember me
                <span className="block text-xs text-slate-400 mt-0.5">
                  Stay signed in after closing the app until you logout
                </span>
              </span>
            </label>
            <Button type="submit" fullWidth disabled={loading}>
              <LogIn size={16} />
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Card>

        <p className="text-xs text-slate-500 text-center leading-relaxed">
          Protected access for authorized users only.
          <br />
          Account details can be changed from Settings after login.
        </p>
      </div>
    </div>
  );
}
