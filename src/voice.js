// Keeps companion bots sitting in voice channels, 24/7, even when every person has left. It never talks to Discord:
// it is given a `port` and the settings store, and tick() puts things right.
// The bots never speak, play or listen in the channels; they are just there.
//
// A server can have several rooms. They are an ordered list, and bots are handed out in order: the first room gets the
// first bots (by slot number), the second room gets the next ones, and so on. Removing a room makes the later rooms'
// bots move up, so the order always holds.
//
// "Join to create" channels (a channel that makes a new room for whoever joins and moves them there) are handled too:
// when a bot that joined room X is moved to a new room in the same category, that new room is remembered as the real
// place of X. The next bots for X join the new room directly, so two bots share one room instead of making one each,
// and nobody keeps rejoining the creator channel.
const BACKOFF_MS = [5_000, 15_000, 60_000, 300_000]; // wait this long after the 1st, 2nd, 3rd... failed attempt (the last repeats)
const SETTLE_MS = 3_000; // after a join, wait this long to see whether the bot is moved to a new room

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
 *   where(slot, guildId) -> the voice channel that bot is connected to right now, or null
 *   exists(guildId, channelId) -> does that channel still exist
 *   sameCategory(guildId, channelA, channelB) -> are the two channels in the same category
 *   join(slot, guildId, channelId) -> Promise<boolean>   leave(slot, guildId) -> Promise
 */
export class VoiceKeeper {
  #deps;
  #fails = new Map(); // "guild:slot" -> { count, nextAt }
  #redirects = new Map(); // "guild:room" -> the room a join-to-create channel really led to

  constructor({ store, port, now = Date.now, log = () => {}, settleMs = SETTLE_MS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
    this.#deps = { store, port, now, log, settleMs, sleep };
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

  /** Where bots for `channelId` really go: the room a join-to-create channel led to, while that room exists. */
  #target(guildId, channelId) {
    const key = `${guildId}:${channelId}`;
    const target = this.#redirects.get(key);
    if (target && this.#deps.port.exists(guildId, target)) return target;
    this.#redirects.delete(key);
    return channelId;
  }

  /** If the bot was moved to a new room next to `channelId` (and that is not one of the chosen rooms), remember it. */
  #learn(guildId, channelId, current, settings) {
    const { port } = this.#deps;
    if (!current || current === channelId || isVoiceRoom(settings, current)) return false;
    if (!port.sameCategory(guildId, current, channelId)) return false;
    if (this.#redirects.get(`${guildId}:${channelId}`) !== current) this.#deps.log(`A bot was moved to ${current}: that is where the room ${channelId} leads now.`);
    this.#redirects.set(`${guildId}:${channelId}`, current);
    return true;
  }

  async tick() {
    const { store, port, now, log, settleMs, sleep } = this.#deps;
    for (const [guildId, settings] of store.all()) {
      const plan = this.plan(guildId, settings);
      if (!plan.length) continue;
      const wanted = new Map(plan.flatMap((room) => room.slots.map((slot) => [slot, room.channelId])));

      for (const [slot, channelId] of wanted) {
        const key = `${guildId}:${slot}`;
        const target = this.#target(guildId, channelId);
        const current = port.where(slot, guildId);
        if (current === target || current === channelId || this.#learn(guildId, channelId, current, settings)) {
          this.#fails.delete(key);
          continue;
        }
        const fail = this.#fails.get(key);
        if (fail && now() < fail.nextAt) continue;
        let ok = false;
        try {
          ok = await port.join(slot, guildId, target);
        } catch (error) {
          log(`Companion ${slot + 1} could not join the voice channel: ${error.message}`);
        }
        if (ok) {
          this.#fails.delete(key);
          // A "join to create" channel moves the bot to a brand new room a moment later; find out where it ended up
          if (settleMs > 0) await sleep(settleMs);
          this.#learn(guildId, channelId, port.where(slot, guildId), settings);
        } else {
          const count = (fail?.count ?? 0) + 1;
          this.#fails.set(key, { count, nextAt: now() + BACKOFF_MS[Math.min(count, BACKOFF_MS.length) - 1] });
        }
      }

      // A bot that sits in one of the rooms but has no place in the plan any more steps out
      for (const { channelId } of plan) {
        const places = [channelId, this.#target(guildId, channelId)];
        for (const slot of port.candidates(guildId, channelId)) {
          if (!wanted.has(slot) && places.includes(port.where(slot, guildId))) await port.leave(slot, guildId).catch(() => {});
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
    const before = roomsOf(store.get(guildId));
    const after = channelId ? before.filter((r) => r.channelId !== channelId) : [];
    const removed = before.filter((r) => !after.some((a) => a.channelId === r.channelId));
    // the bots of a removed room step out (also the ones that sit in the room a join-to-create channel made)
    for (const room of removed) {
      const places = [room.channelId, this.#target(guildId, room.channelId)];
      for (const slot of port.candidates(guildId, room.channelId)) {
        if (places.includes(port.where(slot, guildId))) await port.leave(slot, guildId).catch(() => {});
      }
      this.#redirects.delete(`${guildId}:${room.channelId}`);
    }
    store.update(guildId, { voiceRooms: after, voiceChannelId: null });
    for (const key of [...this.#fails.keys()]) if (key.startsWith(`${guildId}:`)) this.#fails.delete(key);
    return removed.length;
  }

  /** Per room: how many bots are wanted, how many are there now, how many could connect. */
  status(guildId) {
    const { port } = this.#deps;
    const rooms = this.plan(guildId).map((room) => {
      const places = [room.channelId, this.#target(guildId, room.channelId)];
      return {
        channelId: room.channelId,
        wanted: room.slots.length,
        asked: room.bots,
        present: room.slots.filter((slot) => places.includes(port.where(slot, guildId))).length,
        slots: room.slots,
      };
    });
    return { rooms, wanted: rooms.reduce((n, r) => n + r.wanted, 0), present: rooms.reduce((n, r) => n + r.present, 0) };
  }
}
