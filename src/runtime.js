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
import { LANGUAGES, PRESETS, createSettingsStore, isQuietHour, localParts, validTimeZone } from "./settings.js";
import { VoiceKeeper, isVoiceRoom, roomsOf } from "./voice.js";
import { buildPraise } from "./praise.js";
import { buildDebate } from "./debate.js";
import { buildBirthday, createBirthdayStore } from "./birthdays.js";
import { buildGreeting, greetingDue, localMinuteOfDay } from "./greetings.js";
import { pickGossip, rememberScene } from "./gossip.js";
import { MOOD_EMOJI, MOOD_NAME, moodBoard, moodNotesFor, moodOf } from "./mood.js";
import { WAVE_EMOJI, buildWave } from "./wave.js";
import { PREDICT_LIMITS, Predictions, announceText, closedText, planBets, predictLine, resultText } from "./predict.js";
import { timeNotesFor } from "./timenotes.js";
import { pickScene } from "./drama.js";
import { HYPE_LIMITS, HypeSessions } from "./hype.js";
import { createPraiseStore } from "./praisestats.js";
import { TSUNDERE_CHANCE, tsundereLine, tsundereStage } from "./tsundere.js";
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
      .setName("drama")
      .setDescription("Every evening two companions that fit together act out a short scene in the chat channel")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("tamchuyen")
      .setDescription("Now and then a few companions chat among themselves in the chat channel, like a group chat")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("autohype")
      .setDescription("The companions cheer by themselves when someone starts a Go Live stream in voice")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("chaohoi")
      .setDescription("Two or three companions say good morning and good night in the chat channel, once a day each")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("reactions")
      .setDescription("Now and then a companion leaves a warm reaction on a member's message (needs Add Reactions)")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("sinhnhat")
      .setDescription("Sing for the members who saved their birthday with /sinhnhat set")
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
      .setName("ai")
      .setDescription("Optional Gemini features (the host needs to have set a key)")
      .addSubcommand((s) =>
        s
          .setName("replies")
          .setDescription("A companion answers when someone mentions it or replies to it in the companions channel")
          .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
      )
      .addSubcommand((s) =>
        s
          .setName("daily")
          .setDescription("Once a day a companion posts a riddle, a question or a would-you-rather")
          .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)),
      )
      .addSubcommand((s) => s.setName("status").setDescription("Which AI features are on, and how many answers were used today")),
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

// Moving the whole crowd is for people who may move members; a server can change that in Integrations
export const randomCommand = new SlashCommandBuilder()
  .setName("random")
  .setDescription("Send the companions to random voice channels")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
  .addIntegerOption((o) => o.setName("bots").setDescription("How many companions go (default: all of them)").setMinValue(1).setMaxValue(30));

export const assembleCommand = new SlashCommandBuilder()
  .setName("assemble")
  .setDescription("Call the companions to the voice channel you are in")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
  .addIntegerOption((o) => o.setName("bots").setDescription("How many companions come (default: all of them)").setMinValue(1).setMaxValue(30));

// Anyone can use it (a server can restrict it in Integrations): every companion cheers in the channel where it was typed
export const khenCommand = new SlashCommandBuilder()
  .setName("khen")
  .setDescription("Every companion cheers on the player, in this channel")
  .setDescriptionLocalizations({ vi: "Tất cả các bot cùng khen người đang chơi, ngay trong kênh này" })
  .setDMPermission(false)
  .addUserOption((o) =>
    o.setName("nguoi").setDescription("Pick the player from the server, the bots say their name").setDescriptionLocalizations({ vi: "Chọn người chơi trong server, các bot sẽ gọi tên người đó" }),
  )
  .addStringOption((o) =>
    o
      .setName("goi")
      .setDescription("How the bots call the player (default: anh)")
      .setDescriptionLocalizations({ vi: "Các bot gọi người chơi là gì (mặc định: anh)" })
      .addChoices({ name: "anh", value: "anh" }, { name: "chị", value: "chị" }, { name: "bạn", value: "bạn" }),
  )
  .addStringOption((o) =>
    o.setName("ten").setDescription("Or type a name for the bots to say").setDescriptionLocalizations({ vi: "Hoặc gõ một cái tên để các bot gọi" }).setMaxLength(30),
  )
  .addStringOption((o) =>
    o
      .setName("language")
      .setDescription("Language of the cheers (default: Vietnamese)")
      .setDescriptionLocalizations({ vi: "Ngôn ngữ lời khen (mặc định: Tiếng Việt)" })
      .addChoices({ name: "Tiếng Việt", value: "vi" }, { name: "English", value: "en" }),
  );

// The same options as /khen, for a friendly roast of the player instead
export const cheCommand = new SlashCommandBuilder()
  .setName("che")
  .setDescription("Every companion teases the player a little, in this channel")
  .setDescriptionLocalizations({ vi: "Tất cả các bot cùng chê nhẹ người đang chơi, ngay trong kênh này" })
  .setDMPermission(false)
  .addUserOption((o) =>
    o.setName("nguoi").setDescription("Pick the player from the server, the bots say their name").setDescriptionLocalizations({ vi: "Chọn người chơi trong server, các bot sẽ gọi tên người đó" }),
  )
  .addStringOption((o) =>
    o
      .setName("goi")
      .setDescription("How the bots call the player (default: anh)")
      .setDescriptionLocalizations({ vi: "Các bot gọi người chơi là gì (mặc định: anh)" })
      .addChoices({ name: "anh", value: "anh" }, { name: "chị", value: "chị" }, { name: "bạn", value: "bạn" }),
  )
  .addStringOption((o) =>
    o.setName("ten").setDescription("Or type a name for the bots to say").setDescriptionLocalizations({ vi: "Hoặc gõ một cái tên để các bot gọi" }).setMaxLength(30),
  )
  .addStringOption((o) =>
    o
      .setName("language")
      .setDescription("Language of the teasing (default: Vietnamese)")
      .setDescriptionLocalizations({ vi: "Ngôn ngữ lời chê (mặc định: Tiếng Việt)" })
      .addChoices({ name: "Tiếng Việt", value: "vi" }, { name: "English", value: "en" }),
  );

const GOI_CHOICES = [{ name: "anh", value: "anh" }, { name: "chị", value: "chị" }, { name: "bạn", value: "bạn" }];
const LANGUAGE_CHOICES = [{ name: "Tiếng Việt", value: "vi" }, { name: "English", value: "en" }];

/** /clutch and /fail: the same options as /khen. */
const cheerEvent = (name, en, vi) =>
  new SlashCommandBuilder()
    .setName(name)
    .setDescription(en)
    .setDescriptionLocalizations({ vi })
    .setDMPermission(false)
    .addUserOption((o) => o.setName("nguoi").setDescription("Pick the player from the server, the bots say their name").setDescriptionLocalizations({ vi: "Chọn người chơi trong server, các bot sẽ gọi tên người đó" }))
    .addStringOption((o) => o.setName("goi").setDescription("How the bots call the player (default: anh)").setDescriptionLocalizations({ vi: "Các bot gọi người chơi là gì (mặc định: anh)" }).addChoices(...GOI_CHOICES))
    .addStringOption((o) => o.setName("ten").setDescription("Or type a name for the bots to say").setDescriptionLocalizations({ vi: "Hoặc gõ một cái tên để các bot gọi" }).setMaxLength(30))
    .addStringOption((o) => o.setName("language").setDescription("Language (default: Vietnamese)").setDescriptionLocalizations({ vi: "Ngôn ngữ (mặc định: Tiếng Việt)" }).addChoices(...LANGUAGE_CHOICES));
export const clutchCommand = cheerEvent("clutch", "Every companion goes wild for a clutch play", "Tất cả các bot cùng hét lên vì một pha clutch");
export const failCommand = cheerEvent("fail", "Every companion comforts (and teases a little) after a fail", "Tất cả các bot cùng an ủi sau một pha hỏng");

export const hypeCommand = new SlashCommandBuilder()
  .setName("hype")
  .setDescription("The companions keep cheering on their own for a while")
  .setDescriptionLocalizations({ vi: "Các bot tự cổ vũ liên tục trong một lúc" })
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName("start")
      .setDescription("Start cheering in this channel, one bot every 20 to 45 seconds")
      .setDescriptionLocalizations({ vi: "Bắt đầu cổ vũ trong kênh này, mỗi 20 đến 45 giây một bot" })
      .addIntegerOption((o) => o.setName("minutes").setDescription("How long (5 to 60, default 15)").setDescriptionLocalizations({ vi: "Trong bao lâu (5 đến 60 phút, mặc định 15)" }).setMinValue(HYPE_LIMITS.minMinutes).setMaxValue(HYPE_LIMITS.maxMinutes))
      .addStringOption((o) =>
        o.setName("mood").setDescription("Praise (default), tease, or a mix").setDescriptionLocalizations({ vi: "Khen (mặc định), chê, hoặc trộn" }).addChoices({ name: "khen", value: "praise" }, { name: "chê", value: "tease" }, { name: "trộn", value: "mix" }),
      )
      .addUserOption((o) => o.setName("nguoi").setDescription("Pick the player from the server, the bots say their name").setDescriptionLocalizations({ vi: "Chọn người chơi trong server, các bot sẽ gọi tên người đó" }))
      .addStringOption((o) => o.setName("goi").setDescription("How the bots call the player (default: anh)").setDescriptionLocalizations({ vi: "Các bot gọi người chơi là gì (mặc định: anh)" }).addChoices(...GOI_CHOICES))
      .addStringOption((o) => o.setName("ten").setDescription("Or type a name for the bots to say").setDescriptionLocalizations({ vi: "Hoặc gõ một cái tên để các bot gọi" }).setMaxLength(30))
      .addStringOption((o) => o.setName("language").setDescription("Language (default: Vietnamese)").setDescriptionLocalizations({ vi: "Ngôn ngữ (mặc định: Tiếng Việt)" }).addChoices(...LANGUAGE_CHOICES)),
  )
  .addSubcommand((s) => s.setName("stop").setDescription("Stop cheering in this channel").setDescriptionLocalizations({ vi: "Dừng cổ vũ trong kênh này" }));

export const tranhluanCommand = new SlashCommandBuilder()
  .setName("tranhluan")
  .setDescription("The companions split into two camps and argue about a or b")
  .setDescriptionLocalizations({ vi: "Các bot chia hai phe tranh luận xem a hay b" })
  .setDMPermission(false)
  .addStringOption((o) => o.setName("a").setDescription("The first side, for example pho").setDescriptionLocalizations({ vi: "Phe thứ nhất, ví dụ phở" }).setRequired(true).setMaxLength(30))
  .addStringOption((o) => o.setName("b").setDescription("The second side, for example bun").setDescriptionLocalizations({ vi: "Phe thứ hai, ví dụ bún" }).setRequired(true).setMaxLength(30))
  .addStringOption((o) => o.setName("language").setDescription("Language (default: Vietnamese)").setDescriptionLocalizations({ vi: "Ngôn ngữ (mặc định: Tiếng Việt)" }).addChoices(...LANGUAGE_CHOICES));

export const dramaCommand = new SlashCommandBuilder()
  .setName("drama")
  .setDescription("Two companions that fit together act out a short scene in this channel")
  .setDescriptionLocalizations({ vi: "Hai bot hợp nhau diễn một cảnh ngắn trong kênh này" })
  .setDMPermission(false)
  .addStringOption((o) =>
    o
      .setName("couple")
      .setDescription("Which pair (default: any that can write here)")
      .setDescriptionLocalizations({ vi: "Cặp nào (mặc định: cặp nào viết được ở đây)" })
      .addChoices({ name: "Lai Bâng và Six", value: "lai-six" }, { name: "Trường Giang và Nhã Phương", value: "giang-phuong" }, { name: "furyZ và Chamy", value: "fury-chamy" }),
  )
  .addStringOption((o) => o.setName("language").setDescription("Language (default: this server's language)").setDescriptionLocalizations({ vi: "Ngôn ngữ (mặc định: ngôn ngữ của server)" }).addChoices(...LANGUAGE_CHOICES));

const GOSSIP_TOPICS = [
  ["ngẫu nhiên", ""],
  ["ăn uống", "food"],
  ["game", "game"],
  ["ngủ nghỉ", "sleep"],
  ["tình yêu", "love"],
  ["chuyện trong server", "server"],
  ["thời tiết", "weather"],
  ["than thở", "rant"],
  ["chủ bot", "owner"],
  ["tiền bạc", "money"],
  ["thú cưng", "pets"],
  ["âm nhạc", "music"],
  ["học hành", "study"],
  ["thời trang", "fashion"],
  ["công nghệ", "tech"],
  ["công việc", "work"],
  ["vui vẻ linh tinh", "fun"],
].filter(([, value]) => value);

export const tamchuyenCommand = new SlashCommandBuilder()
  .setName("tamchuyen")
  .setDescription("The companions chat among themselves like friends in a group chat")
  .setDescriptionLocalizations({ vi: "Các bot tám chuyện với nhau như một nhóm bạn" })
  .setDMPermission(false)
  .addStringOption((o) =>
    o
      .setName("chude")
      .setDescription("The topic (default: any)")
      .setDescriptionLocalizations({ vi: "Chủ đề (mặc định: bất kỳ)" })
      .addChoices(...GOSSIP_TOPICS.map(([name, value]) => ({ name, value }))),
  )
  .addStringOption((o) => o.setName("language").setDescription("Language (default: this server's language)").setDescriptionLocalizations({ vi: "Ngôn ngữ (mặc định: ngôn ngữ của server)" }).addChoices(...LANGUAGE_CHOICES));

export const dudoanCommand = new SlashCommandBuilder()
  .setName("dudoan")
  .setDescription("Predict whether the player wins or loses the next round")
  .setDescriptionLocalizations({ vi: "Dự đoán người chơi sẽ thắng hay thua ván tới" })
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName("start")
      .setDescription("Open a prediction: members press a button, and some companions bet too")
      .setDescriptionLocalizations({ vi: "Mở dự đoán: mọi người bấm nút, và một số bot cũng đặt cược" })
      .addIntegerOption((o) => o.setName("minutes").setDescription("How long votes are taken (1 to 10, default 3)").setDescriptionLocalizations({ vi: "Nhận dự đoán trong bao lâu (1 đến 10 phút, mặc định 3)" }).setMinValue(PREDICT_LIMITS.minMinutes).setMaxValue(PREDICT_LIMITS.maxMinutes))
      .addUserOption((o) => o.setName("nguoi").setDescription("Pick the player from the server").setDescriptionLocalizations({ vi: "Chọn người chơi trong server" }))
      .addStringOption((o) => o.setName("ten").setDescription("Or type the player's name").setDescriptionLocalizations({ vi: "Hoặc gõ tên người chơi" }).setMaxLength(30))
      .addStringOption((o) => o.setName("goi").setDescription("How the bots call the player (default: anh)").setDescriptionLocalizations({ vi: "Các bot gọi người chơi là gì (mặc định: anh)" }).addChoices(...GOI_CHOICES))
      .addStringOption((o) => o.setName("language").setDescription("Language (default: Vietnamese)").setDescriptionLocalizations({ vi: "Ngôn ngữ (mặc định: Tiếng Việt)" }).addChoices(...LANGUAGE_CHOICES)),
  )
  .addSubcommand((s) =>
    s
      .setName("result")
      .setDescription("Tell the result: the companions react and the winners are listed")
      .setDescriptionLocalizations({ vi: "Báo kết quả: các bot phản ứng và liệt kê người đoán đúng" })
      .addStringOption((o) =>
        o.setName("outcome").setDescription("Did the player win or lose?").setDescriptionLocalizations({ vi: "Người chơi thắng hay thua?" }).setRequired(true).addChoices({ name: "thắng", value: "win" }, { name: "thua", value: "lose" }),
      ),
  );

export const lamsongCommand = new SlashCommandBuilder()
  .setName("lamsong")
  .setDescription("The companions do a stadium wave of emoji, one after another")
  .setDescriptionLocalizations({ vi: "Các bot làm một làn sóng emoji, lần lượt từng bạn" })
  .setDMPermission(false)
  .addStringOption((o) =>
    o
      .setName("emoji")
      .setDescription("Which emoji (default: fire)")
      .setDescriptionLocalizations({ vi: "Emoji nào (mặc định: lửa)" })
      .addChoices(...WAVE_EMOJI.map((emoji) => ({ name: emoji, value: emoji }))),
  )
  .addUserOption((o) => o.setName("nguoi").setDescription("Pick the player the chant is for").setDescriptionLocalizations({ vi: "Chọn người chơi mà tiếng hô dành cho" }))
  .addStringOption((o) => o.setName("ten").setDescription("Or type a name for the chant").setDescriptionLocalizations({ vi: "Hoặc gõ một cái tên cho tiếng hô" }).setMaxLength(30))
  .addStringOption((o) => o.setName("language").setDescription("Language (default: Vietnamese)").setDescriptionLocalizations({ vi: "Ngôn ngữ (mặc định: Tiếng Việt)" }).addChoices(...LANGUAGE_CHOICES));

export const sinhnhatCommand = new SlashCommandBuilder()
  .setName("sinhnhat")
  .setDescription("Your birthday: a few companions sing for you in the chat channel (when the server turned it on)")
  .setDescriptionLocalizations({ vi: "Sinh nhật của bạn: vài bot sẽ hát chúc mừng trong kênh chat (khi server đã bật)" })
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName("set")
      .setDescription("Save your birthday (day and month only, no year)")
      .setDescriptionLocalizations({ vi: "Lưu sinh nhật của bạn (chỉ ngày và tháng, không có năm)" })
      .addIntegerOption((o) => o.setName("ngay").setDescription("Day (1 to 31)").setDescriptionLocalizations({ vi: "Ngày (1 đến 31)" }).setRequired(true).setMinValue(1).setMaxValue(31))
      .addIntegerOption((o) => o.setName("thang").setDescription("Month (1 to 12)").setDescriptionLocalizations({ vi: "Tháng (1 đến 12)" }).setRequired(true).setMinValue(1).setMaxValue(12)),
  )
  .addSubcommand((s) => s.setName("remove").setDescription("Erase your birthday").setDescriptionLocalizations({ vi: "Xóa sinh nhật của bạn" }))
  .addSubcommand((s) => s.setName("list").setDescription("The next birthdays in this server (names only)").setDescriptionLocalizations({ vi: "Các sinh nhật sắp tới trong server (chỉ hiện tên)" }));

export const tamtrangCommand = new SlashCommandBuilder()
  .setName("tamtrang")
  .setDescription("The mood of every companion today")
  .setDescriptionLocalizations({ vi: "Hôm nay tâm trạng của từng bot ra sao" })
  .setDMPermission(false);

export const khenTopCommand = new SlashCommandBuilder()
  .setName("khen-top")
  .setDescription("Who was cheered and teased the most this week")
  .setDescriptionLocalizations({ vi: "Ai được khen và bị chê nhiều nhất tuần này" })
  .setDMPermission(false);

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
export async function startCompanions({ tokens, store, usage, scores, custom, hours, reminders, timezone, ai = null, ownerIds = new Map(), praise = createPraiseStore(), birthdays = createBirthdayStore(), alerter = { notify: async () => false }, log = console.log }) {
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

    async send({ slot, guildId, channelId, text, replyTo, poll, trivia, predict, pingUsers }) {
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

        if (predict) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dd:${predict.token}:win`).setLabel(predict.labels.win).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`dd:${predict.token}:lose`).setLabel(predict.labels.lose).setStyle(ButtonStyle.Danger),
          );
          const message = await channel.send({ content: text, components: [row], allowedMentions: NO_PINGS });
          return message.id;
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
    async edit({ slot, guildId, channelId, messageId, closeTrivia, disableButtons, content }) {
      const channel = channelOf(slot, guildId, channelId);
      if (!channel?.isTextBased() || (!closeTrivia && !disableButtons && content === undefined)) return;
      const message = await channel.messages.fetch(messageId);
      const payload = {};
      if (content !== undefined) payload.content = content;
      if (closeTrivia || disableButtons) {
        payload.components = message.components.map((row) => {
          const copy = ActionRowBuilder.from(row);
          copy.components.forEach((button) => button.setDisabled(true));
          return copy;
        });
      }
      await message.edit(payload);
    },
  };

  // /hype: the companions cheer on their own for a while, one at a time
  const hype = new HypeSessions({
    send: ({ key, slot, text }) => {
      const [guildId, channelId] = key.split(":");
      return bots.send({ slot, guildId, channelId, text });
    },
    log,
  });

  // /dudoan: members bet with buttons, some companions bet out loud; everything is kept in memory only
  const predictions = new Predictions({
    onClose: (session) => {
      if (!session.where) return;
      bots.edit({ ...session.where, content: closedText({ language: session.language, ten: session.ten, goi: session.goi, counts: predictions.counts(session.token) }), disableButtons: true }).catch(() => {});
    },
  });
  /** Updates the counts on the message with the buttons, at most once every 3 seconds. */
  const refreshPrediction = (session) => {
    if (!session.where || Date.now() - (session.lastEdit ?? 0) < 3000) return;
    session.lastEdit = Date.now();
    const minutes = Math.max(1, Math.ceil((session.closesAt - Date.now()) / 60_000));
    bots.edit({ ...session.where, content: announceText({ language: session.language, ten: session.ten, goi: session.goi, minutes, counts: predictions.counts(session.token) }) }).catch(() => {});
  };
  /** A press on a prediction button: Discord delivers it to the bot that sent the message. */
  const handlePredictVote = (interaction) => {
    const [, token, side] = interaction.customId.split(":");
    const session = predictions.get(token);
    const vi = (session?.language ?? "vi") !== "en";
    const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
    if (!session) return reply(vi ? "Dự đoán này đã kết thúc." : "This prediction is over.");
    const name = interaction.member?.displayName ?? interaction.user.globalName ?? interaction.user.username;
    const result = predictions.vote(token, interaction.user.id, name, side);
    if (!result.ok) return reply(result.reason === "closed" ? (vi ? "Đã hết giờ dự đoán." : "Voting is closed.") : "…");
    const picked = side === "win" ? (vi ? "thắng ✅" : "win ✅") : vi ? "thua ❌" : "lose ❌";
    reply(vi ? `Đã ghi nhận: bạn đoán ${picked}${result.changed ? " (đã đổi ý)" : ""}.` : `Got it: you picked ${picked}${result.changed ? " (changed your mind)" : ""}.`);
    refreshPrediction(session);
  };

  /** The companions that may react to messages in this channel (they were given the Add Reactions permission). */
  const reactors = (guildId, channelId) => {
    const needed = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions];
    return slots.filter(({ client }) => {
      const guild = client.guilds.cache.get(guildId);
      const channel = guild?.channels.cache.get(channelId);
      return Boolean(channel && guild.members.me && channel.permissionsFor(guild.members.me)?.has(needed));
    });
  };
  // Everyone else's messages: now and then one companion leaves a warm reaction (an owner gets the shy ones above instead)
  const WARM_REACTIONS = ["❤️", "😂", "👏", "🔥", "🥹", "😆", "✨", "💯", "🤝", "😍"];
  const lastWarmReaction = new Map(); // guildId -> time
  const maybeReactToMember = (message) => {
    if (ownerIds.has(message.author.id)) return;
    const settings = store.get(message.guildId);
    if (!settings.reactions || !settings.enabled || message.channelId !== settings.channelId) return;
    if (Date.now() - (lastWarmReaction.get(message.guildId) ?? 0) < 2 * 60_000 || Math.random() > 0.12) return;
    const able = reactors(message.guildId, message.channelId);
    if (!able.length) return;
    lastWarmReaction.set(message.guildId, Date.now());
    const { client } = able[Math.floor(Math.random() * able.length)];
    const emoji = WARM_REACTIONS[Math.floor(Math.random() * WARM_REACTIONS.length)];
    Promise.resolve(client.guilds.cache.get(message.guildId)?.channels.cache.get(message.channelId)?.messages.fetch(message.id))
      .then((target) => target?.react(emoji))
      .catch((error) => console.error("A warm reaction failed:", error.message));
  };

  // Good morning and good night: a little chain of two or three bots, once a day each, at a moment that respects the quiet hours
  const maybeGreet = async () => {
    const { hour, day } = localParts(Date.now(), timezone);
    const minuteOfDay = localMinuteOfDay(Date.now(), timezone);
    for (const [guildId, settings] of store.all()) {
      if (!settings.greetings || !settings.enabled || !settings.channelId) continue;
      for (const kind of ["morning", "night"]) {
        const doneKey = kind === "morning" ? "greetMorningDay" : "greetNightDay";
        if (settings[doneKey] === day || !greetingDue({ kind, guildId, day, minuteOfDay, settings })) continue;
        const channelKey = `${guildId}:${settings.channelId}`;
        if (hype.status(channelKey) || Date.now() - (lastPraise.get(channelKey) ?? 0) < PRAISE_COOLDOWN_MS) continue; // wait for a quieter moment
        const script = buildGreeting({ kind, language: settings.language, slots: bots.available(guildId, settings.channelId).map(({ slot }) => slot), day });
        if (!script) continue;
        store.update(guildId, { [doneKey]: day });
        playScript(bots, guildId, settings.channelId, script, { human: true }).catch((error) => console.error("The greeting stopped:", error.message));
      }
    }
  };

  // Birthdays: on the day, after the quiet hours, a few bots sing for the member (two birthdays at most per round)
  const maybeBirthdays = async () => {
    const { hour, day } = localParts(Date.now(), timezone);
    if (hour < 9 || hour >= 22) return;
    for (const [guildId, settings] of store.all()) {
      if (!settings.birthdays || !settings.enabled || !settings.channelId) continue;
      if (isQuietHour(hour, settings.quietStart, settings.quietEnd)) continue;
      for (const person of birthdays.due(guildId, day).slice(0, 2)) {
        const script = buildBirthday({ language: settings.language, userId: person.userId, slots: bots.available(guildId, settings.channelId).map(({ slot }) => slot) });
        if (!script) break;
        birthdays.markDone(guildId, person.userId, day);
        playScript(bots, guildId, settings.channelId, script, { human: true }).catch((error) => console.error("The birthday choir stopped:", error.message));
      }
    }
  };

  // The owners of the bots: when one of them was last around, so the companions can gossip about them, and the shy reactions
  const lastOwnerSeen = new Map(); // guildId -> { at, name }
  /** The display name of an owner who is in a voice channel or wrote lately in this server, else "". */
  const ownerNow = (guildId) => {
    const guild = hostClient.guilds.cache.get(guildId);
    for (const id of ownerIds.keys()) {
      const state = guild?.voiceStates.cache.get(id);
      if (state?.channelId) return state.member?.displayName ?? lastOwnerSeen.get(guildId)?.name ?? "";
    }
    const seen = lastOwnerSeen.get(guildId);
    return seen && Date.now() - seen.at < 3 * 3_600_000 ? seen.name : "";
  };
  const lastShyReaction = new Map(); // guildId -> time
  /** One companion looks at an owner's message and reacts for a moment, then takes the reaction back, as if nothing happened. */
  const shyReaction = async (client, guildId, channelId, messageId) => {
    const channel = client.guilds.cache.get(guildId)?.channels.cache.get(channelId);
    const target = await channel?.messages.fetch(messageId);
    if (!target) return;
    const emoji = ["👀", "🙄", "😏", "🤨"][Math.floor(Math.random() * 4)];
    const first = await target.react(emoji);
    await sleep(3000 + Math.random() * 5000);
    await first.users.remove(client.user.id);
    if (Math.random() < 0.25) {
      const slip = await target.react("💗");
      await sleep(2000);
      await slip.users.remove(client.user.id);
    }
  };
  const maybeReactToOwner = (message) => {
    if (!ownerIds.has(message.author.id)) return;
    lastOwnerSeen.set(message.guildId, { at: Date.now(), name: message.member?.displayName ?? message.author.globalName ?? message.author.username });
    const settings = store.get(message.guildId);
    if (!settings.enabled || message.channelId !== settings.channelId) return;
    if (Date.now() - (lastShyReaction.get(message.guildId) ?? 0) < 5 * 60_000 || Math.random() > 0.25) return;
    const able = reactors(message.guildId, message.channelId);
    if (!able.length) return; // the bots were invited without Add Reactions: nothing happens
    lastShyReaction.set(message.guildId, Date.now());
    const { client } = able[Math.floor(Math.random() * able.length)];
    shyReaction(client, message.guildId, message.channelId, message.id).catch((error) => console.error("A shy reaction failed:", error.message));
  };

  // Someone starts a Go Live stream in voice: the companions cheer in the chat channel by themselves until the stream ends
  const liveHypes = new Map(); // "guild:member" -> { key, at, until }
  const handleLive = (oldState, newState, member) => {
    const guildId = newState.guild.id;
    const settings = store.get(guildId);
    const id = `${guildId}:${member.id}`;
    const wasLive = Boolean(oldState.streaming);
    const isLive = Boolean(newState.streaming) && Boolean(newState.channelId);
    if (!wasLive && isLive) {
      if (!settings.autoHype || !settings.enabled || !settings.channelId) return;
      if (isQuietHour(localParts(Date.now(), timezone).hour, settings.quietStart, settings.quietEnd)) return;
      if (Date.now() - (liveHypes.get(id)?.at ?? 0) < 5 * 60_000) return; // someone who keeps toggling the stream does not restart it
      const here = bots.available(guildId, settings.channelId).map(({ slot }) => slot);
      if (!here.length) return;
      const key = `${guildId}:${settings.channelId}`;
      const started = hype.start({ key, minutes: HYPE_LIMITS.maxMinutes, mood: "praise", language: settings.language, goi: "bạn", ten: member.displayName, slots: here });
      if (started.ok) liveHypes.set(id, { key, at: Date.now(), until: started.until });
    } else if (wasLive && !isLive) {
      const entry = liveHypes.get(id);
      if (entry && Date.now() < entry.until) hype.stop(entry.key);
      liveHypes.delete(id);
    }
  };

  // Every so often a few companions start a group chat on their own (when the server turned it on)
  const GOSSIP_PER_DAY = { calm: 1, normal: 2, lively: 4 };
  const GOSSIP_GAP_MS = 90 * 60_000;
  const maybeGossip = async () => {
    const { hour, day } = localParts(Date.now(), timezone);
    if (hour < 10 || hour >= 22) return;
    for (const [guildId, settings] of store.all()) {
      if (!settings.gossip || !settings.enabled || !settings.channelId) continue;
      if (isQuietHour(hour, settings.quietStart, settings.quietEnd)) continue;
      const today = settings.gossipDay === day ? settings.gossipToday : 0;
      if (today >= (GOSSIP_PER_DAY[settings.preset] ?? 2)) continue;
      // after the gap, a small chance on every round, so it starts at a random moment and not on the dot
      if (Date.now() - settings.lastGossipAt < GOSSIP_GAP_MS || Math.random() > 0.02) continue;
      const channelKey = `${guildId}:${settings.channelId}`;
      if (hype.status(channelKey) || Date.now() - (lastPraise.get(channelKey) ?? 0) < PRAISE_COOLDOWN_MS) continue;
      const available = new Set(bots.available(guildId, settings.channelId).map(({ slot }) => slot));
      const picked = pickGossip({ language: settings.language, available, seen: settings.gossipSeen, ownerName: ownerNow(guildId) });
      if (!picked) continue;
      store.update(guildId, { gossipSeen: rememberScene(settings.gossipSeen, picked.id, picked.reset), gossipDay: day, gossipToday: today + 1, lastGossipAt: Date.now() });
      lastPraise.set(channelKey, Date.now());
      playScript(bots, guildId, settings.channelId, picked.script, { human: true }).catch((error) => console.error("The gossip stopped:", error.message));
    }
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
  const lineFor = ({ language, slot, purpose, pool, userId, minutes = 0 }) => {
    // An owner of the bots gets the shy lines ("I do not care about you", secretly the opposite); everyone else the warm ones
    const level = userId ? ownerIds.get(String(userId)) : undefined;
    if (level && Math.random() < TSUNDERE_CHANCE) {
      const shy = tsundereLine({ language, slot, purpose, stage: tsundereStage({ level, purpose, minutes }) });
      if (shy) return shy;
    }
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
  // Every evening two companions that fit together act out a short scene (when the server turned it on)
  const DRAMA_HOUR = 19;
  const maybeDrama = async () => {
    const { hour, day } = localParts(Date.now(), timezone);
    if (hour < DRAMA_HOUR) return;
    for (const [guildId, settings] of store.all()) {
      if (!settings.drama || !settings.enabled || !settings.channelId || settings.lastDramaDay === day) continue;
      if (isQuietHour(hour, settings.quietStart, settings.quietEnd)) continue;
      const available = new Set(bots.available(guildId, settings.channelId).map(({ slot }) => slot));
      const scene = pickScene({ language: settings.language, available });
      if (!scene) continue;
      store.update(guildId, { lastDramaDay: day });
      playScript(bots, guildId, settings.channelId, scene).catch((error) => console.error("The evening scene stopped:", error.message));
    }
  };
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
      const timeNotes = timeNotesFor({ language, now, timeZone: timezone });
      const moodNotes = moodNotesFor(language, moodOf({ slot, day: localParts(now, timezone).day }));
      const text = presenceText(getTools(language), { slot, now, voice, focusMinutesLeft: focus, notes, offset: noteOffset.get(slot), camera, timeNotes, moodNotes });
      if (lastPresence.get(slot) === text) continue;
      lastPresence.set(slot, text);
      client.user.setPresence({ status: "online", activities: [{ name: "custom", type: ActivityType.Custom, state: text }] });
    }
  };

  /** Answers one member's message with Gemini, in the personality of the bot that was mentioned. */
  const limitNotified = new Map(); // guildId -> day on which the "limit reached" line was already said
  const answerMention = async (slot, message) => {
    const guildId = message.guildId;
    const settings = store.get(guildId);
    if (!settings.aiReplies || !settings.enabled || message.channelId !== settings.channelId) return;
    const verdict = ai.allow({ guildId, userId: message.author.id });
    const lines = getTools(settings.language);
    const send = (text) => bots.send({ slot, guildId, channelId: settings.channelId, text, replyTo: message.id });
    if (verdict === "cooldown" || verdict === "busy") return;
    if (verdict === "limit") {
      const day = localParts(Date.now(), timezone).day;
      if (limitNotified.get(guildId) === day) return;
      limitNotified.set(guildId, day);
      await send(lines.aiLimit[Math.floor(Math.random() * lines.aiLimit.length)]);
      return;
    }
    const text = message.content.replace(/<@[!&]?\d+>|<#\d+>/g, "").replace(/\s+/g, " ").trim() || (settings.language === "vi" ? "Xin chào!" : "Hello!");
    let context = "";
    if (message.reference?.messageId) {
      // a reply to one of the bot's own messages: its own text is readable and gives the answer some context
      const earlier = await message.fetchReference().catch(() => null);
      if (earlier?.author?.id === message.client.user.id) context = earlier.content;
    }
    const personas = getContent(settings.language).personas;
    const answer = await ai.reply({ guildId, userId: message.author.id, persona: personas[slot % personas.length], language: settings.language, text, context, owner: ownerIds.size ? ownerIds.has(message.author.id) : null });
    await send(answer ?? lines.aiFallback[Math.floor(Math.random() * lines.aiFallback.length)]);
  };

  /** After 17:00 (outside quiet hours), once a day, posts a riddle, question or would-you-rather written by Gemini. */
  const AI_DAILY_HOUR = 17;
  const aiRetryAt = new Map();
  let aiDailyRunning = false;
  const maybeAiDaily = async () => {
    if (!ai || aiDailyRunning) return;
    aiDailyRunning = true;
    try {
      const { hour, day } = localParts(Date.now(), timezone);
      for (const [guildId, settings] of store.all()) {
        if (!settings.aiDaily || !settings.enabled || !settings.channelId || settings.lastAiDay === day || hour < AI_DAILY_HOUR) continue;
        if (isQuietHour(hour, settings.quietStart, settings.quietEnd) || Date.now() < (aiRetryAt.get(guildId) ?? 0)) continue;
        const available = bots.available(guildId, settings.channelId);
        if (!available.length) continue;
        const slot = available[Math.floor(Math.random() * available.length)].slot;
        const personas = getContent(settings.language).personas;
        const post = await ai.daily({ guildId, persona: personas[slot % personas.length], language: settings.language });
        if (!post) {
          aiRetryAt.set(guildId, Date.now() + 30 * 60_000);
          continue;
        }
        const lines = getTools(settings.language);
        const title = { riddle: lines.aiTitleRiddle, question: lines.aiTitleQuestion, wyr: lines.aiTitleWyr }[post.kind];
        store.update(guildId, { lastAiDay: day });
        await say({ guildId, slot, text: `${title}\n${post.text}${post.answer ? `\n||${post.answer}||` : ""}` });
      }
    } finally {
      aiDailyRunning = false;
    }
  };

  /** Erases everything stored about a server, in every store. Returns whether anything was there. */
  const forgetGuild = (guildId) => {
    const results = [store.remove(guildId), usage.forgetGuild(guildId), scores.forgetGuild(guildId), hours.forgetGuild(guildId), custom.forgetGuild(guildId), reminders.forgetGuild(guildId) > 0, praise.forgetGuild(guildId), birthdays.forgetGuild(guildId)];
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
          ? fill(lineFor({ language: store.get(item.guildId).language, slot, purpose: "remind", pool: lines.remind, userId: item.userId }), { user: `<@${item.userId}>`, text: item.text })
          : fill({ day: lines.eventDay, hour: lines.eventHour, due: lines.eventNow }[stage], { text: item.text });
      await bots.send({ slot, guildId: item.guildId, channelId: item.channelId, text, pingUsers: item.kind === "remind" ? [item.userId] : [] });
      if (stage === "due") reminders.done(item.id);
    }
    reminders.flush();
  };

  for (const { slot: mySlot, client } of slots) {
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
          const greeting = fill(lineFor({ language: settings.language, slot: welcomer, purpose: "welcome", pool: lines.welcome, userId: message.author.id }), { user: `<@${message.author.id}>` });
          const ask = questions[Math.floor(Math.random() * questions.length)]?.text;
          say({ guildId: message.guildId, slot: welcomer, text: ask ? `${greeting}\n${lines.welcomeAsk} ${ask}` : greeting }).catch(() => {});
        }
        return;
      }
      if (!message.guildId || message.author.bot || message.system || message.webhookId) return;
      if (client === hostClient) {
        maybeReactToOwner(message);
        maybeReactToMember(message);
      }
      engine.noteHumanMessage({
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        replyToMessageId: message.reference?.messageId ?? null,
      });
      // The only place a message is read: when AI replies are on and someone mentions (or replies to) this very bot.
      // Discord hands a bot the text of a message only in that case, so no privileged intent is needed.
      if (ai && message.mentions.users.has(client.user.id)) answerMention(mySlot, message).catch((error) => console.error("AI reply failed:", error.message));
    });

    // Trivia buttons: Discord delivers a button press only to the bot that sent the message
    client.on(Events.InteractionCreate, (interaction) => {
      if (interaction.isButton() && interaction.customId.startsWith("dd:") && interaction.guildId) return handlePredictVote(interaction);
      if (!interaction.isButton() || !interaction.customId.startsWith("tv:") || !interaction.guildId) return;
      const [, token, choice] = interaction.customId.split(":");
      const result = engine.noteTriviaAnswer({ guildId: interaction.guildId, token, userId: interaction.user.id, choice: Number(choice) });
      interaction.reply({ content: result.message ?? "…", flags: MessageFlags.Ephemeral }).catch(() => {});
    });
  }

  // People moving in and out of the voice rooms (only the first bot listens, the others would repeat it)
  hostClient.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;
    handleLive(oldState, newState, member);
    if (oldState.channelId === newState.channelId) return;
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
        await guild.commands.set([companionsCommand, triviaCommand, voiceCommand, pomodoroCommand, remindCommand, eventCommand, randomCommand, assembleCommand, khenCommand, cheCommand, clutchCommand, failCommand, hypeCommand, tranhluanCommand, dramaCommand, tamchuyenCommand, dudoanCommand, lamsongCommand, sinhnhatCommand, tamtrangCommand, khenTopCommand].map((c) => c.toJSON()));
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
    const handlers = { companions: handleCommand, trivia: handleTrivia, voice: handleVoiceTop, random: handleRandom, assemble: handleAssemble, khen: handleKhen, che: handleKhen, clutch: handleKhen, fail: handleKhen, hype: handleHype, tranhluan: handleTranhLuan, drama: handleDrama, tamchuyen: handleTamChuyen, dudoan: handleDuDoan, lamsong: handleLamSong, sinhnhat: handleSinhNhat, tamtrang: handleTamTrang, "khen-top": handleKhenTop, pomodoro: handlePomodoro, remind: handleRemind, event: handleRemind };
    if (!interaction.isChatInputCommand() || !handlers[interaction.commandName]) return;
    handlers[interaction.commandName](interaction, { store, engine, slots, timezone, usage, scores, custom, hours, reminders, keeper, voiceTools, voicePort, seedVoiceGuild, say, forgetGuild, updatePresence, ai, bots, hype, praise, birthdays, predictions, ownerNow }).catch(async (error) => {
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
      await maybeDrama();
      await maybeGossip();
      await maybeGreet();
      await maybeBirthdays();
      maybeAiDaily().catch((error) => console.error("AI daily post failed:", error.message));
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
      hype.stopAll();
      predictions.stopAll();
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

const MOVE_COOLDOWN_MS = 60_000; // the crowd is moved at most once a minute per server: 20+ voice joins at once are rude to Discord
const lastMove = new Map();

/** Shared start of /random and /assemble: a deferred private reply, or a reason to stop. */
async function startMove(interaction) {
  const wait = MOVE_COOLDOWN_MS - (Date.now() - (lastMove.get(interaction.guildId) ?? 0));
  if (wait > 0) {
    await interaction.reply({ content: `⏳ The companions just moved. Try again in ${Math.ceil(wait / 1000)} seconds.`, flags: MessageFlags.Ephemeral });
    return false;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  return true;
}

/** /assemble: every companion (or `bots` of them) comes to the voice channel the member is in, and stays there. */
async function handleAssemble(interaction, { keeper, seedVoiceGuild }) {
  const channel = interaction.member?.voice?.channel;
  if (!channel) return interaction.reply({ content: "🎧 Join a voice channel first, then run /assemble: the companions come to the channel you are in.", flags: MessageFlags.Ephemeral });
  if (!(await startMove(interaction))) return;
  const slots = await keeper.gather(interaction.guildId, channel.id, interaction.options.getInteger("bots") ?? Infinity);
  if (!slots.length) return interaction.editReply(`⚠️ No companion can see and connect to ${channel}. Give them View Channel and Connect there. Nothing was changed.`);
  lastMove.set(interaction.guildId, Date.now());
  await keeper.tick(); // start now instead of waiting for the next round; a few bots connect at a time
  seedVoiceGuild(interaction.guildId);
  return interaction.editReply(`📣 Calling ${slots.length} companion${slots.length === 1 ? "" : "s"} to ${channel}. They arrive within about half a minute, and the other voice rooms are emptied. They stay until you use /random, /assemble or /companions voice again.`);
}

/** /random: every companion (or `bots` of them) goes to a random voice channel it can connect to, and stays there. */
async function handleRandom(interaction, { keeper, seedVoiceGuild }) {
  if (!(await startMove(interaction))) return;
  const guild = interaction.guild;
  const channelIds = [...guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice && c.id !== guild.afkChannelId).keys()];
  const rooms = await keeper.scatter(interaction.guildId, channelIds, interaction.options.getInteger("bots") ?? Infinity);
  if (!rooms.length) return interaction.editReply("⚠️ No companion can see and connect to any voice channel here. Nothing was changed.");
  lastMove.set(interaction.guildId, Date.now());
  await keeper.tick();
  seedVoiceGuild(interaction.guildId);
  const total = rooms.reduce((n, r) => n + r.slots.length, 0);
  const lines = rooms.map((r) => `<#${r.channelId}>: ${r.slots.length}`).join("\n");
  return interaction.editReply(`🎲 ${total} companion${total === 1 ? "" : "s"} sent to ${rooms.length} random room${rooms.length === 1 ? "" : "s"}. They arrive within about half a minute and stay until you use /random, /assemble or /companions voice again.\n${lines}`);
}

const PRAISE_COOLDOWN_MS = 20_000; // one round of cheers takes about 15 seconds; a channel gets a new one at most every 20
const PRAISE_GAP_MS = 350; // the bots start one after another, a little apart, so it sounds like a crowd and not a burst
const lastPraise = new Map();

/** The name the bots say: the member picked in `nguoi`, else the typed `ten` where any @mention becomes that member's name, never an ID. */
export function playerName(interaction) {
  const picked = interaction.options.getMember("nguoi");
  const user = interaction.options.getUser("nguoi");
  const chosen = picked?.displayName ?? user?.globalName ?? user?.username;
  if (chosen) return chosen;
  const typed = interaction.options.getString("ten") ?? "";
  return typed.replace(/<@[!&]?(\d+)>/g, (_, id) => interaction.guild?.members.cache.get(id)?.displayName ?? interaction.client.users.cache.get(id)?.username ?? "");
}

/** Said one line after another in the order of the script, each bot typing for a moment, so it reads like a conversation. */
async function playScript(bots, guildId, channelId, script, { human = false } = {}) {
  const ids = [];
  for (const [i, line] of script.entries()) {
    // a real group chat has gaps: someone reads, someone is slow to answer
    if (human && i > 0) await sleep(500 + Math.random() * 1800);
    const replyTo = line.re !== undefined ? (ids[line.re] ?? undefined) : undefined;
    ids.push((await bots.send({ slot: line.slot, guildId, channelId, text: line.text, replyTo, pingUsers: line.pingUsers })) ?? null);
  }
}

const CHEER_MOODS = {
  khen: { mood: "praise", emoji: "👏", verb: "cheering" },
  che: { mood: "tease", emoji: "😏", verb: "teasing" },
  clutch: { mood: "clutch", emoji: "🔥", verb: "going wild" },
  fail: { mood: "fail", emoji: "🫂", verb: "comforting the player" },
};

/** The slots that can write in this channel, or a private reply that says why none can. */
function writersHere(interaction, bots) {
  const key = `${interaction.guildId}:${interaction.channelId}`;
  const wait = PRAISE_COOLDOWN_MS - (Date.now() - (lastPraise.get(key) ?? 0));
  if (wait > 0) return { reply: `⏳ The companions are still busy in this channel. Try again in ${Math.ceil(wait / 1000)} seconds.` };
  const slots = bots.available(interaction.guildId, interaction.channelId).map(({ slot }) => slot);
  if (!slots.length) return { reply: "⚠️ No companion can see and write in this channel. Give them View Channel, Send Messages and Read Message History here." };
  lastPraise.set(key, Date.now());
  return { slots };
}

/** /khen, /che, /clutch and /fail: every companion that can write in this channel speaks, one different line each. It does not matter where the bots sit in voice. */
async function handleKhen(interaction, { bots, praise, timezone }) {
  const kind = CHEER_MOODS[interaction.commandName] ?? CHEER_MOODS.khen;
  const here = writersHere(interaction, bots);
  if (here.reply) return interaction.reply({ content: here.reply, flags: MessageFlags.Ephemeral });
  const ten = playerName(interaction);
  const round = buildPraise({
    mood: kind.mood,
    language: interaction.options.getString("language") ?? "vi",
    goi: interaction.options.getString("goi") ?? "anh",
    ten,
    slots: here.slots,
  });
  if (interaction.commandName === "khen" || interaction.commandName === "che") praise.record(interaction.guildId, interaction.commandName, ten, localParts(Date.now(), timezone).day);
  await interaction.reply({ content: `${kind.emoji} ${round.length} companion${round.length === 1 ? " is" : "s are"} ${kind.verb} in this channel!`, flags: MessageFlags.Ephemeral });
  // Not awaited: the answer is already sent, and the lines keep coming for the next few seconds
  round.forEach(({ slot, text }, i) => {
    sleep(i * PRAISE_GAP_MS + Math.random() * PRAISE_GAP_MS)
      .then(() => bots.send({ slot, guildId: interaction.guildId, channelId: interaction.channelId, text }))
      .catch((error) => console.error(`Companion ${slot + 1} could not speak for /${interaction.commandName}:`, error.message));
  });
}

/** /hype start and /hype stop. */
async function handleHype(interaction, { bots, hype }) {
  const key = `${interaction.guildId}:${interaction.channelId}`;
  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
  if (interaction.options.getSubcommand() === "stop") return reply(hype.stop(key) ? "🛑 The companions stopped cheering in this channel." : "Nobody is cheering in this channel right now.");
  const slots = bots.available(interaction.guildId, interaction.channelId).map(({ slot }) => slot);
  if (!slots.length) return reply("⚠️ No companion can see and write in this channel. Give them View Channel, Send Messages and Read Message History here.");
  const started = hype.start({
    key,
    minutes: interaction.options.getInteger("minutes") ?? HYPE_LIMITS.defaultMinutes,
    mood: interaction.options.getString("mood") ?? "praise",
    language: interaction.options.getString("language") ?? "vi",
    goi: interaction.options.getString("goi") ?? "anh",
    ten: playerName(interaction),
    slots,
  });
  if (!started.ok) return reply("📣 They are already cheering in this channel. Use `/hype stop` to stop them first.");
  return reply(`📣 The companions will cheer here for ${started.minutes} minutes, one bot every 20 to 45 seconds. \`/hype stop\` ends it.`);
}

/** /tranhluan: two camps argue about a or b, then a verdict. */
async function handleTranhLuan(interaction, { bots }) {
  const here = writersHere(interaction, bots);
  if (here.reply) return interaction.reply({ content: here.reply, flags: MessageFlags.Ephemeral });
  const debate = buildDebate({ language: interaction.options.getString("language") ?? "vi", a: interaction.options.getString("a", true), b: interaction.options.getString("b", true), slots: here.slots });
  if (!debate) {
    lastPraise.delete(`${interaction.guildId}:${interaction.channelId}`);
    return interaction.reply({ content: "⚠️ I need two sides with a name, and at least two companions that can write here.", flags: MessageFlags.Ephemeral });
  }
  await interaction.reply({ content: "⚔️ The companions are picking sides!", flags: MessageFlags.Ephemeral });
  playScript(bots, interaction.guildId, interaction.channelId, debate.script).catch((error) => console.error("The debate stopped:", error.message));
}

/** /drama: a short scene between two companions that fit together. */
async function handleDrama(interaction, { bots, store }) {
  const here = writersHere(interaction, bots);
  if (here.reply) return interaction.reply({ content: here.reply, flags: MessageFlags.Ephemeral });
  const language = interaction.options.getString("language") ?? store.get(interaction.guildId).language;
  const scene = pickScene({ language, couple: interaction.options.getString("couple"), available: new Set(here.slots) });
  if (!scene) {
    lastPraise.delete(`${interaction.guildId}:${interaction.channelId}`);
    return interaction.reply({ content: "⚠️ That pair is not here: both of its companions must be able to write in this channel.", flags: MessageFlags.Ephemeral });
  }
  await interaction.reply({ content: "🎭 A little scene is starting!", flags: MessageFlags.Ephemeral });
  playScript(bots, interaction.guildId, interaction.channelId, scene).catch((error) => console.error("The scene stopped:", error.message));
}

/** /khen-top: the most cheered and the most teased of this week. */
/** /tamchuyen: a scripted group chat between a few companions. The topic is optional; a scene a server saw lately is not repeated. */
async function handleTamChuyen(interaction, { bots, store, ownerNow }) {
  const here = writersHere(interaction, bots);
  if (here.reply) return interaction.reply({ content: here.reply, flags: MessageFlags.Ephemeral });
  const guildId = interaction.guildId;
  const settings = store.get(guildId);
  const tag = interaction.options.getString("chude");
  const picked = pickGossip({ language: interaction.options.getString("language") ?? settings.language, available: new Set(here.slots), seen: settings.gossipSeen, tag, ownerName: ownerNow(guildId) });
  if (!picked) {
    lastPraise.delete(`${guildId}:${interaction.channelId}`);
    const why = tag === "owner" ? "The owner has not been around lately, so the companions have nothing to whisper about." : "Not enough companions that can write here for a chat about that topic.";
    return interaction.reply({ content: `⚠️ ${why}`, flags: MessageFlags.Ephemeral });
  }
  store.update(guildId, { gossipSeen: rememberScene(settings.gossipSeen, picked.id, picked.reset) });
  await interaction.reply({ content: "🗣️ The companions are gossiping!", flags: MessageFlags.Ephemeral });
  playScript(bots, guildId, interaction.channelId, picked.script, { human: true }).catch((error) => console.error("The gossip stopped:", error.message));
}

/** /dudoan start and /dudoan result. */
async function handleDuDoan(interaction, { bots, store, predictions }) {
  const guildId = interaction.guildId;
  const key = `${guildId}:${interaction.channelId}`;
  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

  if (interaction.options.getSubcommand() === "result") {
    const session = predictions.find(key);
    if (!session) return reply("There is no open prediction in this channel. Start one with `/dudoan start`.");
    const allowed = session.starterId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
    if (!allowed) return reply("Only the person who opened the prediction (or a moderator) can give the result.");
    const outcome = interaction.options.getString("outcome", true);
    const done = predictions.resolve(key, outcome);
    await reply("🏁 Result sent!");
    const { slot } = done.session.where ?? { slot: bots.available(guildId, interaction.channelId)[0]?.slot };
    const base = { guildId, channelId: interaction.channelId };
    if (slot !== undefined) await bots.send({ ...base, slot, text: resultText({ language: done.session.language, ten: done.session.ten, goi: done.session.goi, outcome, right: done.right, wrong: done.wrong }) });
    // the companions that bet react: a few of those who were right, a few of those who were wrong
    const reactions = [...done.botRight.slice(0, 4).map((s) => [s, "right"]), ...done.botWrong.slice(0, 4).map((s) => [s, "wrong"])];
    reactions.forEach(([botSlot, kind], i) => {
      sleep(1500 + i * 1800 + Math.random() * 1200)
        .then(() => bots.send({ ...base, slot: botSlot, text: predictLine({ slot: botSlot, kind, language: done.session.language, goi: done.session.goi }) }))
        .catch(() => {});
    });
    return;
  }

  const slots = bots.available(guildId, interaction.channelId).map(({ slot }) => slot);
  if (!slots.length) return reply("⚠️ No companion can see and write in this channel. Give them View Channel, Send Messages and Read Message History here.");
  const started = predictions.start({
    key,
    starterId: interaction.user.id,
    ten: playerName(interaction),
    goi: interaction.options.getString("goi") ?? "anh",
    language: interaction.options.getString("language") ?? "vi",
    minutes: interaction.options.getInteger("minutes") ?? PREDICT_LIMITS.defaultMinutes,
    slots,
  });
  if (!started.ok) return reply("🔮 A prediction is already open in this channel. Give its result with `/dudoan result` first.");
  const session = started.session;
  await reply(`🔮 Prediction opened for ${session.minutes} minute${session.minutes === 1 ? "" : "s"}. When the round ends, give the result with \`/dudoan result\`.`);
  // The message with the buttons comes from one companion (a button press goes to the bot that sent the message)
  const sender = slots[Math.floor(Math.random() * slots.length)];
  const messageId = await bots.send({
    slot: sender,
    guildId,
    channelId: interaction.channelId,
    text: announceText({ language: session.language, ten: session.ten, goi: session.goi, minutes: session.minutes, counts: predictions.counts(session.token) }),
    predict: { token: session.token, labels: session.language === "en" ? { win: "Win ✅", lose: "Lose ❌" } : { win: "Thắng ✅", lose: "Thua ❌" } },
  });
  if (!messageId) {
    predictions.resolve(key, "win"); // the message could not be sent: nothing to vote on, so forget this prediction
    return;
  }
  session.where = { slot: sender, guildId, channelId: interaction.channelId, messageId };
  // a few other companions bet out loud, one after another
  planBets({ slots: slots.filter((s) => s !== sender) }).forEach(({ slot, side }, i) => {
    sleep(4000 + i * 3500 + Math.random() * 3000)
      .then(async () => {
        if (!predictions.get(session.token) || session.closed) return;
        predictions.addBet(session.token, slot, side);
        await bots.send({ guildId, channelId: interaction.channelId, slot, text: predictLine({ slot, kind: side, language: session.language, goi: session.goi }) });
      })
      .catch(() => {});
  });
}

/** /lamsong: a stadium wave of emoji across the bots, with a chant from the one in the middle. */
async function handleLamSong(interaction, { bots }) {
  const here = writersHere(interaction, bots);
  if (here.reply) return interaction.reply({ content: here.reply, flags: MessageFlags.Ephemeral });
  const script = buildWave({ language: interaction.options.getString("language") ?? "vi", emoji: interaction.options.getString("emoji") ?? "🔥", ten: playerName(interaction), slots: here.slots });
  if (!script) {
    lastPraise.delete(`${interaction.guildId}:${interaction.channelId}`);
    return interaction.reply({ content: "⚠️ A wave needs at least three companions that can write in this channel.", flags: MessageFlags.Ephemeral });
  }
  await interaction.reply({ content: "🌊 Here comes the wave!", flags: MessageFlags.Ephemeral });
  playScript(bots, interaction.guildId, interaction.channelId, script).catch((error) => console.error("The wave stopped:", error.message));
}

/** /sinhnhat set, remove and list. */
async function handleSinhNhat(interaction, { birthdays, store, timezone }) {
  const guildId = interaction.guildId;
  const settings = store.get(guildId);
  const vi = settings.language === "vi";
  const reply = (content, ephemeral = true) => interaction.reply({ content, ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}), allowedMentions: NO_PINGS });
  const sub = interaction.options.getSubcommand();

  if (sub === "remove") {
    return reply(birthdays.remove(guildId, interaction.user.id) ? (vi ? "🗑️ Đã xóa sinh nhật của bạn." : "🗑️ Your birthday was erased.") : vi ? "Bạn chưa lưu sinh nhật." : "You have no birthday saved.");
  }
  if (sub === "list") {
    const day = localParts(Date.now(), timezone).day;
    const next = birthdays.upcoming(guildId, day);
    if (!next.length) return reply(vi ? "Chưa ai lưu sinh nhật. Dùng `/sinhnhat set` nhé!" : "Nobody saved a birthday yet. Use `/sinhnhat set`!", false);
    const lines = next.map((b) => `🎂 **${b.name}** ${b.d}/${b.m} (${b.inDays === 0 ? (vi ? "hôm nay" : "today") : vi ? `còn ${b.inDays} ngày` : `in ${b.inDays} day${b.inDays === 1 ? "" : "s"}`})`);
    return reply(`${vi ? "Sinh nhật sắp tới" : "Next birthdays"}\n${lines.join("\n")}`, false);
  }
  const name = interaction.member?.displayName ?? interaction.user.globalName ?? interaction.user.username;
  const result = birthdays.set(guildId, interaction.user.id, interaction.options.getInteger("ngay", true), interaction.options.getInteger("thang", true), name);
  if (!result.ok) return reply(vi ? "Ngày đó không có thật. Thử lại nhé!" : "That date does not exist. Try again!");
  const off = settings.birthdays ? "" : vi ? "\nServer chưa bật chúc sinh nhật: người quản lý dùng `/companions sinhnhat enabled:true`." : "\nThis server has not turned birthdays on: a manager can use `/companions sinhnhat enabled:true`.";
  return reply(
    (vi
      ? "🎂 Đã lưu sinh nhật của bạn. Bot chỉ giữ ngày và tháng (không có năm), và bạn xóa được bất cứ lúc nào bằng `/sinhnhat remove`."
      : "🎂 Your birthday is saved. The bots keep only the day and the month (no year), and you can erase it any time with `/sinhnhat remove`.") + off,
  );
}

/** /tamtrang: everyone's mood today. */
async function handleTamTrang(interaction, { store, slots, timezone }) {
  const language = store.get(interaction.guildId).language;
  const vi = language === "vi";
  const day = localParts(Date.now(), timezone).day;
  const board = moodBoard({ language, day, slots: slots.map(({ slot }) => slot) });
  const lines = board.map(({ mood, names }) => `${MOOD_EMOJI[mood]} **${MOOD_NAME[language][mood]}**: ${names.join(", ")}`);
  return interaction.reply({ content: `${vi ? "Tâm trạng của các bot hôm nay" : "The bots' moods today"}\n${lines.join("\n")}`, allowedMentions: NO_PINGS });
}

async function handleKhenTop(interaction, { store, praise, timezone }) {
  const vi = store.get(interaction.guildId).language === "vi";
  const day = localParts(Date.now(), timezone).day;
  const list = (kind) => praise.top(interaction.guildId, kind, day).map((row, i) => `**${i + 1}.** ${row.name} (${row.count})`).join("\n");
  const praised = list("khen");
  const teased = list("che");
  if (!praised && !teased) return interaction.reply({ content: vi ? "Tuần này chưa ai được khen hay bị chê. Thử `/khen` đi!" : "Nobody was cheered or teased this week yet. Try `/khen`!", flags: MessageFlags.Ephemeral });
  const parts = [];
  if (praised) parts.push(`${vi ? "🏆 Được khen nhiều nhất tuần này" : "🏆 Most cheered this week"}\n${praised}`);
  if (teased) parts.push(`${vi ? "😏 Bị chê nhiều nhất tuần này" : "😏 Most teased this week"}\n${teased}`);
  return interaction.reply({ content: parts.join("\n\n"), allowedMentions: NO_PINGS });
}

async function handleCommand(interaction, { store, engine, slots, timezone, usage, custom, reminders, keeper, voicePort, seedVoiceGuild, forgetGuild, say, updatePresence, ai }) {
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

  if (group === "ai") {
    if (sub === "status") {
      if (!ai) return reply("🤖 The AI features are not available: the host has not set a Gemini key. Everything else works as before.");
      return reply(`🤖 AI replies: ${settings.aiReplies ? "on" : "off"}. Daily post: ${settings.aiDaily ? "on" : "off"}. Answers used today: ${ai.usedToday(guildId)} of ${ai.dailyLimit}.`);
    }
    if (!ai) return reply("🤖 The AI features are not available: the host has not set a Gemini key (GEMINI_API_KEY). Nothing was changed.");
    const enabled = interaction.options.getBoolean("enabled", true);
    if (sub === "replies") {
      store.update(guildId, { aiReplies: enabled });
      return reply(
        enabled
          ? `🤖 AI replies are on. When someone mentions a companion or replies to one in the companions channel, that one message is sent to Google's Gemini and the companion answers in its own personality. Nothing else is read or sent. Limits: one answer per member every ${ai.cooldownMs / 1000} seconds and ${ai.dailyLimit} a day for the server. The companions still say they are bots.`
          : "🔇 AI replies are off. The companions no longer read anything.",
      );
    }
    store.update(guildId, { aiDaily: enabled });
    return reply(
      enabled
        ? "🧩 The daily post is on. Once a day after 17:00 (outside quiet hours) a companion posts a riddle, a question or a would-you-rather written by Gemini. No message from a member is sent anywhere."
        : "🔇 The daily post is off.",
    );
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

  if (sub === "drama") {
    const enabled = interaction.options.getBoolean("enabled", true);
    store.update(guildId, { drama: enabled });
    return reply(enabled ? "🎭 Every evening (19:00 and later, outside quiet hours) two companions that fit together act out a short scene in the chat channel." : "🔇 No more evening scenes.");
  }

  if (sub === "tamchuyen") {
    const enabled = interaction.options.getBoolean("enabled", true);
    store.update(guildId, { gossip: enabled });
    return reply(enabled ? "🗣️ Now and then (10:00 to 22:00, outside quiet hours, 1, 2 or 4 times a day for calm, normal or lively) a few companions start a group chat among themselves in the chat channel." : "🔇 The companions stop starting group chats on their own. `/tamchuyen` still works.");
  }

  if (sub === "autohype") {
    const enabled = interaction.options.getBoolean("enabled", true);
    store.update(guildId, { autoHype: enabled });
    return reply(enabled ? "📣 When someone starts a Go Live stream in voice, the companions cheer in the chat channel until the stream ends (at most an hour, never during quiet hours)." : "🔇 The companions no longer cheer by themselves when someone goes live.");
  }

  if (sub === "chaohoi") {
    const enabled = interaction.options.getBoolean("enabled", true);
    store.update(guildId, { greetings: enabled });
    return reply(enabled ? "☀️🌙 Every day two or three companions say good morning (when the quiet hours end) and good night (the hour before they start) in the chat channel, the first one in the mood it has that day." : "🔇 No more good mornings and good nights.");
  }

  if (sub === "reactions") {
    const enabled = interaction.options.getBoolean("enabled", true);
    store.update(guildId, { reactions: enabled });
    return reply(enabled ? "💬 Now and then a companion leaves a warm reaction on a member's message in the chat channel. It needs the Add Reactions permission; without it nothing happens." : "🔇 No more reactions on members' messages.");
  }

  if (sub === "sinhnhat") {
    const enabled = interaction.options.getBoolean("enabled", true);
    store.update(guildId, { birthdays: enabled });
    return reply(enabled ? "🎂 On the birthday of every member who saved it with `/sinhnhat set` (from 9:00, outside quiet hours), a few companions sing in the chat channel." : "🔇 The companions no longer sing on birthdays. The saved dates are kept until the members erase them.");
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
    `**Weekly recap:** ${settings.recap ? "on" : "off"}, **evening scene:** ${settings.drama ? "on" : "off"}, **group chats:** ${settings.gossip ? "on" : "off"}, **good morning and night:** ${settings.greetings ? "on" : "off"}, **reactions:** ${settings.reactions ? "on" : "off"}, **birthdays:** ${settings.birthdays ? "on" : "off"}, **cheer on Go Live:** ${settings.autoHype ? "on" : "off"}, **voice rooms:** ${roomsOf(settings).length ? roomsOf(settings).map((r) => `<#${r.channelId}> (${r.bots})`).join(", ") : "none"}, **welcome:** ${settings.welcome ? "on" : "off"}`,
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
