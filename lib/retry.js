// Retry policy for flaky mobile networks and a busy server.
//
// Only idempotent requests (GET/HEAD/OPTIONS) are retried automatically, so a
// retry can never double-create an expense or message. A request can opt in
// with `config.retry = true`, or out with `config.retry = false`.

export const MAX_RETRIES = 3;
const RETRY_STATUS = new Set([429, 502, 503, 504]);
const SAFE_METHODS = new Set(["get", "head", "options"]);

export function shouldRetry(error) {
  const cfg = error?.config;
  if (!cfg || cfg.retry === false) return false;
  if ((cfg.__retryCount || 0) >= MAX_RETRIES) return false;
  const method = String(cfg.method || "get").toLowerCase();
  if (!SAFE_METHODS.has(method) && cfg.retry !== true) return false;
  const status = error?.response?.status;
  if (status) return RETRY_STATUS.has(status);
  // No response: dropped connection, DNS failure, or timeout.
  return true;
}

// Exponential backoff with jitter (so a crowd of phones doesn't retry in
// lock-step), honouring a server "Retry-After" (seconds) up to 5s.
export function backoffMs(attempt, retryAfterHeader, random = Math.random) {
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter, 5) * 1000;
  const base = Math.min(400 * 2 ** attempt, 4000);
  return Math.round(base / 2 + random() * (base / 2));
}
