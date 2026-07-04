const DEFAULT_FAVICON = '/favicon.svg';
const DEFAULT_TITLE = 'Smart Start Classes';

function getFaviconType(href) {
  if (!href || href === DEFAULT_FAVICON) return 'image/svg+xml';
  if (href.startsWith('data:image/jpeg') || href.startsWith('data:image/jpg')) {
    return 'image/jpeg';
  }
  if (href.startsWith('data:image/png')) return 'image/png';
  if (href.startsWith('data:image/webp')) return 'image/webp';
  if (href.startsWith('data:image/svg')) return 'image/svg+xml';
  return undefined;
}

function setLinkIcon(rel, href) {
  const type = getFaviconType(href);
  let link = document.querySelector(`link[rel="${rel}"]`);

  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }

  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href);
  }

  if (type) {
    link.setAttribute('type', type);
  } else {
    link.removeAttribute('type');
  }
}

export function applyInstituteBranding(settings) {
  const title = settings?.className?.trim() || DEFAULT_TITLE;
  if (document.title !== title) {
    document.title = title;
  }

  const logo = settings?.logo?.trim();
  const faviconHref = logo || DEFAULT_FAVICON;

  setLinkIcon('icon', faviconHref);
  setLinkIcon('apple-touch-icon', faviconHref);
}

export { DEFAULT_FAVICON, DEFAULT_TITLE };
