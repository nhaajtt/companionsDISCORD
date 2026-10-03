// Connects the companion engine to Discord: several bot accounts in one process, typing indicators, replies, polls,
// trivia buttons, and the /companions (managers) and /trivia (everyone) commands, registered on the first bot only.
import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Options,
  MessageFlags,
  MessageType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { VoiceConnectionStatus, entersState, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { CustomError, KINDS as CUSTOM_KINDS } from "./custom.js";
import { CompanionEngine } from "./engine.js";
import { collectRecap, formatContentList, formatRecap, formatStats, formatTop, hoursText } from "./format.js";
import { weekStart } from "./scores.js";
import { adaptiveWeights } from "./usage.js";
import { POMODORO_LIMITS, fill } from "./pomodoro.js";
import { ReminderError, parseDuration } from "./reminders.js";
import { LANGUAGES, PRESETS, createSettingsStore, localParts, validTimeZone } from "./settings.js";
import { VoiceKeeper, isVoiceRoom, roomsOf } from "./voice.js";
import { VoiceTools, presenceText } from "./voicetools.js";
import { getContent } from "./content/index.js";
import { activeSeasons, withSeasons } from "./content/seasons.js";
import NOTES from "./content/notes.js";
import VOICES from "./content/voices.js";
import { getTools } from "./content/tools.js";

const TICK_MS = 15_000;
const REGISTER_ATTEMPTS = 6;
const LETTERS = ["A", "B", "C", "D"];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const NO_PINGS = { parse: [], repliedUser: false };

const kindChoices = (kinds) => kinds.map((k) => ({ name: k, value: k }));
const ROUND_KINDS = ["question", "riddle", "fact", "banter", "poll", "trivia"];

export const companionsCommand = new SlashCommandBuilder()
  .setName("companions")
  .setDescription("Set up the companion bots that chat in your server")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((s) =>
    s
      .setName("setup")
      .setDescription("Pick the channel the companions chat in and turn them on")
      .addChannelOption((o) =>
        o.setName("channel").setDescription("A text channel all companion bots can see and write in").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true),
      )
      .addStringOption((o) =>
        o.setName("language").setDescription("Language they speak (default: English)").addChoices({ name: "English", value: "en" }, { name: "Tiếng Việt", value: "vi" }),
      ),
  )
  .addSubcommand((s) => s.setName("on").setDescription("Turn the companions on"))
  .addSubcommand((s) => s.setName("off").setDescription("Turn the companions off"))
  .addSubcommand((s) =>
    s
      .setName("frequency")
      .setDescription("How often they start a conversation")
      .addStringOption((o) =>
        o
          .setName("level")
          .setDescription("Calm, normal or lively")
          .setRequired(true)
          .addChoices(...Object.entries(PRESETS).map(([value, p]) => ({ name: `${p.label}: up to ${p.dailyCap} a day`, value }))),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("quiet")
      .setDescription("Hours when they stay silent, in the time zone the bots run in")
      .addIntegerOption((o) => o.setName("from").setDescription("Hour they go quiet, 0-23 (default 23)").setMinValue(0).setMaxValue(23).setRequired(true))
      .addIntegerOption((o) => o.setName("until").setDescription("Hour they speak again, 0-23 (default 8)").setMinValue(0).setMaxValue(23).setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("now")
      .setDescription("Start a conversation right now (to test it)")
      .addStringOption((o) => o.setName("kind").setDescription("What to start (default: a random one)").addChoices(...kindChoices(ROUND_KINDS))),
  )
  .addSubcommand((s) => s.setName("status").setDescription("Show the current settings"))
  .addSubcommand((s) =>
    s
      .setName("stats")
      .setDescription("How many conversations the bots started and how many got people talking")
      .addIntegerOption((o) => o.setName("days").setDescription("How many days back (default 7)").setMinValue(1).setMaxValue(90)),
  )
  .addSubcommand((s) =>
    s
      .setName("qotd")
      .setDescription("Post a question of the day at a fixed hour (leave the hour empty to turn it off)")
      .addIntegerOption((o) => o.setName("hour").setDescription("Hour of the day, 0-23, in the time zone the bots run in").setMinValue(0).setMaxValue(23)),
  )
  .addSubcommand((s) =>
    s
      .setName("toggle")
      .setDescription("Turn trivia rounds, polls or adaptive tuning on or off")
      .addStringOption((o) => o.setName("what").setDescription("Which one").setRequired(true).addChoices({ name: "Trivia rounds", value: "trivia" }, { name: "Polls", value: "polls" }, { name: "Adaptive tuning", value: "adaptive" }))
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("titles")
      .setDescription("Announce a voice regular when someone spends 5 hours in the voice room in a week")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("recap")
      .setDescription("Post a short recap of the week every Monday morning")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("welcome")
      .setDescription("Greet new members with an icebreaker (needs the server's join messages turned on)")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
  )
  .addSubcommandGroup((g) =>
    g
      .setName("data")
      .setDescription("Your server's data")
      .addSubcommand((s) => s.setName("export").setDescription("Get your settings and the content you added as a file"))
      .addSubcommand((s) =>
        s
          .setName("delete")
          .setDescription("Erase everything stored about this server (settings, content, scores, voice time, reminders)")
          .addBooleanOption((o) => o.setName("confirm").setDescription("Set to true to confirm. This cannot be undone").setRequired(true)),
      ),
  )
  .addSubcommandGroup((g) =>
    g
      .setName("voice")
      .setDescription("Companions that sit in a voice channel 24/7")
      .addSubcommand((s) =>
        s
          .setName("join")
          .setDescription("Add a voice room or change its number of bots (free companions sit there and stay)")
          .addChannelOption((o) => o.setName("channel").setDescription("The voice channel (pick a room that is already added to change its number of bots)").addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice).setRequired(true))
          .addIntegerOption((o) => o.setName("bots").setDescription("How many companions sit there (default 1)").setMinValue(1).setMaxValue(30)),
      )
      .addSubcommand((s) =>
        s
          .setName("leave")
          .setDescription("Remove a voice room (its bots become free), or every room if you pick none")
          .addChannelOption((o) => o.setName("channel").setDescription("The room to remove (leave empty to remove them all)").addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)),
      )
      .addSubcommand((s) => s.setName("status").setDescription("Which companions sit in which voice room"))
      .addSubcommand((s) =>
        s
          .setName("greet")
          .setDescription("Say hi in the chat channel when someone joins the voice channel")
          .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
      )
      .addSubcommand((s) =>
        s
          .setName("camera")
          .setDescription("Show a \"camera on\" sign on the companions in voice (a sign only, no real video)")
          .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
      ),
  )
  .addSubcommandGroup((g) =>
    g
      .setName("content")
      .setDescription("Add your own questions, jokes, facts and polls")
      .addSubcommand((s) => s.setName("add-question").setDescription("Add a question the bots can ask").addStringOption((o) => o.setName("text").setDescription("The question").setRequired(true).setMaxLength(300)))
      .addSubcommand((s) =>
        s
          .setName("add-joke")
          .setDescription("Add a joke or riddle")
          .addStringOption((o) => o.setName("setup").setDescription("The setup or riddle").setRequired(true).setMaxLength(300))
          .addStringOption((o) => o.setName("punchline").setDescription("The punchline or answer").setRequired(true).setMaxLength(300)),
      )
      .addSubcommand((s) => s.setName("add-fact").setDescription("Add a fun fact").addStringOption((o) => o.setName("text").setDescription("The fact").setRequired(true).setMaxLength(300)))
      .addSubcommand((s) =>
        s
          .setName("add-poll")
          .setDescription("Add a poll")
          .addStringOption((o) => o.setName("question").setDescription("The question").setRequired(true).setMaxLength(300))
          .addStringOption((o) => o.setName("options").setDescription("2 to 4 options separated by | (for example Cats | Dogs)").setRequired(true).setMaxLength(300)),
      )
      .addSubcommand((s) => s.setName("list").setDescription("Show what you added").addStringOption((o) => o.setName("kind").setDescription("Which kind").setRequired(true).addChoices(...kindChoices(CUSTOM_KINDS))))
      .addSubcommand((s) =>
        s
          .setName("remove")
          .setDescription("Remove something you added")
          .addStringOption((o) => o.setName("kind").setDescription("Which kind").setRequired(true).addChoices(...kindChoices(CUSTOM_KINDS)))
          .addIntegerOption((o) => o.setName("number").setDescription("Its number in the list").setRequired(true).setMinValue(1)),
      ),
  );

export const triviaCommand = new SlashCommandBuilder()
  .setName("trivia")
  .setDescription("Trivia from the companion bots")
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName("top")
      .setDescription("The trivia leaderboard")
      .addStringOption((o) => o.setName("period").setDescription("Which ranking (default: this week)").addChoices({ name: "This week", value: "week" }, { name: "All time", value: "all" })),
  )
  .addSubcommand((s) => s.setName("streak").setDescription("How many days in a row you have answered a trivia question right"))
  .addSubcommand((s) => s.setName("forget").setDescription("Erase your trivia scores from every server"));

export const voiceCommand = new SlashCommandBuilder()
  .setName("voice")
  .setDescription("Time spent in the voice room the companions sit in")
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName("top")
      .setDescription("Who spends the most time in the voice room")
      .addStringOption((o) => o.setName("period").setDescription("Which ranking (default: this week)").addChoices({ name: "This week", value: "week" }, { name: "All time", value: "all" })),
  )
  .addSubcommand((s) => s.setName("forget").setDescription("Erase your voice time from every server"));

export const pomodoroCommand = new SlashCommandBuilder()
  .setName("pomodoro")
  .setDescription("A focus session with the companions, announced in the chat channel")
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName("start")
      .setDescription("Start a focus session (you must be in the voice room the companions sit in)")
      .addIntegerOption((o) => o.setName("work").setDescription(`Minutes of work (default ${POMODORO_LIMITS.work[2]})`).setMinValue(POMODORO_LIMITS.work[0]).setMaxValue(POMODORO_LIMITS.work[1]))
      .addIntegerOption((o) => o.setName("break").setDescription(`Minutes of break (default ${POMODORO_LIMITS.brk[2]})`).setMinValue(POMODORO_LIMITS.brk[0]).setMaxValue(POMODORO_LIMITS.brk[1]))
      .addIntegerOption((o) => o.setName("rounds").setDescription(`How many rounds (default ${POMODORO_LIMITS.rounds[2]})`).setMinValue(POMODORO_LIMITS.rounds[0]).setMaxValue(POMODORO_LIMITS.rounds[1])),
  )
  .addSubcommand((s) => s.setName("stop").setDescription("Stop the focus session"))
  .addSubcommand((s) => s.setName("status").setDescription("Where the focus session is"));

export const remindCommand = new SlashCommandBuilder()
  .setName("remind")
  .setDescription("A companion reminds you of something, in this channel")
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName("add")
      .setDescription("Set a reminder")
      .addStringOption((o) => o.setName("in").setDescription("How long from now: 10m, 2h, 1d, 1d12h").setRequired(true).setMaxLength(20))
      .addStringOption((o) => o.setName("text").setDescription("What to remind you of").setRequired(true).setMaxLength(200)),
  )
  .addSubcommand((s) => s.setName("list").setDescription("Your waiting reminders"))
  .addSubcommand((s) => s.setName("cancel").setDescription("Cancel a reminder").addIntegerOption((o) => o.setName("number").setDescription("Its number in the list").setRequired(true).setMinValue(1)));

export const eventCommand = new SlashCommandBuilder()
  .setName("event")
  .setDescription("An event countdown: the companions announce it a day before, an hour before and when it starts")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
  .addSubcommand((s) =>
    s
      .setName("add")
      .setDescription("Add an event countdown in this channel")
      .addStringOption((o) => o.setName("in").setDescription("How long from now: 3h, 2d, 1w, 1d12h").setRequired(true).setMaxLength(20))
      .addStringOption((o) => o.setName("name").setDescription("The event").setRequired(true).setMaxLength(200)),
  )
  .addSubcommand((s) => s.setName("list").setDescription("Upcoming events"))
  .addSubcommand((s) => s.setName("cancel").setDescription("Cancel an event").addIntegerOption((o) => o.setName("number").setDescription("Its number in the list").setRequired(true).setMinValue(1)));

const REQUIRED = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory];

/** The text of a trivia message: the question, then the four options. The buttons only carry the letters. */
function triviaText({ label, question, options }) {
  return `${label ?? "🧠 Trivia"}\n**${question}**\n${options.map((o, i) => `**${LETTERS[i]})** ${o}`).join("\n")}`;
}

/** Starts every companion bot and the engine. `tokens` are bot tokens; the first one hosts the slash commands. */
export async function startCompanions({ tokens, store, usage, scores, custom, hours, reminders, timezone, alerter = { notify: async () => false }, log = console.log }) {
  const slots = [];

  const logIn = async (slot, token) => {
    // With up to 30 bots in one process, keep each client light: nothing here reads old messages, reactions or presences
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
      makeCache: Options.cacheWithLimits({ ...Options.DefaultMakeCacheSettings, MessageManager: 0, ReactionManager: 0, PresenceManager: 0 }),
    });
    client.once(Events.ClientReady, (c) => log(`Companion ${slot + 1} is online as ${c.user.tag}`));
    try {
      await client.login(token);
      return { slot, client };
    } catch (error) {
      console.error(`Companion ${slot + 1} could not log in (${error.message}). Skipping it.`);
      client.destroy();
      return null;
    }
  };
  // Log in a few at a time: one by one is slow with 30 bots, all at once is rude to the gateway
  const LOGIN_BATCH = 5;
  for (let start = 0; start < tokens.length; start += LOGIN_BATCH) {
    const batch = await Promise.all(tokens.slice(start, start + LOGIN_BATCH).map((token, i) => logIn(start + i, token)));
    slots.push(...batch.filter(Boolean));
  }
  if (slots.length < 2) throw new Error("At least two companion bots must be able to log in.");
  const bySlot = new Map(slots.map((s) => [s.slot, s.client]));

  const channelOf = (slot, guildId, channelId) => bySlot.get(slot)?.guilds.cache.get(guildId)?.channels.cache.get(channelId);

  /** Can this bot write in the chosen channel of that server right now? */
  const canWrite = (client, guildId, channelId) => {
    const guild = client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId);
    const me = guild?.members.me;
    return Boolean(channel?.isTextBased() && me && channel.permissionsFor(me)?.has(REQUIRED));
  };

  const bots = {
    available: (guildId, channelId) => slots.filter(({ client }) => canWrite(client, guildId, channelId)).map(({ slot }) => ({ slot })),

    async send({ slot, guildId, channelId, text, replyTo, poll, trivia, pingUsers }) {
      const channel = channelOf(slot, guildId, channelId);
      if (!channel?.isTextBased()) return null;
      const reply = replyTo ? { messageReference: replyTo, failIfNotExists: false } : undefined;
      try {
        // Look like someone typing: a pause that grows with the length of the message
        await channel.sendTyping().catch(() => {});
        await sleep(Math.min(4000, 800 + text.length * 35));

        if (poll) {
          try {
            const message = await channel.send({
              poll: { question: { text: poll.question }, answers: poll.options.map((option) => ({ text: option })), duration: 24, allowMultiselect: false },
              allowedMentions: NO_PINGS,
            });
            return message.id;
          } catch (error) {
            // Without the Send Polls permission fall back to a plain message with the options listed
            console.error(`Companion ${slot + 1} could not send a poll (${error.message}), sending it as text.`);
            const message = await channel.send({ content: `${poll.question}\n${poll.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`, allowedMentions: NO_PINGS });
            return message.id;
          }
        }

        if (trivia) {
          const row = new ActionRowBuilder().addComponents(
            trivia.options.map((_, i) => new ButtonBuilder().setCustomId(`tv:${trivia.token}:${i}`).setLabel(LETTERS[i]).setStyle(ButtonStyle.Primary)),
          );
          const message = await channel.send({ content: triviaText(trivia), components: [row], allowedMentions: NO_PINGS });
          return message.id;
        }

        const message = await channel.send({ content: text, reply, allowedMentions: pingUsers?.length ? { parse: [], users: pingUsers, repliedUser: false } : NO_PINGS });
        return message.id;
      } catch (error) {
        console.error(`Companion ${slot + 1} could not send a message:`, error.message);
        return null;
      }
    },

    /** Turns the answer buttons of a finished trivia round off. */
    async edit({ slot, guildId, channelId, messageId, closeTrivia }) {
      const channel = channelOf(slot, guildId, channelId);
      if (!channel?.isTextBased() || !closeTrivia) return;
      const message = await channel.messages.fetch(messageId);
      const rows = message.components.map((row) => {
        const copy = ActionRowBuilder.from(row);
        copy.components.forEach((button) => button.setDisabled(true));
        return copy;
      });
      await message.edit({ components: rows });
    },
  };

  // The built-in bank, plus the packs of the season (Halloween, Christmas...), plus what the server's managers added
  const content = (language, guildId) => custom.merge(withSeasons(getContent(language), language, localParts(Date.now(), timezone).day), guildId);
  const engine = new CompanionEngine({ store, content, bots, timezone, log, usage, scores });

  // Voice: the companions sit in a room 24/7. Each bot has its own voice "group" so several can sit in one server.
  const groupOf = (slot) => `companion-${slot}`;
  const hostClient = slots[0].client;
  const voicePort = {
    candidates: (guildId, channelId) =>
      slots
        .filter(({ client }) => {
          const guild = client.guilds.cache.get(guildId);
          const channel = guild?.channels.cache.get(channelId);
          const me = guild?.members.me;
          return Boolean(channel?.isVoiceBased() && me && channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]));
        })
        .map(({ slot }) => slot),
    // The channel this bot is connected to (it may have been moved by a "join to create" channel), or null
    where: (slot, guildId) => {
      const state = getVoiceConnection(guildId, groupOf(slot))?.state.status;
      if (!state || state === VoiceConnectionStatus.Destroyed || state === VoiceConnectionStatus.Disconnected) return null;
      return bySlot.get(slot)?.guilds.cache.get(guildId)?.members.me?.voice.channelId ?? null;
    },
    exists: (guildId, channelId) => Boolean(hostClient.guilds.cache.get(guildId)?.channels.cache.get(channelId)),
    sameCategory: (guildId, a, b) => {
      const channels = hostClient.guilds.cache.get(guildId)?.channels.cache;
      const first = channels?.get(a);
      return Boolean(first && first.parentId === channels.get(b)?.parentId);
    },
    async join(slot, guildId, channelId) {
      const guild = bySlot.get(slot)?.guilds.cache.get(guildId);
      if (!guild) return false;
      getVoiceConnection(guildId, groupOf(slot))?.destroy();
      // Neither muted nor deafened, so no mute or deafen icon shows; it just never sends or plays any audio
      const connection = joinVoiceChannel({ channelId, guildId, adapterCreator: guild.voiceAdapterCreator, selfDeaf: false, selfMute: false, group: groupOf(slot) });
      connection.on("error", (error) => console.error(`Companion ${slot + 1} voice error:`, error.message));
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          // Discord moves the bot between voice servers now and then; wait to see if it reconnects by itself
          await Promise.race([entersState(connection, VoiceConnectionStatus.Signalling, 5_000), entersState(connection, VoiceConnectionStatus.Connecting, 5_000)]);
        } catch {
          connection.destroy();
        }
      });
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        log(`Companion ${slot + 1} is sitting in the voice channel of ${guild.name}.`);
        return true;
      } catch {
        connection.destroy();
        return false;
      }
    },
    async leave(slot, guildId) {
      getVoiceConnection(guildId, groupOf(slot))?.destroy();
    },
  };
  const keeper = new VoiceKeeper({ store, port: voicePort, log });

  const humansIn = (guildId) => {
    return roomsOf(store.get(guildId)).reduce((n, room) => {
      const channel = hostClient.guilds.cache.get(guildId)?.channels.cache.get(room.channelId);
      return n + (channel?.members ? channel.members.filter((m) => !m.user.bot).size : 0);
    }, 0);
  };
  /** Says something in the chat channel, from a companion that sits in the voice room when possible. */
  const say = async ({ guildId, text, pingUsers, slot: wanted }) => {
    const settings = store.get(guildId);
    if (!settings.channelId) return;
    const slot = wanted ?? keeper.assigned(guildId)[0] ?? bots.available(guildId, settings.channelId)[0]?.slot;
    if (slot === undefined) return;
    await bots.send({ slot, guildId, channelId: settings.channelId, text, pingUsers });
  };
  /**
   * A line for a purpose ("welcome", "greet", "bye", "remind") in the voice of the bot that says it: most of the time one of
   * that personality's own lines, now and then one from the big shared pool.
   */
  const lineFor = ({ language, slot, purpose, pool }) => {
    const own = slot === undefined ? null : (VOICES[language] ?? VOICES.en)[slot % VOICES.en.length]?.[purpose];
    const list = own?.length && Math.random() < 0.8 ? own : pool;
    return list[Math.floor(Math.random() * list.length)];
  };
  /** The companion that says hello or goodbye in the chat: one of those sitting in the room, so every bot gets its turn. */
  const speaker = (guildId) => {
    const sitting = keeper.assigned(guildId);
    return sitting.length ? sitting[Math.floor(Math.random() * sitting.length)] : undefined;
  };
  const voiceTools = new VoiceTools({ store, hours, tools: getTools, say, humansIn, speaker, lineFor, timezone, log });
  const seeded = new Set();
  const seedVoiceGuild = (guildId) => {
    const settings = store.get(guildId);
    for (const room of roomsOf(settings)) {
      const channel = hostClient.guilds.cache.get(guildId)?.channels.cache.get(room.channelId);
      channel?.members?.forEach((m) => !m.user.bot && voiceTools.userJoined({ guildId, userId: m.id, channelId: channel.id, existing: true }));
    }
  };

  /** Tells the owner (webhook) when a bot has been offline, or a voice bot unable to rejoin, for more than 10 minutes. */
  const readySince = new Map(slots.map(({ slot }) => [slot, Date.now()]));
  const checkHealth = () => {
    const t = Date.now();
    for (const { slot, client } of slots) {
      if (client.isReady()) readySince.set(slot, t);
      else if (t - readySince.get(slot) > 10 * 60_000) alerter.notify(`offline:${slot}`, `Companion ${slot + 1} has been offline for more than 10 minutes.`);
    }
    for (const stuck of keeper.stuck(10 * 60_000)) {
      alerter.notify(`voice:${stuck.guildId}:${stuck.slot}`, `Companion ${stuck.slot + 1} has not been able to join its voice room for ${Math.round((t - stuck.since) / 60_000)} minutes.`);
    }
  };

  /** On Monday mornings (10:00 and later), posts the recap of the week before in the servers that turned it on. */
  const maybeRecap = async () => {
    const { hour, day } = localParts(Date.now(), timezone);
    const monday = weekStart(day);
    if (hour < 10 || day !== monday) return;
    for (const [guildId, settings] of store.all()) {
      if (!settings.recap || !settings.enabled || !settings.channelId || settings.lastRecap === monday) continue;
      store.update(guildId, { lastRecap: monday });
      await say({ guildId, text: formatRecap(getTools(settings.language), collectRecap({ usage, scores, hours, guildId, day })) });
    }
  };

  /** What each companion shows under its name: the voice room it sits in, a focus session, or an idle line. */
  const lastPresence = new Map();
  // each bot starts at a random place in its list of notes, so a restart does not always begin with the same one
  const noteOffset = new Map(slots.map(({ slot }) => [slot, Math.floor(Math.random() * 1000)]));
  const updatePresence = () => {
    const now = Date.now();
    for (const { slot, client } of slots) {
      if (!client.isReady()) continue;
      let voice = null;
      let focus = null;
      let language = "en";
      let camera = false;
      for (const guildId of client.guilds.cache.keys()) {
        const settings = store.get(guildId);
        if (settings.channelId && language === "en") language = settings.language;
        if (!keeper.assigned(guildId).includes(slot)) continue;
        language = settings.language;
        camera = settings.camera;
        const channelId = voicePort.where(slot, guildId);
        const channel = channelId ? client.guilds.cache.get(guildId)?.channels.cache.get(channelId) : null;
        voice = { humans: channel?.members ? channel.members.filter((m) => !m.user.bot).size : 0 };
        focus = voiceTools.pomodoro.status(guildId)?.minutesLeft ?? null;
        break;
      }
      const notes = (NOTES[language] ?? NOTES.en)[slot % NOTES.en.length];
      const text = presenceText(getTools(language), { slot, now, voice, focusMinutesLeft: focus, notes, offset: noteOffset.get(slot), camera });
      if (lastPresence.get(slot) === text) continue;
      lastPresence.set(slot, text);
      client.user.setPresence({ status: "online", activities: [{ name: "custom", type: ActivityType.Custom, state: text }] });
    }
  };

  /** Erases everything stored about a server, in every store. Returns whether anything was there. */
  const forgetGuild = (guildId) => {
    const results = [store.remove(guildId), usage.forgetGuild(guildId), scores.forgetGuild(guildId), hours.forgetGuild(guildId), custom.forgetGuild(guildId), reminders.forgetGuild(guildId) > 0];
    return results.some(Boolean);
  };

  // When every companion has left a server (kicked, or the server was deleted), its data is erased after a day
  const pendingForget = new Map();
  for (const { client } of slots) {
    client.on(Events.GuildDelete, (guild) => {
      if (guild.unavailable) return; // an outage, not a removal
      clearTimeout(pendingForget.get(guild.id));
      pendingForget.set(
        guild.id,
        setTimeout(() => {
          pendingForget.delete(guild.id);
          if (slots.some(({ client: c }) => c.guilds.cache.has(guild.id))) return; // some companion is still there
          if (forgetGuild(guild.id)) log(`Every companion left server ${guild.id}, so its stored data was erased.`);
        }, 24 * 3_600_000).unref?.(),
      );
    });
    client.on(Events.GuildCreate, (guild) => {
      clearTimeout(pendingForget.get(guild.id));
      pendingForget.delete(guild.id);
    });
  }

  // every bot has a note from the moment it starts, not only after the first round of the timer
  updatePresence();
  setTimeout(updatePresence, 5_000).unref?.();

  /** Delivers the reminders and event heads-ups that are due. One that cannot be sent (no bot can write there) is retried. */
  const deliverReminders = async () => {
    for (const { item, stage } of reminders.due(Date.now())) {
      const lines = getTools(store.get(item.guildId).language);
      const slot = bots.available(item.guildId, item.channelId)[0]?.slot;
      if (slot === undefined) {
        if (stage === "due" && Date.now() - item.at > 24 * 3_600_000) reminders.done(item.id);
        continue;
      }
      const text =
        item.kind === "remind"
          ? fill(lineFor({ language: store.get(item.guildId).language, slot, purpose: "remind", pool: lines.remind }), { user: `<@${item.userId}>`, text: item.text })
          : fill({ day: lines.eventDay, hour: lines.eventHour, due: lines.eventNow }[stage], { text: item.text });
      await bots.send({ slot, guildId: item.guildId, channelId: item.channelId, text, pingUsers: item.kind === "remind" ? [item.userId] : [] });
      if (stage === "due") reminders.done(item.id);
    }
    reminders.flush();
  };

  for (const { client } of slots) {
    // Every bot hears every message; the engine ignores duplicates. Bots (including the companions) are never "people".
    client.on(Events.MessageCreate, (message) => {
      // A new member joined: the server's "join" system message (no privileged intent needed). Only the first bot handles it.
      if (client === hostClient && message.guildId && message.type === MessageType.UserJoin && !message.author.bot) {
        const settings = store.get(message.guildId);
        if (settings.welcome && settings.enabled && settings.channelId) {
          const lines = getTools(settings.language);
          const questions = content(settings.language, message.guildId).questions;
          // any companion that can write there welcomes them, in its own voice
          const welcomers = bots.available(message.guildId, settings.channelId);
          const welcomer = welcomers.length ? welcomers[Math.floor(Math.random() * welcomers.length)].slot : undefined;
          const greeting = fill(lineFor({ language: settings.language, slot: welcomer, purpose: "welcome", pool: lines.welcome }), { user: `<@${message.author.id}>` });
          const ask = questions[Math.floor(Math.random() * questions.length)]?.text;
          say({ guildId: message.guildId, slot: welcomer, text: ask ? `${greeting}\n${lines.welcomeAsk} ${ask}` : greeting }).catch(() => {});
        }
        return;
      }
      if (!message.guildId || message.author.bot || message.system || message.webhookId) return;
      engine.noteHumanMessage({
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        replyToMessageId: message.reference?.messageId ?? null,
      });
    });

    // Trivia buttons: Discord delivers a button press only to the bot that sent the message
    client.on(Events.InteractionCreate, (interaction) => {
      if (!interaction.isButton() || !interaction.customId.startsWith("tv:") || !interaction.guildId) return;
      const [, token, choice] = interaction.customId.split(":");
      const result = engine.noteTriviaAnswer({ guildId: interaction.guildId, token, userId: interaction.user.id, choice: Number(choice) });
      interaction.reply({ content: result.message ?? "…", flags: MessageFlags.Ephemeral }).catch(() => {});
    });
  }

  // People moving in and out of the voice rooms (only the first bot listens, the others would repeat it)
  hostClient.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot || oldState.channelId === newState.channelId) return;
    const settings = store.get(newState.guild.id);
    if (oldState.channelId && isVoiceRoom(settings, oldState.channelId)) voiceTools.userLeft({ guildId: newState.guild.id, userId: member.id, moved: Boolean(newState.channelId && isVoiceRoom(settings, newState.channelId)) });
    if (newState.channelId && isVoiceRoom(settings, newState.channelId)) voiceTools.userJoined({ guildId: newState.guild.id, userId: member.id, channelId: newState.channelId });
  });

  // The slash commands live on the first bot, registered per server so they show up immediately
  const host = slots[0].client;
  // Registration is retried because the network (DNS in particular) can hiccup right after the container starts
  const registerFor = async (guild) => {
    for (let attempt = 1; attempt <= REGISTER_ATTEMPTS; attempt++) {
      try {
        await guild.commands.set([companionsCommand, triviaCommand, voiceCommand, pomodoroCommand, remindCommand, eventCommand].map((c) => c.toJSON()));
        return;
      } catch (error) {
        console.error(`Could not register the commands in ${guild.name} (attempt ${attempt} of ${REGISTER_ATTEMPTS}):`, error.message);
        if (attempt < REGISTER_ATTEMPTS) await sleep(Math.min(60_000, 5_000 * 2 ** (attempt - 1)));
      }
    }
  };
  // The list of servers is only known once the bot is ready
  if (host.isReady()) host.guilds.cache.forEach(registerFor);
  else host.once(Events.ClientReady, (c) => c.guilds.cache.forEach(registerFor));
  host.on(Events.GuildCreate, registerFor);

  host.on(Events.InteractionCreate, (interaction) => {
    const handlers = { companions: handleCommand, trivia: handleTrivia, voice: handleVoiceTop, pomodoro: handlePomodoro, remind: handleRemind, event: handleRemind };
    if (!interaction.isChatInputCommand() || !handlers[interaction.commandName]) return;
    handlers[interaction.commandName](interaction, { store, engine, slots, timezone, usage, scores, custom, hours, reminders, keeper, voiceTools, voicePort, seedVoiceGuild, say, forgetGuild, updatePresence }).catch(async (error) => {
      console.error(`/${interaction.commandName} failed:`, error);
      const payload = { content: "Something went wrong with that command.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    });
  });

  let engineRunning = false;
  const timer = setInterval(() => {
    if (engineRunning) return;
    engineRunning = true;
    engine
      .tick()
      .catch((e) => console.error("Companions tick failed:", e))
      .finally(() => (engineRunning = false));
  }, TICK_MS);
  timer.unref?.();
  let toolsRunning = false;
  const toolsTimer = setInterval(async () => {
    if (toolsRunning) return; // the last round is still going (many servers, slow joins): do not start another on top of it
    toolsRunning = true;
    try {
      await keeper.tick();
      for (const [guildId] of store.all()) if (!seeded.has(guildId)) (seeded.add(guildId), seedVoiceGuild(guildId));
      await voiceTools.tick();
      await deliverReminders();
      updatePresence();
      checkHealth();
      await maybeRecap();
    } catch (error) {
      console.error("Companion tools tick failed:", error);
    } finally {
      toolsRunning = false;
    }
  }, TICK_MS);
  toolsTimer.unref?.();
  log(`Companions running with ${slots.length} bots. Time zone: ${timezone}.`);

  const startedAt = Date.now();
  /** Totals only: nothing here names a server, a person or a message. */
  const snapshot = () => {
    const guildIds = [...hostClient.guilds.cache.keys()];
    let conversations = 0;
    let joined = 0;
    let triviaAnswers = 0;
    let rooms = 0;
    let sitting = 0;
    for (const guildId of guildIds) {
      const sum = usage.summary(guildId, engine.today(), 7);
      conversations += sum.total;
      joined += sum.totalJoined;
      triviaAnswers += sum.triviaAnswers;
      const voice = keeper.status(guildId);
      rooms += voice.rooms.filter((r) => r.present > 0).length;
      sitting += voice.present;
    }
    return {
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      bots: { online: slots.filter(({ client }) => client.isReady()).length, total: slots.length },
      servers: guildIds.length,
      voice: { rooms, companionsSitting: sitting },
      last7Days: { conversations, withPeople: joined, triviaAnswers },
    };
  };

  return {
    engine,
    snapshot,
    stop: async () => {
      clearInterval(timer);
      clearInterval(toolsTimer);
      slots.forEach(({ slot }) => store.all().forEach(([guildId]) => getVoiceConnection(guildId, groupOf(slot))?.destroy()));
      await Promise.all(slots.map(({ client }) => client.destroy()));
    },
  };
}

async function handleTrivia(interaction, { engine, scores, store }) {
  const guildId = interaction.guildId;
  const sub = interaction.options.getSubcommand();
  const labels = getContent(store.get(guildId).language).labels;

  if (sub === "streak") {
    const { current, best } = scores.streak(guildId, interaction.user.id, engine.today());
    const lines = getTools(store.get(guildId).language);
    return interaction.reply({ content: current ? fill(lines.streakMine, { n: current, best }) : lines.streakNone, flags: MessageFlags.Ephemeral });
  }

  if (sub === "forget") {
    const erased = scores.forget(interaction.user.id);
    return interaction.reply({ content: erased ? labels.forgetDone : labels.forgetNone, flags: MessageFlags.Ephemeral });
  }

  const period = interaction.options.getString("period") ?? "week";
  const entries = scores.top(guildId, { day: period === "week" ? engine.today() : null, limit: 10 });
  if (!entries.length) return interaction.reply({ content: labels.topEmpty, flags: MessageFlags.Ephemeral });
  return interaction.reply({ content: formatTop(entries, period === "week" ? labels.topWeek : labels.topAll), allowedMentions: { parse: [] } });
}

/** "Room 1: #a: 1. Pip, 2. Grumble ...", with how many are there yet. */
function voiceSummary(status, slots) {
  const nameOf = (slot) => slots.find((s) => s.slot === slot)?.client.user?.username ?? `Companion ${slot + 1}`;
  return status.rooms
    .map((room, i) => {
      const who = room.slots.map((slot) => `${slot + 1}. ${nameOf(slot)}`).join(", ") || "nobody can connect";
      const note = room.asked > room.wanted ? ` (you asked for ${room.asked}, only ${room.wanted} can connect)` : "";
      return `**Room ${i + 1}:** <#${room.channelId}>: ${who}${note}. ${room.present} of ${room.wanted} are there now.`;
    })
    .join("\n");
}

async function handleVoiceTop(interaction, { hours, engine, store }) {
  const guildId = interaction.guildId;
  const lines = getTools(store.get(guildId).language);
  if (interaction.options.getSubcommand() === "forget") {
    const erased = hours.forget(interaction.user.id);
    return interaction.reply({ content: erased ? lines.voiceForgetDone : lines.voiceForgetNone, flags: MessageFlags.Ephemeral });
  }
  const period = interaction.options.getString("period") ?? "week";
  const entries = hours.top(guildId, { day: period === "week" ? engine.today() : null, limit: 10 });
  if (!entries.length) return interaction.reply({ content: lines.voiceTopEmpty, flags: MessageFlags.Ephemeral });
  return interaction.reply({ content: formatTop(entries, period === "week" ? lines.voiceTopWeek : lines.voiceTopAll, ["minute", "minutes"]), allowedMentions: { parse: [] } });
}

async function handlePomodoro(interaction, { store, voiceTools, keeper, say }) {
  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
  const guildId = interaction.guildId;
  const sub = interaction.options.getSubcommand();
  const settings = store.get(guildId);
  const pomodoro = voiceTools.pomodoro;

  if (sub === "stop") return reply(pomodoro.stop(guildId) ? "🍅 The focus session is stopped." : "There is no focus session running.");
  if (sub === "status") {
    const s = pomodoro.status(guildId);
    return reply(s ? `🍅 ${s.phase === "work" ? "Working" : "On a break"}: round ${s.round} of ${s.rounds}, about ${s.minutesLeft} minute${s.minutesLeft === 1 ? "" : "s"} left.` : "There is no focus session running.");
  }

  const rooms = roomsOf(settings);
  if (!rooms.length) return reply("The companions are not sitting in a voice channel yet. A manager can use `/companions voice join`.");
  if (!settings.channelId) return reply("Pick a chat channel first with `/companions setup`, that is where the steps are announced.");
  if (!rooms.some((r) => r.channelId === interaction.member?.voice?.channelId)) return reply(`Join one of the rooms the companions sit in (${rooms.map((r) => `<#${r.channelId}>`).join(", ")}) first, the focus session belongs to it.`);
  if (!keeper.assigned(guildId).length) return reply("No companion can reach that voice channel right now.");
  const started = pomodoro.start(guildId, {
    work: interaction.options.getInteger("work") ?? undefined,
    brk: interaction.options.getInteger("break") ?? undefined,
    rounds: interaction.options.getInteger("rounds") ?? undefined,
  });
  if (!started.ok) return reply("A focus session is already running. Use `/pomodoro stop` to end it.");
  await reply("🍅 Started. The steps are announced in the chat channel.");
  await say({ guildId, text: voiceTools.startText(guildId, started.session) });
}

async function handleRemind(interaction, { reminders }) {
  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
  const guildId = interaction.guildId;
  const kind = interaction.commandName === "event" ? "event" : "remind";
  const sub = interaction.options.getSubcommand();
  const label = kind === "event" ? "event" : "reminder";
  const mine = () => reminders.list(guildId, interaction.user.id, kind);

  if (sub === "list") {
    const items = mine();
    if (!items.length) return reply(`No ${label}s waiting.`);
    return reply(items.map((i, n) => `**${n + 1}.** <t:${Math.floor(i.at / 1000)}:R>: ${i.text}`).join("\n"));
  }
  if (sub === "cancel") {
    const item = mine()[interaction.options.getInteger("number", true) - 1];
    return reply(item && reminders.cancel(guildId, item.userId, item.id) ? `🗑️ Cancelled.` : `There is no ${label} with that number.`);
  }

  const inMs = parseDuration(interaction.options.getString("in", true));
  if (inMs === null) return reply("I could not read that time. Use something like 10m, 2h, 1d or 1d12h.");
  try {
    const item = reminders.add({
      kind,
      guildId,
      channelId: interaction.channelId,
      userId: interaction.user.id,
      inMs,
      text: interaction.options.getString(kind === "event" ? "name" : "text", true),
      now: Date.now(),
    });
    return reply(kind === "event" ? `📅 Event added: <t:${Math.floor(item.at / 1000)}:F> (<t:${Math.floor(item.at / 1000)}:R>). It will be announced in this channel.` : `⏰ I will remind you <t:${Math.floor(item.at / 1000)}:R> in this channel.`);
  } catch (error) {
    if (error instanceof ReminderError) return reply(`⚠️ ${error.message}`);
    throw error;
  }
}

async function handleCommand(interaction, { store, engine, slots, timezone, usage, custom, reminders, keeper, voicePort, seedVoiceGuild, forgetGuild, say, updatePresence }) {
  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
  const guildId = interaction.guildId;
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();
  const settings = store.get(guildId);

  if (group === "content") return handleContent(interaction, { custom, guildId, sub, reply });

  if (group === "data") {
    if (sub === "export") {
      const payload = { exportedAt: new Date().toISOString(), settings: store.saved(guildId), customContent: custom.exportGuild(guildId), upcomingEvents: reminders.list(guildId, null, "event").length };
      return interaction.reply({
        content: "📦 Your server's settings and the content you added. Scores, voice time and counters are not included.",
        files: [{ attachment: Buffer.from(JSON.stringify(payload, null, 2)), name: `companions-${guildId}.json` }],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (!interaction.options.getBoolean("confirm", true)) return reply("Nothing was erased. Run the command again with `confirm:true` if you are sure.");
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await keeper.removeRoom(guildId);
    const erased = forgetGuild(guildId);
    return interaction.editReply(erased ? "🗑️ Everything stored about this server was erased. The bots will stay silent until you run `/companions setup` again." : "There was nothing stored about this server.");
  }

  if (group === "voice") {
    if (sub === "join") {
      const channel = interaction.options.getChannel("channel", true);
      const count = interaction.options.getInteger("bots") ?? 1;
      if (!voicePort.candidates(guildId, channel.id).length) return reply(`⚠️ No companion can see and connect to ${channel}. Give them View Channel and Connect there (bots invited before this feature may need the Connect permission added to their role). Nothing was changed.`);
      keeper.setRoom(guildId, channel.id, count);
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await keeper.tick();
      seedVoiceGuild(guildId);
      return interaction.editReply(`🎧 Saved.\n${voiceSummary(keeper.status(guildId), slots)}`);
    }
    if (sub === "leave") {
      const channel = interaction.options.getChannel("channel");
      if (channel && !isVoiceRoom(settings, channel.id)) return reply(`The companions are not sitting in ${channel}.`);
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await keeper.removeRoom(guildId, channel?.id ?? null);
      await keeper.tick();
      const left = keeper.status(guildId);
      return interaction.editReply(left.rooms.length ? `👋 Removed ${channel}. Its companions are free again, the other rooms did not change.\n${voiceSummary(left, slots)}` : "👋 The companions left every voice room and will not come back until you use `/companions voice join` again.");
    }
    if (sub === "greet") {
      const enabled = interaction.options.getBoolean("enabled", true);
      store.update(guildId, { voiceGreet: enabled });
      return reply(enabled ? "👋 They will say hi in the chat channel when someone joins the voice channel." : "🔇 No more greetings for people joining the voice channel.");
    }
    if (sub === "camera") {
      const enabled = interaction.options.getBoolean("enabled", true);
      store.update(guildId, { camera: enabled });
      updatePresence();
      if (settings.enabled && settings.channelId && keeper.assigned(guildId).length) {
        const lines = getTools(settings.language)[enabled ? "cameraOn" : "cameraOff"];
        say({ guildId, text: lines[Math.floor(Math.random() * lines.length)] }).catch(() => {});
      }
      return reply(enabled ? "📹 Camera sign on. The companions in a voice room show it under their name. It is only a sign: bots cannot send real video." : "📴 Camera sign off.");
    }
    const status = keeper.status(guildId);
    return reply(status.rooms.length ? `${voiceSummary(status, slots)}\nGreetings: ${settings.voiceGreet ? "on" : "off"}. Camera sign: ${settings.camera ? "on" : "off"}.` : "The companions are not sitting in any voice channel. Use `/companions voice join`.");
  }

  if (sub === "titles") {
    const enabled = interaction.options.getBoolean("enabled", true);
    store.update(guildId, { titles: enabled });
    return reply(enabled ? "🎧 When someone reaches 5 hours in the voice room in a week, a bot says so once. No roles are changed." : "🔇 No more voice regular announcements.");
  }

  if (sub === "recap") {
    const enabled = interaction.options.getBoolean("enabled", true);
    store.update(guildId, { recap: enabled });
    return reply(enabled ? "📰 Every Monday morning (10:00 and later) the bots post a short recap of the week before: conversations, trivia champion and voice time." : "🔇 No more weekly recaps.");
  }

  if (sub === "welcome") {
    const enabled = interaction.options.getBoolean("enabled", true);
    store.update(guildId, { welcome: enabled });
    return reply(enabled ? "👋 New members get a funny welcome and an icebreaker in the chat channel. This works when the server's join messages are on (Server Settings, System Messages)." : "🔇 No more welcome messages.");
  }

  if (sub === "setup") {
    const channel = interaction.options.getChannel("channel", true);
    const language = interaction.options.getString("language") ?? settings.language;
    if (!LANGUAGES.includes(language)) return reply("That language is not available.");
    store.update(guildId, { channelId: channel.id, language, enabled: true });

    const present = engine.status(guildId).botsAvailable;
    const warning =
      present < 2
        ? `\n⚠️ Only **${present}** companion bot${present === 1 ? " can" : "s can"} write in ${channel}. I need at least two. Invite the others and give them View Channel, Send Messages and Read Message History in that channel.`
        : "";
    return reply(`✅ Companions will chat in ${channel} (${language === "vi" ? "Tiếng Việt" : "English"}). The first conversation comes after a normal gap, or use \`/companions now\` to see one right away.${warning}`);
  }

  if (sub === "on" || sub === "off") {
    if (sub === "on" && !settings.channelId) return reply("Pick a channel first with `/companions setup`.");
    store.update(guildId, { enabled: sub === "on" });
    return reply(sub === "on" ? "✅ Companions are on." : "🔇 Companions are off. They will not say anything until you turn them back on.");
  }

  if (sub === "frequency") {
    const level = interaction.options.getString("level", true);
    store.update(guildId, { preset: level });
    return reply(`⏱️ Frequency set to **${PRESETS[level].label}**: a conversation every ${PRESETS[level].minGapMin / 60} to ${PRESETS[level].maxGapMin / 60} hours, at most ${PRESETS[level].dailyCap} a day.`);
  }

  if (sub === "quiet") {
    const from = interaction.options.getInteger("from", true);
    const until = interaction.options.getInteger("until", true);
    store.update(guildId, { quietStart: from, quietEnd: until });
    return reply(from === until ? "🔔 No quiet hours: they may speak at any time." : `🤫 Quiet from ${from}:00 to ${until}:00 (${timezone}).`);
  }

  if (sub === "qotd") {
    const hour = interaction.options.getInteger("hour");
    store.update(guildId, { qotdHour: hour });
    return reply(hour === null ? "🗓️ The question of the day is off." : `🗓️ A question of the day will be posted every day at ${hour}:00 (${timezone}), even during quiet hours.`);
  }

  if (sub === "toggle") {
    const what = interaction.options.getString("what", true);
    const enabled = interaction.options.getBoolean("enabled", true);
    store.update(guildId, { [what]: enabled });
    return reply(`${{ trivia: "🧠 Trivia rounds", polls: "📊 Polls", adaptive: "🎯 Adaptive tuning" }[what]} ${what === "adaptive" ? "is" : "are"} now ${enabled ? "on" : "off"}.`);
  }

  if (sub === "now") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await engine.startNow(guildId, { kind: interaction.options.getString("kind") });
    return interaction.editReply(result.started ? "💬 Started a conversation. Watch the channel." : `Could not start: ${result.reason}`);
  }

  if (sub === "stats") {
    const days = interaction.options.getInteger("days") ?? 7;
    const summary = usage.summary(guildId, engine.today(), days);
    return reply(formatStats(summary, { adaptive: settings.adaptive !== false, weights: adaptiveWeights(usage.summary(guildId, engine.today(), 30)) }));
  }

  // status
  const status = engine.status(guildId);
  const lines = [
    `**Companions:** ${settings.enabled ? "on" : "off"}`,
    `**Channel:** ${settings.channelId ? `<#${settings.channelId}>` : "not set (use `/companions setup`)"}`,
    `**Language:** ${settings.language === "vi" ? "Tiếng Việt" : "English"}`,
    `**Frequency:** ${PRESETS[settings.preset]?.label ?? "Normal"}, today ${status.startsToday} of ${status.dailyCap}`,
    `**Quiet hours:** ${settings.quietStart === settings.quietEnd ? "none" : `${settings.quietStart}:00 to ${settings.quietEnd}:00`} (${timezone})`,
    `**Question of the day:** ${settings.qotdHour === null || settings.qotdHour === undefined ? "off" : `every day at ${settings.qotdHour}:00`}`,
    `**Trivia:** ${settings.trivia === false ? "off" : "on"}, **polls:** ${settings.polls === false ? "off" : "on"}`,
    `**Weekly recap:** ${settings.recap ? "on" : "off"}, **voice rooms:** ${roomsOf(settings).length ? roomsOf(settings).map((r) => `<#${r.channelId}> (${r.bots})`).join(", ") : "none"}, **welcome:** ${settings.welcome ? "on" : "off"}`,
    `**Seasonal packs today:** ${activeSeasons(localParts(Date.now(), timezone).day).join(", ") || "none"}`,
    `**Your own content:** ${custom.count(guildId)} entries`,
    `**Bots that can write there:** ${status.botsAvailable} of ${slots.length}`,
    status.talking ? "Right now: in the middle of a conversation." : status.nextStartInMs === null ? "" : `Next conversation: in about ${hoursText(status.nextStartInMs)}, if it is not quiet hours.`,
  ].filter(Boolean);
  return reply(lines.join("\n"));
}

async function handleContent(interaction, { custom, guildId, sub, reply }) {
  const opt = (name) => interaction.options.getString(name);
  try {
    if (sub === "add-question") {
      const e = custom.add(guildId, "question", { text: opt("text") });
      return reply(`✅ Added question #${custom.list(guildId, "question").length}: ${e.text}`);
    }
    if (sub === "add-joke") {
      const e = custom.add(guildId, "joke", { setup: opt("setup"), punchline: opt("punchline") });
      return reply(`✅ Added joke #${custom.list(guildId, "joke").length}: ${e.setup} → ${e.punchline}`);
    }
    if (sub === "add-fact") {
      const e = custom.add(guildId, "fact", { text: opt("text") });
      return reply(`✅ Added fact #${custom.list(guildId, "fact").length}: ${e.text}`);
    }
    if (sub === "add-poll") {
      const e = custom.add(guildId, "poll", { question: opt("question"), options: opt("options").split("|") });
      return reply(`✅ Added poll #${custom.list(guildId, "poll").length}: ${e.question} (${e.options.join(" / ")})`);
    }
    if (sub === "list") {
      const kind = opt("kind");
      return reply(formatContentList(kind, custom.list(guildId, kind)));
    }
    const removed = custom.remove(guildId, opt("kind"), interaction.options.getInteger("number", true));
    return reply(removed ? `🗑️ Removed it.` : "There is no entry with that number.");
  } catch (error) {
    if (error instanceof CustomError) return reply(`⚠️ ${error.message}`);
    throw error;
  }
}

export { createSettingsStore, validTimeZone };
