// Tells the owner when something breaks, through an optional Discord webhook (ALERT_WEBHOOK_URL).
// Each kind of problem is sent at most once per cooldown, and anything that looks like a token is hidden.
const COOLDOWN_MS = 30 * 60_000;
const TOKEN_LIKE = /[\w-]{20,}\.[\w-]{5,}\.[\w-]{20,}/g;

export const scrub = (text) => String(text ?? "").replace(TOKEN_LIKE, "[hidden]").slice(0, 1800);

/**
 * @param {{url?: string, fetchImpl?: typeof fetch, now?: () => number, log?: (message: string) => void}} options
 * @returns {{enabled: boolean, notify(key: string, text: string): Promise<boolean>}}
 */
export function createAlerter({ url, fetchImpl = globalThis.fetch, now = Date.now, log = console.error } = {}) {
  const last = new Map();
  return {
    enabled: Boolean(url),
    /** Sends `text` unless the same `key` was sent less than 30 minutes ago. Returns whether it was sent. */
    async notify(key, text) {
      if (!url) return false;
      if (now() - (last.get(key) ?? -Infinity) < COOLDOWN_MS) return false;
      last.set(key, now());
      try {
        const response = await fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: `⚠️ companionsDISCORD: ${scrub(text)}`, allowed_mentions: { parse: [] } }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return true;
      } catch (error) {
        log(`Could not send the alert: ${error.message}`);
        return false;
      }
    },
  };
}
