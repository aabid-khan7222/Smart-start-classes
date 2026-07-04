export const LOGO_MAX_FILE_SIZE = 2 * 1024 * 1024;
export const LOGO_STORAGE_MAX_DIMENSION = 256;

export function getInstituteInitials(name) {
  return (name || 'SSC')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function getDataUrlFormat(dataUrl) {
  if (!dataUrl) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return 'JPEG';
  }
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'PNG';
}

export function hasCustomLogo(settings) {
  return Boolean(settings?.logo);
}

export function processLogoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Please upload an image file (PNG, JPG, or WEBP)'));
      return;
    }

    if (file.size > LOGO_MAX_FILE_SIZE) {
      reject(new Error('Image must be smaller than 2MB'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = LOGO_STORAGE_MAX_DIMENSION;
        let width = img.width;
        let height = img.height;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => reject(new Error('Could not process image. Try another file.'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}

async function loadDefaultLogoDataUrl() {
  try {
    const response = await fetch('/logo.svg');
    if (!response.ok) return null;
    const svgText = await response.text();
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 240, 240);
        ctx.drawImage(img, 0, 0, 240, 240);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

export async function getLogoForPdf(settings) {
  if (settings?.logo) return settings.logo;
  return loadDefaultLogoDataUrl();
}
