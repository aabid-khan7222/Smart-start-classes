import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone, MapPin, ImagePlus, Trash2, Shield, LogOut, CalendarOff, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui/Section';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import InstituteLogo from '../components/ui/InstituteLogo';
import { useSettings, useHolidays } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { processLogoFile } from '../utils/logoHelpers';
import { useAlert } from '../context/AlertContext';
import { getToday, formatDate, normalizeDate } from '../utils/dateHelpers';
import { HOLIDAY_TYPES, HOLIDAY_TYPE_OPTIONS } from '../utils/constants';
import {
  getHolidayTypeLabel,
  formatHolidayRangeLabel,
  getHolidayRangeDayCount,
} from '../utils/holidayHelpers';

export default function Settings() {
  const { showSuccess, showError, showConfirm } = useAlert();
  const { settings, updateSettings } = useSettings();
  const { holidays, addHoliday, removeHoliday } = useHolidays();
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
  const [logoLoading, setLogoLoading] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [holidayModal, setHolidayModal] = useState({
    open: false,
    startDate: getToday(),
    endDate: getToday(),
    reason: '',
    type: HOLIDAY_TYPES.PUBLIC,
  });
  const fileRef = useRef(null);

  const sortedHolidays = useMemo(
    () =>
      [...(holidays || [])].sort((a, b) =>
        normalizeDate(b.date).localeCompare(normalizeDate(a.date))
      ),
    [holidays]
  );

  useEffect(() => {
    setAccountForm((prev) => ({
      ...prev,
      username: credentials.username,
      email: credentials.email,
    }));
  }, [credentials.username, credentials.email]);

  const handleSave = async () => {
    updateSettings(form);
    await showSuccess({
      title: 'Settings Saved!',
      text: 'Institute details updated successfully.',
    });
  };

  const handleAccountSave = async () => {
    setAccountSaving(true);

    try {
      const result = updateCredentials(accountForm);
      if (!result.success) {
        await showError({
          title: 'Validation Error',
          text: result.error,
        });
        return;
      }

      setAccountForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      await showSuccess({
        title: 'Account Updated!',
        text: 'Your login details have been saved successfully.',
      });
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

    setLogoLoading(true);

    try {
      const logo = await processLogoFile(file);
      const updated = { ...form, logo };
      setForm(updated);
      updateSettings(updated);
      await showSuccess({
        title: 'Logo Uploaded!',
        text: 'Your institute logo has been updated.',
      });
    } catch (error) {
      await showError({
        title: 'Upload Failed',
        text: error.message || 'Could not upload logo',
      });
    } finally {
      setLogoLoading(false);
    }
  };

  const handleRemoveLogo = async () => {
    const confirmed = await showConfirm({
      title: 'Remove Logo?',
      text: 'Are you sure you want to remove your institute logo? The default logo will be used on login, browser tab, and receipts.',
      confirmText: 'Yes, Remove',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    const updated = { ...form, logo: '' };
    setForm(updated);
    updateSettings(updated);
    await showSuccess({
      title: 'Logo Removed',
      text: 'Default institute logo is now active.',
    });
  };

  const openHolidayModal = () => {
    setHolidayModal({
      open: true,
      startDate: getToday(),
      endDate: getToday(),
      reason: '',
      type: HOLIDAY_TYPES.PUBLIC,
    });
  };

  const closeHolidayModal = () => {
    setHolidayModal({
      open: false,
      startDate: getToday(),
      endDate: getToday(),
      reason: '',
      type: HOLIDAY_TYPES.PUBLIC,
    });
  };

  const confirmAddHoliday = async () => {
    const reason = holidayModal.reason.trim();
    const startDate = normalizeDate(holidayModal.startDate);
    const endDate = normalizeDate(holidayModal.endDate || holidayModal.startDate);
    const dayCount = getHolidayRangeDayCount(startDate, endDate);

    if (!startDate || !reason) {
      await showError({
        title: 'Validation Error',
        text: 'Please select dates and enter a reason.',
      });
      return;
    }

    if (!dayCount) {
      await showError({
        title: 'Validation Error',
        text: 'End date cannot be before start date',
      });
      return;
    }

    const result = addHoliday(startDate, reason, holidayModal.type, endDate);
    if (!result.success) {
      await showError({
        title: 'Could Not Save',
        text: result.error || 'Failed to add holiday.',
      });
      return;
    }

    closeHolidayModal();

    const skippedNote =
      result.skipped > 0
        ? ` (${result.skipped} already marked)`
        : '';

    await showSuccess({
      title: result.added > 1 ? 'Holidays Added!' : 'Holiday Added!',
      text:
        result.added > 1
          ? `${result.added} days marked (${formatHolidayRangeLabel(startDate, endDate)}).${skippedNote}`
          : `${formatDate(startDate)} marked as holiday.${skippedNote}`,
      autoCloseMs: 2000,
    });
  };

  const handleDeleteHoliday = async (holiday) => {
    const confirmed = await showConfirm({
      title: 'Remove Holiday?',
      text: `Remove holiday on ${formatDate(holiday.date)} (${holiday.reason})?`,
      confirmText: 'Yes, Remove',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    removeHoliday(holiday.id);
    await showSuccess({
      title: 'Holiday Removed',
      text: `${formatDate(holiday.date)} removed from holidays.`,
      autoCloseMs: 2000,
    });
  };

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Settings" subtitle="Manage your institute" showLogo={false} />

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
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <CalendarOff size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Holidays</h3>
              <p className="text-xs text-slate-500">Add single day or date range</p>
            </div>
          </div>
          <Button size="sm" onClick={openHolidayModal}>
            <Plus size={14} /> Add
          </Button>
        </div>

        {sortedHolidays.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            No holidays added yet. Mark closed days from here or Attendance.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedHolidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center gap-3 p-3 bg-amber-50/60 border border-amber-100 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{formatDate(holiday.date)}</p>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">{holiday.reason}</p>
                  <div className="mt-1.5">
                    <Badge variant="holiday">{getHolidayTypeLabel(holiday.type)}</Badge>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteHoliday(holiday)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Remove holiday"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <ImagePlus size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Institute Logo</h3>
            <p className="text-xs text-slate-500">Shown on login, browser tab, dashboard, header & PDF receipts</p>
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
                ? 'This logo appears on login, browser tab, dashboard, and all PDFs.'
                : 'Upload PNG, JPG or WEBP. Max 2MB.'}
            </p>
          </div>
        </div>

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

      <Modal isOpen={holidayModal.open} onClose={closeHolidayModal} title="Add Holiday">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                From Date
              </label>
              <input
                type="date"
                value={holidayModal.startDate}
                onChange={(e) => {
                  const startDate = e.target.value;
                  setHolidayModal((prev) => ({
                    ...prev,
                    startDate,
                    endDate:
                      prev.endDate && prev.endDate < startDate ? startDate : prev.endDate || startDate,
                  }));
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                To Date
              </label>
              <input
                type="date"
                value={holidayModal.endDate}
                min={holidayModal.startDate}
                onChange={(e) =>
                  setHolidayModal((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {getHolidayRangeDayCount(holidayModal.startDate, holidayModal.endDate) > 1 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              {getHolidayRangeDayCount(holidayModal.startDate, holidayModal.endDate)} days will be
              marked: {formatHolidayRangeLabel(holidayModal.startDate, holidayModal.endDate)}
            </p>
          )}

          <Select
            label="Holiday Type"
            value={holidayModal.type}
            onChange={(e) =>
              setHolidayModal((prev) => ({ ...prev, type: e.target.value }))
            }
          >
            {HOLIDAY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Input
            label="Reason"
            value={holidayModal.reason}
            onChange={(e) =>
              setHolidayModal((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="e.g. Diwali, Personal leave..."
            autoFocus
          />
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" fullWidth onClick={closeHolidayModal}>
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={confirmAddHoliday}
            className="bg-amber-600 text-white border-transparent shadow-lg shadow-amber-600/20 active:bg-amber-700"
          >
            {getHolidayRangeDayCount(holidayModal.startDate, holidayModal.endDate) > 1
              ? `Add ${getHolidayRangeDayCount(holidayModal.startDate, holidayModal.endDate)} Days`
              : 'Add Holiday'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
