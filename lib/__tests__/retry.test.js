import { shouldRetry, backoffMs, MAX_RETRIES } from "../retry";

const err = (cfg, status) => ({ config: cfg, response: status ? { status } : undefined });

describe("retry policy", () => {
  test("retries GET on network failure and 502/503/504/429", () => {
    expect(shouldRetry(err({ method: "get" }))).toBe(true);
    for (const s of [429, 502, 503, 504]) expect(shouldRetry(err({ method: "get" }, s))).toBe(true);
  });
  test("does not retry client errors or auth failures", () => {
    for (const s of [400, 401, 403, 404, 422]) expect(shouldRetry(err({ method: "get" }, s))).toBe(false);
  });
  test("never auto-retries writes (no duplicate expenses/messages)", () => {
    expect(shouldRetry(err({ method: "post" }))).toBe(false);
    expect(shouldRetry(err({ method: "post" }, 503))).toBe(false);
    expect(shouldRetry(err({ method: "post", retry: true }, 503))).toBe(true);
  });
  test("stops after MAX_RETRIES and respects opt-out", () => {
    expect(shouldRetry(err({ method: "get", __retryCount: MAX_RETRIES }))).toBe(false);
    expect(shouldRetry(err({ method: "get", retry: false }))).toBe(false);
  });
  test("backoff grows, is capped, and honours Retry-After", () => {
    expect(backoffMs(0, undefined, () => 0)).toBe(200);
    expect(backoffMs(5, undefined, () => 1)).toBe(4000);
    expect(backoffMs(0, "2")).toBe(2000);
    expect(backoffMs(0, "60")).toBe(5000);
  });
});
