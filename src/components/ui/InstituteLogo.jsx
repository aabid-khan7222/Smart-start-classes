import { useEffect, useState } from 'react';
import { useSettings } from '../../hooks/useData';
import { getInstituteInitials } from '../../utils/logoHelpers';

const SIZES = {
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

export default function InstituteLogo({
  settings: settingsProp,
  size = 'md',
  className = '',
  alt = 'Institute logo',
}) {
  const { settings: contextSettings } = useSettings();
  const settings = settingsProp || contextSettings;
  const initials = getInstituteInitials(settings?.className);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [settings?.logo]);

  if (settings?.logo && !imgError) {
    return (
      <img
        src={settings.logo}
        alt={alt}
        onError={() => setImgError(true)}
        className={`${SIZES[size]} rounded-xl object-contain bg-white border border-slate-100 shadow-sm shrink-0 ${className}`}
      />
    );
  }

  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-lg' };

  return (
    <div
      className={`${SIZES[size]} rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0 ${textSizes[size]} ${className}`}
    >
      {initials}
    </div>
  );
}
