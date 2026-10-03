// Keeps companion bots sitting in voice channels, 24/7, even when every person has left. It never talks to Discord:
// it is given a `port` and the settings store, and tick() puts things right.
// The bots never speak, play or listen in the channels; they are just there.
//
// A server can have several rooms, each with its own bots. A bot stays in the room it was given: asking for more bots in a
// room, or adding a room, only uses bots that are free (the lowest numbers first) and never takes one from another room.
// Lowering a room's number frees its highest-numbered bots, and removing a room frees all of its bots.
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

  /** Who sits where: [{ channelId, bots, slots }]. Bots already given to a room stay there; missing ones are the lowest free bots. */
  plan(guildId, settings = this.#deps.store.get(guildId)) {
    const rooms = roomsOf(settings);
    const taken = new Set();
    const result = rooms.map((room) => {
      const want = Math.max(1, room.bots ?? 1);
      const eligible = new Set(this.#deps.port.candidates(guildId, room.channelId));
      const slots = [...new Set(room.slots ?? [])].filter((slot) => eligible.has(slot) && !taken.has(slot)).sort((a, b) => a - b).slice(0, want);
      slots.forEach((slot) => taken.add(slot));
      return { channelId: room.channelId, bots: want, slots, eligible };
    });
    for (const room of result) {
      const free = [...room.eligible].sort((a, b) => a - b).filter((slot) => !taken.has(slot));
      for (const slot of free.slice(0, room.bots - room.slots.length)) {
        room.slots.push(slot);
        taken.add(slot);
      }
      room.slots.sort((a, b) => a - b);
    }
    return result;
  }

  /** Writes the plan's bot numbers into the settings so every bot stays where it is, also after a restart. */
  #persist(guildId) {
    const { store } = this.#deps;
    const settings = store.get(guildId);
    const plan = this.plan(guildId, settings);
    if (!plan.length) return;
    // when nothing at all can connect to a room (the server is not loaded yet), keep what was stored
    const rooms = roomsOf(settings).map((room, i) => ({ channelId: room.channelId, bots: room.bots, slots: plan[i].eligible.size ? plan[i].slots : room.slots ?? [] }));
    const same = rooms.length === (settings.voiceRooms ?? []).length && rooms.every((r, i) => JSON.stringify(r) === JSON.stringify(settings.voiceRooms?.[i]));
    if (!same) store.update(guildId, { voiceRooms: rooms, voiceChannelId: null });
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
      this.#persist(guildId);
      const plan = this.plan(guildId, store.get(guildId));
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
          this.#fails.set(key, { count, firstAt: fail?.firstAt ?? now(), nextAt: now() + BACKOFF_MS[Math.min(count, BACKOFF_MS.length) - 1] });
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

  /** Bots that have been failing to join their room for longer than `minMs`: [{ guildId, slot, since }]. */
  stuck(minMs) {
    const t = this.#deps.now();
    return [...this.#fails]
      .filter(([, fail]) => fail.firstAt !== undefined && t - fail.firstAt >= minMs)
      .map(([key, fail]) => {
        const [guildId, slot] = key.split(":");
        return { guildId, slot: Number(slot), since: fail.firstAt };
      });
  }

  /** Adds a room at the end of the list, or changes the number of bots of a room that is already in it. */
  setRoom(guildId, channelId, bots) {
    const rooms = roomsOf(this.#deps.store.get(guildId)).map((r) => ({ ...r }));
    const existing = rooms.find((r) => r.channelId === channelId);
    if (existing) existing.bots = bots;
    else rooms.push({ channelId, bots });
    this.#deps.store.update(guildId, { voiceRooms: rooms, voiceChannelId: null });
    this.#persist(guildId);
    return rooms;
  }

  /** Removes one room (its bots become free, the other rooms keep theirs), or every room when no channel is given. */
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
    this.#persist(guildId);
    for (const key of [...this.#fails.keys()]) if (key.startsWith(`${guildId}:`)) this.#fails.delete(key);
    return removed.length;
  }

  /** Bots that sit in one of the saved rooms of a server but are not in `keep` step out. */
  async #stepOutOthers(guildId, keep) {
    const { store, port } = this.#deps;
    for (const room of roomsOf(store.get(guildId))) {
      const places = [room.channelId, this.#target(guildId, room.channelId)];
      for (const slot of port.candidates(guildId, room.channelId)) {
        if (!keep.has(slot) && places.includes(port.where(slot, guildId))) await port.leave(slot, guildId).catch(() => {});
      }
      this.#redirects.delete(`${guildId}:${room.channelId}`);
    }
  }

  /** Replaces the rooms of a server with these ({ channelId, slots }); the bots on their way get to their new place on the next tick. */
  async #replaceRooms(guildId, rooms) {
    const keep = new Set(rooms.flatMap((r) => r.slots));
    await this.#stepOutOthers(guildId, keep);
    this.#deps.store.update(guildId, { voiceRooms: rooms.map((r) => ({ channelId: r.channelId, bots: r.slots.length, slots: r.slots })), voiceChannelId: null });
    for (const key of [...this.#fails.keys()]) if (key.startsWith(`${guildId}:`)) this.#fails.delete(key);
  }

  /**
   * Calls the companions to one room: the lowest-numbered bots that can connect there (`count` of them, default all) become
   * that room's bots, and every other bot steps out of the voice rooms. Returns the bot numbers, or [] when none can connect.
   */
  async gather(guildId, channelId, count = Infinity) {
    const slots = [...new Set(this.#deps.port.candidates(guildId, channelId))].sort((a, b) => a - b).slice(0, count);
    if (!slots.length) return [];
    await this.#replaceRooms(guildId, [{ channelId, slots }]);
    return slots;
  }

  /**
   * Sends the companions to random rooms among `channelIds`: `count` bots (default every bot that can connect somewhere) each
   * pick a random channel they can connect to. Returns [{ channelId, slots }] for the rooms that got bots, in the order given.
   */
  async scatter(guildId, channelIds, count = Infinity, rng = Math.random) {
    const { port } = this.#deps;
    const options = new Map(); // slot -> channels it can connect to
    for (const channelId of channelIds) {
      for (const slot of new Set(port.candidates(guildId, channelId))) options.set(slot, [...(options.get(slot) ?? []), channelId]);
    }
    const bots = [...options.keys()];
    for (let i = bots.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [bots[i], bots[j]] = [bots[j], bots[i]];
    }
    const picked = new Map(channelIds.map((id) => [id, []]));
    for (const slot of bots.slice(0, count)) {
      const channels = options.get(slot);
      picked.get(channels[Math.floor(rng() * channels.length)]).push(slot);
    }
    const rooms = channelIds.filter((id) => picked.get(id).length).map((id) => ({ channelId: id, slots: picked.get(id).sort((a, b) => a - b) }));
    if (!rooms.length) return [];
    await this.#replaceRooms(guildId, rooms);
    return rooms;
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
