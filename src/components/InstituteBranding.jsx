import { useEffect } from 'react';
import { useSettings } from '../hooks/useData';
import { applyInstituteBranding } from '../utils/brandingHelpers';

/**
 * Keeps document title and favicon in sync with institute settings.
 * Runs on every route (login, dashboard, etc.) so branding stays consistent.
 */
export default function InstituteBranding() {
  const { settings } = useSettings();

  useEffect(() => {
    applyInstituteBranding(settings);
  }, [settings?.className, settings?.logo]);

  return null;
}
