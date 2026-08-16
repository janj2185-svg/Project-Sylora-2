export const RTC_CONFIG_CACHE_MAX_MS = 5 * 60 * 1_000;
export const RTC_CONFIG_EXPIRY_SAFETY_MS = 60 * 1_000;

export function isRtcConfigCacheFresh(config, {
  fetchedAt = 0,
  now = Date.now()
} = {}) {
  const timestamp = Number(fetchedAt);
  const currentTime = Number(now);
  if (!config || !Number.isFinite(timestamp) || timestamp <= 0 || !Number.isFinite(currentTime)) return false;
  if (currentTime < timestamp || currentTime - timestamp >= RTC_CONFIG_CACHE_MAX_MS) return false;

  const credentialExpiry = Date.parse(config.credentialExpiresAt || '');
  if (Number.isFinite(credentialExpiry)
    && currentTime + RTC_CONFIG_EXPIRY_SAFETY_MS >= credentialExpiry) return false;
  return true;
}
