// Keeps companion bots sitting in voice channels, 24/7, even when every person has left. It never talks to Discord:
// it is given a `port` ({ candidates, isIn, join, leave }) and the settings store, and tick() puts things right.
// The bots never speak, play or listen in the channels; they are just there.
//
// A server can have several rooms. They are an ordered list, and bots are handed out in order: the first room gets the
// first bots (by slot number), the second room gets the next ones, and so on. Removing a room makes the later rooms'
// bots move up, so the order always holds.
const BACKOFF_MS = [5_000, 15_000, 60_000, 300_000]; // wait this long after the 1st, 2nd, 3rd... failed attempt (the last repeats)

/** The rooms of a server as [{ channelId, bots }]. Understands the older single-room settings too. */
export function roomsOf(settings) {
  if (settings.voiceRooms?.length) return settings.voiceRooms;
  if (settings.voiceChannelId) return [{ channelId: settings.voiceChannelId, bots: settings.voiceBots ?? 1 }];
  return [];
}

export const isVoiceRoom = (settings, channelId) => roomsOf(settings).some((r) => r.channelId === channelId);

/**
 * @param {object} deps
 * @param {{get(guildId): object, all(): [string, object][], update(guildId, patch): object}} deps.store
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

  /** Who sits where: [{ channelId, bots, slots }] in room order, the lowest free slots first. */
  plan(guildId, settings = this.#deps.store.get(guildId)) {
    const used = new Set();
    return roomsOf(settings).map(({ channelId, bots }) => {
      const eligible = [...this.#deps.port.candidates(guildId, channelId)].sort((a, b) => a - b).filter((slot) => !used.has(slot));
      const slots = eligible.slice(0, Math.max(1, bots ?? 1));
      slots.forEach((slot) => used.add(slot));
      return { channelId, bots: bots ?? 1, slots };
    });
  }

  /** Every bot that is meant to be in some room of this server. */
  assigned(guildId, settings) {
    return this.plan(guildId, settings).flatMap((room) => room.slots);
  }

  async tick() {
    const { store, port, now, log } = this.#deps;
    for (const [guildId, settings] of store.all()) {
      const plan = this.plan(guildId, settings);
      if (!plan.length) continue;
      const wanted = new Map(plan.flatMap((room) => room.slots.map((slot) => [slot, room.channelId])));

      for (const [slot, channelId] of wanted) {
        const key = `${guildId}:${slot}`;
        if (port.isIn(slot, guildId, channelId)) {
          this.#fails.delete(key);
          continue;
        }
        const fail = this.#fails.get(key);
        if (fail && now() < fail.nextAt) continue;
        let ok = false;
        try {
          ok = await port.join(slot, guildId, channelId);
        } catch (error) {
          log(`Companion ${slot + 1} could not join the voice channel: ${error.message}`);
        }
        if (ok) this.#fails.delete(key);
        else {
          const count = (fail?.count ?? 0) + 1;
          this.#fails.set(key, { count, nextAt: now() + BACKOFF_MS[Math.min(count, BACKOFF_MS.length) - 1] });
        }
      }

      // A bot that sits in one of the rooms but has no place in the plan any more steps out
      for (const { channelId } of plan) {
        for (const slot of port.candidates(guildId, channelId)) {
          if (!wanted.has(slot) && port.isIn(slot, guildId, channelId)) await port.leave(slot, guildId).catch(() => {});
        }
      }
    }
  }

  /** Adds a room at the end of the list, or changes the number of bots of a room that is already in it. */
  setRoom(guildId, channelId, bots) {
    const rooms = roomsOf(this.#deps.store.get(guildId)).map((r) => ({ ...r }));
    const existing = rooms.find((r) => r.channelId === channelId);
    if (existing) existing.bots = bots;
    else rooms.push({ channelId, bots });
    this.#deps.store.update(guildId, { voiceRooms: rooms, voiceChannelId: null });
    return rooms;
  }

  /** Removes one room (the bots of the later rooms move up), or every room when no channel is given. */
  async removeRoom(guildId, channelId = null) {
    const { store, port } = this.#deps;
    const settings = store.get(guildId);
    const before = roomsOf(settings);
    const after = channelId ? before.filter((r) => r.channelId !== channelId) : [];
    store.update(guildId, { voiceRooms: after, voiceChannelId: null });
    for (const room of before.filter((r) => !after.some((a) => a.channelId === r.channelId))) {
      for (const slot of port.candidates(guildId, room.channelId)) {
        if (port.isIn(slot, guildId, room.channelId)) await port.leave(slot, guildId).catch(() => {});
      }
    }
    for (const key of [...this.#fails.keys()]) if (key.startsWith(`${guildId}:`)) this.#fails.delete(key);
    return before.length - after.length;
  }

  /** Per room: how many bots are wanted, how many are there now, how many could connect. */
  status(guildId) {
    const { port } = this.#deps;
    const rooms = this.plan(guildId).map((room) => ({
      channelId: room.channelId,
      wanted: room.slots.length,
      asked: room.bots,
      present: room.slots.filter((slot) => port.isIn(slot, guildId, room.channelId)).length,
      slots: room.slots,
    }));
    return { rooms, wanted: rooms.reduce((n, r) => n + r.wanted, 0), present: rooms.reduce((n, r) => n + r.present, 0) };
  }
}
