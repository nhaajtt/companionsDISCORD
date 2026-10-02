// Connects the companion engine to Discord: several bot accounts in one process, typing indicators, replies, polls,
// trivia buttons, and the /companions (managers) and /trivia (everyone) commands, registered on the first bot only.
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { CustomError, KINDS as CUSTOM_KINDS } from "./custom.js";
import { CompanionEngine } from "./engine.js";
import { formatContentList, formatStats, formatTop, hoursText } from "./format.js";
import { LANGUAGES, PRESETS, createSettingsStore, validTimeZone } from "./settings.js";
import { getContent } from "./content/index.js";

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
      .setDescription("Turn trivia rounds or polls on or off")
      .addStringOption((o) => o.setName("what").setDescription("Which one").setRequired(true).addChoices({ name: "Trivia rounds", value: "trivia" }, { name: "Polls", value: "polls" }))
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
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
  .addSubcommand((s) => s.setName("forget").setDescription("Erase your trivia scores from every server"));

const REQUIRED = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory];

/** The text of a trivia message: the question, then the four options. The buttons only carry the letters. */
function triviaText({ label, question, options }) {
  return `${label ?? "🧠 Trivia"}\n**${question}**\n${options.map((o, i) => `**${LETTERS[i]})** ${o}`).join("\n")}`;
}

/** Starts every companion bot and the engine. `tokens` are bot tokens; the first one hosts the slash commands. */
export async function startCompanions({ tokens, store, usage, scores, custom, timezone, log = console.log }) {
  const slots = [];

  for (const [slot, token] of tokens.entries()) {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
    client.once(Events.ClientReady, (c) => log(`Companion ${slot + 1} is online as ${c.user.tag}`));
    try {
      await client.login(token);
      slots.push({ slot, client });
    } catch (error) {
      console.error(`Companion ${slot + 1} could not log in (${error.message}). Skipping it.`);
      client.destroy();
    }
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

    async send({ slot, guildId, channelId, text, replyTo, poll, trivia }) {
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

        const message = await channel.send({ content: text, reply, allowedMentions: NO_PINGS });
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

  const content = (language, guildId) => custom.merge(getContent(language), guildId);
  const engine = new CompanionEngine({ store, content, bots, timezone, log, usage, scores });

  for (const { client } of slots) {
    // Every bot hears every message; the engine ignores duplicates. Bots (including the companions) are never "people".
    client.on(Events.MessageCreate, (message) => {
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

  // The slash commands live on the first bot, registered per server so they show up immediately
  const host = slots[0].client;
  // Registration is retried because the network (DNS in particular) can hiccup right after the container starts
  const registerFor = async (guild) => {
    for (let attempt = 1; attempt <= REGISTER_ATTEMPTS; attempt++) {
      try {
        await guild.commands.set([companionsCommand.toJSON(), triviaCommand.toJSON()]);
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
    if (!interaction.isChatInputCommand() || !["companions", "trivia"].includes(interaction.commandName)) return;
    const handler = interaction.commandName === "trivia" ? handleTrivia : handleCommand;
    handler(interaction, { store, engine, slots, timezone, usage, scores, custom }).catch(async (error) => {
      console.error(`/${interaction.commandName} failed:`, error);
      const payload = { content: "Something went wrong with that command.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    });
  });

  const timer = setInterval(() => engine.tick().catch((e) => console.error("Companions tick failed:", e)), TICK_MS);
  timer.unref?.();
  log(`Companions running with ${slots.length} bots. Time zone: ${timezone}.`);

  return {
    engine,
    stop: async () => {
      clearInterval(timer);
      await Promise.all(slots.map(({ client }) => client.destroy()));
    },
  };
}

async function handleTrivia(interaction, { engine, scores, store }) {
  const guildId = interaction.guildId;
  const sub = interaction.options.getSubcommand();
  const labels = getContent(store.get(guildId).language).labels;

  if (sub === "forget") {
    const erased = scores.forget(interaction.user.id);
    return interaction.reply({ content: erased ? labels.forgetDone : labels.forgetNone, flags: MessageFlags.Ephemeral });
  }

  const period = interaction.options.getString("period") ?? "week";
  const entries = scores.top(guildId, { day: period === "week" ? engine.today() : null, limit: 10 });
  if (!entries.length) return interaction.reply({ content: labels.topEmpty, flags: MessageFlags.Ephemeral });
  return interaction.reply({ content: formatTop(entries, period === "week" ? labels.topWeek : labels.topAll), allowedMentions: { parse: [] } });
}

async function handleCommand(interaction, { store, engine, slots, timezone, usage, custom }) {
  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
  const guildId = interaction.guildId;
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();
  const settings = store.get(guildId);

  if (group === "content") return handleContent(interaction, { custom, guildId, sub, reply });

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
    return reply(`${what === "trivia" ? "🧠 Trivia rounds" : "📊 Polls"} are now ${enabled ? "on" : "off"}.`);
  }

  if (sub === "now") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await engine.startNow(guildId, { kind: interaction.options.getString("kind") });
    return interaction.editReply(result.started ? "💬 Started a conversation. Watch the channel." : `Could not start: ${result.reason}`);
  }

  if (sub === "stats") {
    const days = interaction.options.getInteger("days") ?? 7;
    return reply(formatStats(usage.summary(guildId, engine.today(), days)));
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
