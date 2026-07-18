let lockCount = 0;

export function lockBodyScroll() {
  lockCount += 1;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
}

export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
}

export function forceUnlockBodyScroll() {
  lockCount = 0;
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}
