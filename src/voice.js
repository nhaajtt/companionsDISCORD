// Keeps companion bots sitting in a voice channel, 24/7, even when every person has left. It never talks to Discord:
// it is given a `port` ({ candidates, isIn, join, leave }) and the settings store, and tick() puts things right.
// The bots never speak, play or listen in the channel; they are just there.
const BACKOFF_MS = [5_000, 15_000, 60_000, 300_000]; // wait this long after the 1st, 2nd, 3rd... failed attempt (the last repeats)

/**
 * @param {object} deps
 * @param {{get(guildId): object, all(): [string, object][]}} deps.store
 * @param {object} deps.port
 *   candidates(guildId, channelId) -> slots that may join that channel (they can see and connect to it)
 *   isIn(slot, guildId, channelId) -> is that bot connected there right now
 *   join(slot, guildId, channelId) -> Promise<boolean>   leave(slot, guildId) -> Promise
 */
export class VoiceKeeper {
  #deps;
  #fails = new Map(); // "guild:slot" -> { count, nextAt }

  constructor({ store, port, now = Date.now, log = () => {} }) {
    this.#deps = { store, port, now, log };
  }

  /** The bots that should be in the room: the first `voiceBots` of the ones allowed to join. */
  assigned(guildId, settings = this.#deps.store.get(guildId)) {
    if (!settings.voiceChannelId) return [];
    const slots = [...this.#deps.port.candidates(guildId, settings.voiceChannelId)].sort((a, b) => a - b);
    return slots.slice(0, Math.max(1, settings.voiceBots ?? 1));
  }

  async tick() {
    const { store, port, now, log } = this.#deps;
    for (const [guildId, settings] of store.all()) {
      if (!settings.voiceChannelId) continue;
      const wanted = this.assigned(guildId, settings);
      for (const slot of wanted) {
        const key = `${guildId}:${slot}`;
        if (port.isIn(slot, guildId, settings.voiceChannelId)) {
          this.#fails.delete(key);
          continue;
        }
        const fail = this.#fails.get(key);
        if (fail && now() < fail.nextAt) continue;
        let ok = false;
        try {
          ok = await port.join(slot, guildId, settings.voiceChannelId);
        } catch (error) {
          log(`Companion ${slot + 1} could not join the voice channel: ${error.message}`);
        }
        if (ok) this.#fails.delete(key);
        else {
          const count = (fail?.count ?? 0) + 1;
          this.#fails.set(key, { count, nextAt: now() + BACKOFF_MS[Math.min(count, BACKOFF_MS.length) - 1] });
        }
      }
      // A bot that is in the room but no longer wanted (the number was lowered, or it lost the permission) steps out
      for (const slot of port.candidates(guildId, settings.voiceChannelId)) {
        if (!wanted.includes(slot) && port.isIn(slot, guildId, settings.voiceChannelId)) await port.leave(slot, guildId).catch(() => {});
      }
    }
  }

  /** Makes every companion leave the voice channel of a server and forgets the room. */
  async leave(guildId) {
    const { store, port } = this.#deps;
    const settings = store.get(guildId);
    store.update(guildId, { voiceChannelId: null });
    if (settings.voiceChannelId) {
      for (const slot of port.candidates(guildId, settings.voiceChannelId)) {
        if (port.isIn(slot, guildId, settings.voiceChannelId)) await port.leave(slot, guildId).catch(() => {});
      }
    }
    for (const key of [...this.#fails.keys()]) if (key.startsWith(`${guildId}:`)) this.#fails.delete(key);
  }

  status(guildId) {
    const { store, port } = this.#deps;
    const settings = store.get(guildId);
    if (!settings.voiceChannelId) return { channelId: null, wanted: 0, present: 0 };
    const wanted = this.assigned(guildId, settings);
    return {
      channelId: settings.voiceChannelId,
      wanted: wanted.length,
      present: wanted.filter((slot) => port.isIn(slot, guildId, settings.voiceChannelId)).length,
      eligible: port.candidates(guildId, settings.voiceChannelId).length,
    };
  }
}
