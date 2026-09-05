const STORAGE_KEY = 'le_device_id';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Stable per-install id so a new-user coupon can only be used once on this phone. */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)?.trim() || '';
    if (existing.length >= 8 && existing.length <= 64) return existing;
    const created = randomId();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return '';
  }
}
