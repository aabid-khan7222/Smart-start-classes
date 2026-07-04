import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone, MapPin, ImagePlus, Trash2, Shield, LogOut } from 'lucide-react';
import { PageHeader } from '../components/ui/Section';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import InstituteLogo from '../components/ui/InstituteLogo';
import { useSettings } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { processLogoFile } from '../utils/logoHelpers';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { credentials, updateCredentials, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...settings });
  const [accountForm, setAccountForm] = useState({
    username: credentials.username,
    email: credentials.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const [logoError, setLogoError] = useState('');
  const [logoLoading, setLogoLoading] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setAccountForm((prev) => ({
      ...prev,
      username: credentials.username,
      email: credentials.email,
    }));
  }, [credentials.username, credentials.email]);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  };

  const showAccountMessage = (text) => {
    setAccountMessage(text);
    setAccountError('');
    setTimeout(() => setAccountMessage(''), 2500);
  };

  const handleSave = () => {
    updateSettings(form);
    showMessage('Settings saved!');
  };

  const handleAccountSave = async () => {
    setAccountError('');
    setAccountSaving(true);

    try {
      const result = updateCredentials(accountForm);
      if (!result.success) {
        setAccountError(result.error);
        return;
      }

      setAccountForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      showAccountMessage('Account details updated successfully!');
    } finally {
      setAccountSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true, state: null });
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setLogoError('');
    setLogoLoading(true);

    try {
      const logo = await processLogoFile(file);
      const updated = { ...form, logo };
      setForm(updated);
      updateSettings(updated);
      showMessage('Logo uploaded successfully!');
    } catch (error) {
      setLogoError(error.message || 'Could not upload logo');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleRemoveLogo = () => {
    const updated = { ...form, logo: '' };
    setForm(updated);
    updateSettings(updated);
    setLogoError('');
    showMessage('Logo removed');
  };

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Settings" subtitle="Manage your institute" showLogo={false} />

      {message && (
        <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium px-4 py-3 rounded-xl animate-scale-in">
          {message}
        </div>
      )}

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Shield size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Account Security</h3>
            <p className="text-xs text-slate-500">Login username, email & password</p>
          </div>
        </div>

        {accountMessage && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium px-4 py-3 rounded-xl mb-4">
            {accountMessage}
          </div>
        )}

        {accountError && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-medium px-4 py-3 rounded-xl mb-4">
            {accountError}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Username"
            value={accountForm.username}
            onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
            autoComplete="username"
          />
          <Input
            label="Email"
            type="email"
            value={accountForm.email}
            onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
            autoComplete="email"
          />
          <Input
            label="Current Password"
            type="password"
            value={accountForm.currentPassword}
            onChange={(e) => setAccountForm({ ...accountForm, currentPassword: e.target.value })}
            placeholder="Required to save changes"
            autoComplete="current-password"
          />
          <Input
            label="New Password (optional)"
            type="password"
            value={accountForm.newPassword}
            onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })}
            placeholder="Leave blank to keep current password"
            autoComplete="new-password"
          />
          {accountForm.newPassword && (
            <Input
              label="Confirm New Password"
              type="password"
              value={accountForm.confirmPassword}
              onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
          )}
          <Button fullWidth onClick={handleAccountSave} disabled={accountSaving}>
            {accountSaving ? 'Saving...' : 'Save Account Changes'}
          </Button>
          <Button variant="outline" fullWidth onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <ImagePlus size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Institute Logo</h3>
            <p className="text-xs text-slate-500">Shown on dashboard, header & PDF receipts</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-4">
          <InstituteLogo settings={form} size="xl" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {form.logo ? 'Custom logo active' : 'No logo uploaded'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {form.logo
                ? 'This logo appears across the app and all PDFs.'
                : 'Upload PNG, JPG or WEBP. Max 2MB.'}
            </p>
          </div>
        </div>

        {logoError && (
          <p className="text-xs text-red-600 font-medium mb-3">{logoError}</p>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={() => fileRef.current?.click()}
            disabled={logoLoading}
          >
            <ImagePlus size={16} /> {logoLoading ? 'Uploading...' : form.logo ? 'Change Logo' : 'Upload Logo'}
          </Button>
          {form.logo && (
            <Button variant="danger" onClick={handleRemoveLogo} disabled={logoLoading}>
              <Trash2 size={16} />
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleLogoUpload}
        />
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Institute Details</h3>
            <p className="text-xs text-slate-500">Shown on dashboard</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Class Name"
            value={form.className}
            onChange={(e) => setForm({ ...form, className: e.target.value })}
          />
          <Input
            label="Contact Number"
            type="tel"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Button fullWidth onClick={handleSave}>Save Settings</Button>
        </div>
      </Card>

      {(settings.contact || settings.address) && (
        <Card>
          <h3 className="text-sm font-bold text-slate-800 mb-3">Current Info</h3>
          {settings.contact && (
            <div className="flex items-center gap-3 py-2">
              <Phone size={16} className="text-slate-400" />
              <span className="text-sm text-slate-700">{settings.contact}</span>
            </div>
          )}
          {settings.address && (
            <div className="flex items-start gap-3 py-2">
              <MapPin size={16} className="text-slate-400 mt-0.5" />
              <span className="text-sm text-slate-700">{settings.address}</span>
            </div>
          )}
        </Card>
      )}

      <Card className="!bg-slate-50">
        <p className="text-xs text-slate-500 text-center">
          Smart Start Classes Management System v1.0
          <br />
          Data stored locally on this device
        </p>
      </Card>
    </div>
  );
}
