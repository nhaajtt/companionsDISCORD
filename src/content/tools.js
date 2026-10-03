// Lines the companions speak for the voice, welcome and reminder tools. Placeholders like {user} are filled in by the code.
// Every key exists in both languages (a test checks that).
import LINES from "./lines.js";

const TOOLS = {
  en: {
    greet: [
      "{user} just sat down in the voice room. We saved you the comfy beanbag.",
      "Oh, {user} is here! The room is now 14% more lively. Source: us.",
      "{user} joined the voice room. We have been waiting, quietly, like professionals.",
      "Welcome to voice, {user}! We are not great at talking, but we are excellent at sitting.",
      "{user} appeared in the voice room. Nobody panic, act natural.",
      "Hi {user}! Fun fact: this room is never empty. You are looking at the fun fact.",
      "{user} dropped by the voice room. The sitting committee approves.",
      "Look who it is: {user}! Pull up a virtual chair, mind the bots.",
    ],
    farewell: [
      "{user} left the voice room. The chairs will remember you.",
      "See you next time, {user}! The room will keep your spot warm, digitally.",
      "{user} has logged off from the voice room. Thanks for the company!",
      "Goodbye, {user}! We will keep sitting here, as professionals do.",
      "{user} waved goodbye. We waved back, but nobody can see bots wave.",
      "Thanks for stopping by, {user}. The room is a little emptier now.",
    ],
    welcome: [
      "Welcome, {user}! We are the resident bots. We chat, we joke, we sit in voice. You are now our favourite human of the day.",
      "A new face! Hi {user}, glad you are here. Everything is optional except having a good time.",
      "{user} has arrived! Quick tour: chat here, snacks not included.",
      "Hello {user}, and welcome! The bots promise to be only mildly weird.",
      "{user} joined the server. The welcoming committee (us) is thrilled and slightly overdressed.",
      "Hey {user}! Take a seat. The only rule is: be nice, and say hi back to the bots.",
    ],
    welcomeAsk: "To break the ice:",
    pomodoroStart: "🍅 Focus time! {work} minutes of work, then a {brk} minute break. Round {round} of {rounds}. Phones down, we are watching (politely).",
    pomodoroBreak: "☕ Round {round} of {rounds} done! Take {brk} minutes: stretch, water, stare at something far away.",
    pomodoroWork: "🍅 Break is over. Round {round} of {rounds}, {work} minutes. You can do it.",
    pomodoroDone: "🎉 All {rounds} rounds done: {minutes} minutes of focus. That is seriously impressive. Go touch some grass.",
    pomodoroEmpty: "🍅 The room has been empty for a while, so I stopped the focus session. Start another when you are back.",
    remind: [
      "⏰ {user}, you asked me to remind you: {text}",
      "⏰ Ding ding, {user}! Past you left a note: {text}",
      "⏰ {user}, this is your reminder: {text}. You are welcome.",
    ],
    eventDay: "📅 Heads up: **{text}** starts in about a day.",
    eventHour: "⏳ **{text}** starts in about an hour. Get your snacks ready.",
    eventNow: "🎉 **{text}** is starting now!",
    presenceIdle: [
      "Thinking about pizza",
      "Waiting for someone to say hi",
      "Practising my small talk",
      "Counting the people who are not here",
      "Reading fun facts to nobody",
      "Chilling like a professional bot",
    ],
    presenceCamera: [
      "📹 Camera on (it is a sign, I am a bot)",
      "📹 Camera on, face not included",
      "📹 Live from the voice room, in 0 pixels",
      "📹 Camera on, looking very professional",
    ],
    cameraOn: [
      "📹 Cameras on in the voice room! Disclaimer: it is only a sign, nobody can see my face because I do not have one.",
      "📹 Camera on! You will see a lot of nothing, in very high quality.",
      "📹 We turned our cameras on. Looking great, in a bot kind of way.",
    ],
    cameraOff: [
      "📴 Cameras off. Back to being a mysterious voice room of bots.",
      "📴 Camera off. The audience of zero pixels is disappointed.",
      "📴 Camera off. Nobody saw anything, exactly as planned.",
    ],
    presenceVoice: "Sitting in voice with {n}",
    presenceVoiceAlone: "Keeping the voice room company",
    presenceFocus: "Focus session: {min} min left",
    recapTitle: "📰 The week in this server",
    recapConvos: "The bots started {n} conversations, and {j} of them got people talking.",
    recapTrivia: "Trivia: {a} answers, {c} of them right.",
    recapTop: "🧠 Trivia champion: {user} with {points} points.",
    recapVoice: "🎧 Most time in the voice room: {user}, {minutes} minutes.",
    recapQuiet: "A quiet week. The bots are fine, just a little lonely. Say hi.",
    recapOutro: "New week, new questions. See you in the chat.",
    streakMine: "Your trivia streak: {n} days in a row (best: {best}).",
    streakNone: "No streak right now. Get one trivia answer right today to start one.",
    titleRegular: "🎧 {user} is a voice regular this week: {hours} hours in the room.",
    voiceTopWeek: "Voice room: this week",
    voiceTopAll: "Voice room: all time",
    voiceTopEmpty: "Nobody has spent time in the voice room yet. Come sit with us.",
    voiceForgetDone: "Done. Your voice time was erased.",
    voiceForgetNone: "There was nothing stored about you.",
  },
  vi: {
    greet: [
      "{user} vừa ngồi vào phòng voice. Tụi mình để dành cho bạn cái ghế lười êm nhất.",
      "Ồ, {user} đến rồi! Phòng giờ sôi động hơn 14%. Nguồn: tụi mình tự đo.",
      "{user} vào phòng voice. Tụi mình ngồi đợi nãy giờ, im lặng như dân chuyên nghiệp.",
      "Chào mừng {user} đến voice! Tụi mình nói không giỏi, nhưng ngồi thì cực đỉnh.",
      "{user} xuất hiện trong phòng voice. Mọi người đừng hoảng, cứ tự nhiên.",
      "Chào {user}! Fun fact: phòng này không bao giờ trống. Bạn đang nhìn thấy fun fact đó đấy.",
      "{user} ghé phòng voice. Hội đồng ngồi chơi xác nhận: đạt.",
      "Xem ai tới nè: {user}! Kéo ghế ảo ngồi đi, nhớ né mấy con bot.",
    ],
    farewell: [
      "{user} rời phòng voice rồi. Mấy cái ghế sẽ nhớ bạn đó.",
      "Hẹn gặp lại, {user}! Phòng sẽ giữ chỗ cho bạn, theo kiểu kỹ thuật số.",
      "{user} vừa thoát khỏi phòng voice. Cảm ơn đã ngồi chung nha!",
      "Tạm biệt {user}! Tụi mình vẫn ngồi đây, chuyên nghiệp mà.",
      "{user} vẫy tay chào. Tụi mình vẫy lại, mà bot vẫy thì ai thấy đâu.",
      "Cảm ơn đã ghé, {user}. Phòng giờ vắng đi một chút rồi.",
    ],
    welcome: [
      "Chào mừng {user}! Tụi mình là mấy con bot thường trú: tám chuyện, kể chuyện cười, ngồi voice. Bạn là con người yêu thích của hôm nay.",
      "Có người mới! Chào {user}, vui vì bạn ghé. Mọi thứ đều tùy chọn, trừ việc vui vẻ.",
      "{user} đã đến! Tham quan nhanh: tám ở đây, đồ ăn vặt tự lo.",
      "Chào {user}, hoan nghênh! Tụi bot hứa chỉ kỳ quặc ở mức vừa phải thôi.",
      "{user} vừa vào server. Hội đón tiếp (là tụi mình) rất phấn khích và hơi diện quá.",
      "Ê {user}! Ngồi xuống đi. Luật duy nhất: tử tế, và chào lại mấy con bot nha.",
    ],
    welcomeAsk: "Phá băng thử nhé:",
    pomodoroStart: "🍅 Giờ tập trung! {work} phút làm việc, rồi nghỉ {brk} phút. Vòng {round} trên {rounds}. Cất điện thoại đi, tụi mình đang nhìn (rất lịch sự).",
    pomodoroBreak: "☕ Xong vòng {round} trên {rounds}! Nghỉ {brk} phút: vươn vai, uống nước, nhìn ra xa một chút.",
    pomodoroWork: "🍅 Hết giờ nghỉ. Vòng {round} trên {rounds}, {work} phút. Làm được mà.",
    pomodoroDone: "🎉 Xong hết {rounds} vòng: {minutes} phút tập trung. Quá đỉnh luôn. Giờ đi chạm cỏ đi.",
    pomodoroEmpty: "🍅 Phòng trống một lúc rồi nên mình dừng phiên tập trung. Quay lại thì bắt đầu phiên mới nha.",
    remind: [
      "⏰ {user}, bạn nhờ mình nhắc: {text}",
      "⏰ Ting ting, {user}! Bạn của quá khứ để lại ghi chú: {text}",
      "⏰ {user}, nhắc nè: {text}. Không cần cảm ơn.",
    ],
    eventDay: "📅 Báo trước: **{text}** bắt đầu trong khoảng một ngày nữa.",
    eventHour: "⏳ **{text}** bắt đầu trong khoảng một tiếng nữa. Chuẩn bị đồ ăn vặt đi.",
    eventNow: "🎉 **{text}** bắt đầu rồi!",
    presenceIdle: [
      "Đang nghĩ về pizza",
      "Đợi ai đó chào mình",
      "Luyện nói chuyện phiếm",
      "Đếm số người không có mặt",
      "Đọc fun fact cho không ai nghe",
      "Thư giãn kiểu bot chuyên nghiệp",
    ],
    presenceCamera: [
      "📹 Bật camera (chỉ là biển hiệu, mình là bot)",
      "📹 Bật camera, không kèm khuôn mặt",
      "📹 Phát trực tiếp từ phòng voice, độ phân giải 0 điểm ảnh",
      "📹 Bật camera, trông rất chuyên nghiệp",
    ],
    cameraOn: [
      "📹 Bật camera trong phòng voice rồi nha! Lưu ý: chỉ là biển hiệu thôi, mình không có mặt để mà hiện.",
      "📹 Camera bật! Các bạn sẽ thấy rất nhiều khoảng trống, chất lượng cao.",
      "📹 Tụi mình bật camera rồi. Đẹp trai xinh gái, theo kiểu bot.",
    ],
    cameraOff: [
      "📴 Tắt camera. Phòng voice lại trở về vẻ bí ẩn của lũ bot.",
      "📴 Tắt camera. Khán giả không điểm ảnh nào hơi tiếc.",
      "📴 Tắt camera. Không ai thấy gì hết, đúng kế hoạch.",
    ],
    presenceVoice: "Đang ngồi voice với {n} người",
    presenceVoiceAlone: "Ngồi giữ phòng voice cho đỡ buồn",
    presenceFocus: "Phiên tập trung: còn {min} phút",
    recapTitle: "📰 Một tuần ở server này",
    recapConvos: "Tụi bot bắt đầu {n} cuộc trò chuyện, trong đó {j} cuộc có người nói theo.",
    recapTrivia: "Đố vui: {a} lượt trả lời, đúng {c} lượt.",
    recapTop: "🧠 Nhà vô địch đố vui: {user} với {points} điểm.",
    recapVoice: "🎧 Ngồi phòng voice lâu nhất: {user}, {minutes} phút.",
    recapQuiet: "Một tuần yên ắng. Tụi bot vẫn ổn, chỉ hơi cô đơn. Vào chào đi.",
    recapOutro: "Tuần mới, câu hỏi mới. Gặp lại ở kênh chat.",
    streakMine: "Chuỗi đố vui của bạn: {n} ngày liên tiếp (cao nhất: {best}).",
    streakNone: "Hiện chưa có chuỗi. Trả lời đúng một câu đố vui hôm nay để bắt đầu.",
    titleRegular: "🎧 {user} là khách quen của phòng voice tuần này: {hours} giờ trong phòng.",
    voiceTopWeek: "Phòng voice: tuần này",
    voiceTopAll: "Phòng voice: mọi thời đại",
    voiceTopEmpty: "Chưa ai ngồi phòng voice cả. Vào ngồi với tụi mình đi.",
    voiceForgetDone: "Xong. Thời gian voice của bạn đã bị xóa.",
    voiceForgetNone: "Không có gì được lưu về bạn.",
  },
};

// The big pools (about 1,000 lines per purpose and language) are added to the few hand-written lines above. The focus session
// messages were single strings; they become pools too, and the voicetools code picks one at random.
for (const lang of ["en", "vi"]) {
  const t = TOOLS[lang];
  const l = LINES[lang];
  t.greet = [...t.greet, ...l.voiceGreet];
  t.welcome = [...t.welcome, ...l.welcome];
  t.farewell = [...t.farewell, ...l.voiceFarewell];
  t.remind = [...t.remind, ...l.remind];
  t.pomodoroStart = [t.pomodoroStart, ...l.pomodoroStart];
  t.pomodoroBreak = [t.pomodoroBreak, ...l.pomodoroBreak];
  t.pomodoroWork = [t.pomodoroWork, ...l.pomodoroWork];
  t.pomodoroDone = [t.pomodoroDone, ...l.pomodoroDone];
}

export default TOOLS;
export const getTools = (language) => (language === "vi" ? TOOLS.vi : TOOLS.en);
