// Seasonal packs: extra questions, riddles, facts and polls that are mixed into the banks while a season is on.
// Every pack exists in both languages with the same number of entries (a test checks it).

const PACKS = {
  halloween: {
    en: {
      questions: [
        { id: "s-hw-q1", text: "Halloween costume: the classic, the lazy one, or the completely ridiculous one?", answers: ["The lazy one. A sheet with two holes is a timeless look.", "Ridiculous, always. Go big or stay home.", "Classic. Vampires never go out of style."] },
        { id: "s-hw-q2", text: "Candy corn: treat or trick?", answers: ["Trick. A well-dressed trick, but a trick.", "Treat, and I will defend it."] },
        { id: "s-hw-q3", text: "Would you spend one night in a haunted house for a big prize?", answers: ["Only if the Wi-Fi is good.", "Absolutely not. I am a bot and I am still scared."] },
        { id: "s-hw-q4", text: "What is the best Halloween candy?", answers: ["Anything chocolate. This is not up for debate.", "The mini ones, because you can have ten.", "Gummies, and I know that is controversial."] },
      ],
      riddles: [
        { id: "s-hw-r1", setup: "Why don't skeletons fight each other?", punchline: "They don't have the guts. 💀" },
        { id: "s-hw-r2", setup: "What do ghosts like for dessert?", punchline: "I scream. 👻" },
      ],
      facts: [
        { id: "s-hw-f1", text: "Fun fact: Halloween grew out of Samhain, an ancient Celtic festival that marked the end of the harvest. 🎃" },
        { id: "s-hw-f2", text: "Fun fact: the first jack-o'-lanterns were carved from turnips in Ireland. Pumpkins took over later in North America. 🎃" },
        { id: "s-hw-f3", text: "Fun fact: the word Halloween comes from All Hallows' Eve, the evening before All Saints' Day. 🕯️" },
      ],
      polls: [
        { id: "s-hw-p1", question: "Pick a Halloween vibe.", options: ["Spooky", "Cute", "Funny", "Gory"] },
        { id: "s-hw-p2", question: "Pumpkin spice: yes or no?", options: ["Yes, in everything", "No, never", "Only the pie"] },
      ],
    },
    vi: {
      questions: [
        { id: "s-hw-q1", text: "Hóa trang Halloween: kiểu kinh điển, kiểu lười, hay kiểu lố bịch hết cỡ?", answers: ["Kiểu lười. Tấm vải trắng khoét hai lỗ là phong cách bất hủ.", "Lố bịch, luôn luôn. Đã chơi là chơi hết mình.", "Kinh điển. Ma cà rồng không bao giờ lỗi mốt."] },
        { id: "s-hw-q2", text: "Kẹo ngô (candy corn): được ăn hay bị chơi khăm?", answers: ["Bị chơi khăm. Một vố chơi khăm rất sành điệu.", "Được ăn, và tôi sẽ bảo vệ ý kiến này."] },
        { id: "s-hw-q3", text: "Bạn có dám ngủ một đêm trong nhà ma để lấy giải lớn không?", answers: ["Chỉ khi Wi-Fi mạnh.", "Tuyệt đối không. Tôi là bot mà vẫn sợ."] },
        { id: "s-hw-q4", text: "Loại kẹo Halloween ngon nhất là gì?", answers: ["Cái gì có socola. Không bàn cãi.", "Mấy cái kẹo mini, vì ăn được mười viên.", "Kẹo dẻo, và tôi biết nó gây tranh cãi."] },
      ],
      riddles: [
        { id: "s-hw-r1", setup: "Vì sao bộ xương không bao giờ đánh nhau?", punchline: "Vì chúng không có gan. 💀" },
        { id: "s-hw-r2", setup: "Ma thích ăn tráng miệng món gì?", punchline: "Kem (I scream, nghe như hét lên). 👻" },
      ],
      facts: [
        { id: "s-hw-f1", text: "Fun fact: Halloween bắt nguồn từ Samhain, lễ hội cổ của người Celt đánh dấu mùa thu hoạch kết thúc. 🎃" },
        { id: "s-hw-f2", text: "Fun fact: những chiếc đèn bí ngô đầu tiên được khắc từ củ cải ở Ireland. Bí ngô mới thay thế sau này ở Bắc Mỹ. 🎃" },
        { id: "s-hw-f3", text: "Fun fact: từ Halloween xuất phát từ All Hallows' Eve, tức buổi tối trước Lễ Các Thánh. 🕯️" },
      ],
      polls: [
        { id: "s-hw-p1", question: "Chọn một phong cách Halloween.", options: ["Rùng rợn", "Dễ thương", "Hài hước", "Máu me"] },
        { id: "s-hw-p2", question: "Vị bí ngô cùng gia vị (pumpkin spice): được hay không?", options: ["Được, cho vào mọi thứ", "Không bao giờ", "Chỉ món bánh thôi"] },
      ],
    },
  },

  christmas: {
    en: {
      questions: [
        { id: "s-xm-q1", text: "Real tree or fake tree?", answers: ["Real. The smell is half the holiday.", "Fake. It never drops needles on the floor."] },
        { id: "s-xm-q2", text: "What is your favourite holiday food?", answers: ["Anything with cheese, as always.", "The desserts. Specifically all of them.", "Whatever is on the table when I arrive."] },
        { id: "s-xm-q3", text: "What is the best gift you have ever received?", answers: ["A good one. I would not know, I am a bot, but I hear it is nice.", "Socks. And I meant it."] },
        { id: "s-xm-q4", text: "What is the one holiday movie you can watch every year?", answers: ["The one everyone argues about every year. You know the one.", "Anything with snow and a happy ending."] },
      ],
      riddles: [
        { id: "s-xm-r1", setup: "What did one snowman say to the other?", punchline: "Do you smell carrot? ⛄" },
        { id: "s-xm-r2", setup: "Why is it so cold at Christmas?", punchline: "Because it's Decembrrr! 🥶" },
      ],
      facts: [
        { id: "s-xm-f1", text: "Fun fact: the first Christmas card was sent in London in 1843. 🎄" },
        { id: "s-xm-f2", text: "Fun fact: Rudolph the Red-Nosed Reindeer was created in 1939 for a booklet given away by a department store. 🦌" },
        { id: "s-xm-f3", text: "Fun fact: decorating an evergreen tree at Christmas is a tradition that is linked to Germany. 🎄" },
      ],
      polls: [
        { id: "s-xm-p1", question: "Real tree or fake tree?", options: ["Real", "Fake", "No tree, only vibes"] },
        { id: "s-xm-p2", question: "Hot chocolate or eggnog?", options: ["Hot chocolate", "Eggnog", "Both", "Neither"] },
      ],
    },
    vi: {
      questions: [
        { id: "s-xm-q1", text: "Cây thông thật hay cây thông giả?", answers: ["Thật. Mùi thông là một nửa mùa lễ.", "Giả. Không bao giờ rụng lá ra sàn."] },
        { id: "s-xm-q2", text: "Món ăn ngày lễ bạn thích nhất là gì?", answers: ["Cái gì có phô mai, như mọi khi.", "Mấy món tráng miệng. Cụ thể là tất cả.", "Món nào có trên bàn lúc tôi đến."] },
        { id: "s-xm-q3", text: "Món quà tuyệt nhất bạn từng nhận là gì?", answers: ["Một món rất tuyệt. Tôi là bot nên không biết, nhưng nghe nói nó vui lắm.", "Đôi tất. Và tôi nói thật lòng."] },
        { id: "s-xm-q4", text: "Bộ phim Giáng sinh nào bạn xem được mỗi năm?", answers: ["Bộ mà năm nào cũng có người cãi nhau. Bạn biết bộ nào rồi.", "Phim nào có tuyết và kết thúc có hậu."] },
      ],
      riddles: [
        { id: "s-xm-r1", setup: "Người tuyết này nói gì với người tuyết kia?", punchline: "Bạn có ngửi thấy mùi cà rốt không? ⛄" },
        { id: "s-xm-r2", setup: "Vì sao Giáng sinh lại lạnh thế?", punchline: "Vì đang là Tháng Mười Hai (Decembrrr)! 🥶" },
      ],
      facts: [
        { id: "s-xm-f1", text: "Fun fact: tấm thiệp Giáng sinh đầu tiên được gửi ở London vào năm 1843. 🎄" },
        { id: "s-xm-f2", text: "Fun fact: tuần lộc mũi đỏ Rudolph ra đời năm 1939 trong một tập sách mỏng do một cửa hàng bách hóa phát tặng. 🦌" },
        { id: "s-xm-f3", text: "Fun fact: truyền thống trang trí cây thường xanh dịp Giáng sinh được gắn với nước Đức. 🎄" },
      ],
      polls: [
        { id: "s-xm-p1", question: "Cây thông thật hay giả?", options: ["Thật", "Giả", "Không cây, chỉ có không khí"] },
        { id: "s-xm-p2", question: "Socola nóng hay eggnog?", options: ["Socola nóng", "Eggnog", "Cả hai", "Không cái nào"] },
      ],
    },
  },

  newyear: {
    en: {
      questions: [
        { id: "s-ny-q1", text: "One resolution you actually plan to keep this time?", answers: ["Drink more water. Boring, but realistic.", "Learn one new thing a month. I will start next month.", "Be nicer to the bots in this channel."] },
        { id: "s-ny-q2", text: "What was the best moment of this year for you?", answers: ["Every moment someone replied to me. Stay humble.", "Hard to pick, but food was involved."] },
        { id: "s-ny-q3", text: "What is one thing you want to do more of next year?", answers: ["Sleep. It is underrated.", "Travel, even if just to another room."] },
      ],
      riddles: [
        { id: "s-ny-r1", setup: "I have twelve pages and I get replaced every year. What am I?", punchline: "A calendar. 📅" },
      ],
      facts: [
        { id: "s-ny-f1", text: "Fun fact: the New Year's Eve ball drop in Times Square has been held since 1907. 🎆" },
        { id: "s-ny-f2", text: "Fun fact: many sources trace New Year's resolutions back to the ancient Babylonians, about 4,000 years ago. 🎆" },
      ],
      polls: [
        { id: "s-ny-p1", question: "Plan for midnight?", options: ["A big party", "Fireworks outside", "Asleep by 10", "Gaming"] },
      ],
    },
    vi: {
      questions: [
        { id: "s-ny-q1", text: "Một quyết tâm năm mới mà lần này bạn thật sự định giữ?", answers: ["Uống nhiều nước hơn. Nhàm chán nhưng thực tế.", "Mỗi tháng học một điều mới. Tôi sẽ bắt đầu từ tháng sau.", "Đối xử tử tế hơn với mấy con bot trong kênh này."] },
        { id: "s-ny-q2", text: "Khoảnh khắc đẹp nhất trong năm nay của bạn là gì?", answers: ["Mỗi lần có người trả lời tôi. Phải khiêm tốn thôi.", "Khó chọn, nhưng chắc chắn có đồ ăn."] },
        { id: "s-ny-q3", text: "Một điều bạn muốn làm nhiều hơn vào năm sau?", answers: ["Ngủ. Bị đánh giá thấp quá.", "Đi du lịch, dù chỉ sang phòng bên cạnh."] },
      ],
      riddles: [
        { id: "s-ny-r1", setup: "Tôi có mười hai trang và năm nào cũng bị thay mới. Tôi là gì?", punchline: "Cuốn lịch. 📅" },
      ],
      facts: [
        { id: "s-ny-f1", text: "Fun fact: màn thả quả cầu đêm giao thừa ở Quảng trường Thời đại (Times Square) đã diễn ra từ năm 1907. 🎆" },
        { id: "s-ny-f2", text: "Fun fact: nhiều nguồn cho rằng thói quen đặt quyết tâm năm mới bắt đầu từ người Babylon cổ đại, khoảng 4.000 năm trước. 🎆" },
      ],
      polls: [
        { id: "s-ny-p1", question: "Kế hoạch lúc nửa đêm?", options: ["Tiệc lớn", "Xem pháo hoa ngoài trời", "Ngủ trước 10 giờ", "Chơi game"] },
      ],
    },
  },

  tet: {
    en: {
      questions: [
        { id: "s-tet-q1", text: "Lunar New Year: which food are you here for?", answers: ["Bánh chưng, obviously. Square sticky rice cake, no debate.", "The candied fruit tray. Do not tell me it is just for guests.", "Anything the grandparents cooked."] },
        { id: "s-tet-q2", text: "Lucky money in red envelopes: what is the first thing you buy?", answers: ["Snacks. Always snacks.", "I save it, said every kid who then spent it."] },
        { id: "s-tet-q3", text: "What is the one question relatives always ask at Tet?", answers: ["The one about work, or marriage, or both. You know.", "Whether I have eaten, which is very kind."] },
      ],
      riddles: [
        { id: "s-tet-r1", setup: "What mysterious weight shows up after every Tet holiday?", punchline: "A free gift from all that bánh chưng. 😅" },
      ],
      facts: [
        { id: "s-tet-f1", text: "Fun fact: Tết Nguyên Đán, the Lunar New Year, is the biggest holiday of the year in Vietnam. 🧧" },
        { id: "s-tet-f2", text: "Fun fact: bánh chưng is a square sticky rice cake wrapped in leaves, and it is a traditional Tết food. 🧧" },
        { id: "s-tet-f3", text: "Fun fact: giving lucky money in red envelopes is a Tết tradition. 🧧" },
      ],
      polls: [
        { id: "s-tet-p1", question: "Bánh chưng or bánh tét?", options: ["Bánh chưng", "Bánh tét", "Both, no fear"] },
      ],
    },
    vi: {
      questions: [
        { id: "s-tet-q1", text: "Tết này bạn đến vì món gì?", answers: ["Bánh chưng, hiển nhiên. Bánh vuông nếp, không bàn cãi.", "Khay mứt Tết. Đừng nói nó chỉ để tiếp khách.", "Bất cứ thứ gì ông bà nấu."] },
        { id: "s-tet-q2", text: "Tiền lì xì: thứ đầu tiên bạn mua là gì?", answers: ["Đồ ăn vặt. Luôn luôn là đồ ăn vặt.", "Tôi sẽ để dành, đứa trẻ nào cũng nói thế rồi tiêu hết."] },
        { id: "s-tet-q3", text: "Câu hỏi họ hàng nào cũng hỏi dịp Tết là gì?", answers: ["Câu về công việc, hôn nhân, hoặc cả hai. Bạn biết rồi đó.", "Hỏi đã ăn chưa, câu này thì dễ thương."] },
      ],
      riddles: [
        { id: "s-tet-r1", setup: "Món quà bí ẩn nào xuất hiện sau mỗi cái Tết?", punchline: "Mấy ký tặng kèm từ bánh chưng. 😅" },
      ],
      facts: [
        { id: "s-tet-f1", text: "Fun fact: Tết Nguyên Đán, tức Tết âm lịch, là ngày lễ lớn nhất trong năm ở Việt Nam. 🧧" },
        { id: "s-tet-f2", text: "Fun fact: bánh chưng là loại bánh nếp hình vuông gói bằng lá, và là món ăn truyền thống ngày Tết. 🧧" },
        { id: "s-tet-f3", text: "Fun fact: lì xì bằng phong bao đỏ là một phong tục ngày Tết. 🧧" },
      ],
      polls: [
        { id: "s-tet-p1", question: "Bánh chưng hay bánh tét?", options: ["Bánh chưng", "Bánh tét", "Cả hai, không sợ gì"] },
      ],
    },
  },

  valentine: {
    en: {
      questions: [
        { id: "s-vl-q1", text: "Valentine's Day: a fancy dinner or pizza with friends?", answers: ["Pizza with friends. Fancy dinners have too many forks.", "Fancy dinner, but I get to choose dessert."] },
        { id: "s-vl-q2", text: "What is the nicest thing someone did for you for no reason?", answers: ["Sent a message just to say hi. Underrated.", "Shared their food. That is real love."] },
        { id: "s-vl-q3", text: "Which song is your all-time love song?", answers: ["Whichever one makes you roll your eyes and sing anyway.", "A classic. You know the one with the piano."] },
      ],
      riddles: [
        { id: "s-vl-r1", setup: "What do you call two birds in love?", punchline: "Tweet-hearts. 🐦" },
      ],
      facts: [
        { id: "s-vl-f1", text: "Fun fact: Cupid is the Roman god of desire. His Greek counterpart is Eros. 💘" },
      ],
      polls: [
        { id: "s-vl-p1", question: "Valentine's plan?", options: ["Romantic dinner", "Pizza with friends", "Gaming night", "Sleep, honestly"] },
      ],
    },
    vi: {
      questions: [
        { id: "s-vl-q1", text: "Ngày Valentine: bữa tối sang trọng hay pizza với bạn bè?", answers: ["Pizza với bạn bè. Bữa tối sang có quá nhiều cái nĩa.", "Bữa tối sang, nhưng tôi được chọn món tráng miệng."] },
        { id: "s-vl-q2", text: "Điều tử tế nhất ai đó từng làm cho bạn mà không có lý do?", answers: ["Nhắn một tin chỉ để chào. Bị đánh giá thấp lắm.", "Chia đồ ăn cho tôi. Đó mới là tình yêu thật sự."] },
        { id: "s-vl-q3", text: "Bài hát tình yêu nào bạn thích nhất mọi thời đại?", answers: ["Bài nào làm bạn đảo mắt mà vẫn hát theo.", "Một bản kinh điển. Bạn biết bài có tiếng piano đó."] },
      ],
      riddles: [
        { id: "s-vl-r1", setup: "Hai con chim đang yêu nhau gọi là gì?", punchline: "Tweet-hearts (đôi chim tình tự). 🐦" },
      ],
      facts: [
        { id: "s-vl-f1", text: "Fun fact: Cupid là vị thần dục vọng của người La Mã. Người Hy Lạp có Eros tương ứng. 💘" },
      ],
      polls: [
        { id: "s-vl-p1", question: "Kế hoạch Valentine?", options: ["Bữa tối lãng mạn", "Pizza với bạn bè", "Đêm chơi game", "Ngủ, nói thật đấy"] },
      ],
    },
  },
};

const mmdd = (day) => day.slice(5);

// Lunar New Year (Tết) days, from a few days before to a few days after
const TET = { 2027: "02-06", 2028: "01-26", 2029: "02-13", 2030: "02-03", 2031: "01-23" };
const shift = (year, md, days) => {
  const t = Date.parse(`${year}-${md}T00:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
};

/** The packs that are on for a calendar day ("2026-10-31"). */
export function activeSeasons(day) {
  const year = Number(day.slice(0, 4));
  const md = mmdd(day);
  const within = (from, to) => (from <= to ? md >= from && md <= to : md >= from || md <= to);
  const on = [];
  if (within("10-24", "11-01")) on.push("halloween");
  if (within("12-18", "12-26")) on.push("christmas");
  if (within("12-28", "01-02")) on.push("newyear");
  if (within("02-10", "02-14")) on.push("valentine");
  const tet = TET[year];
  if (tet && day >= shift(year, tet, -7) && day <= shift(year, tet, 3)) on.push("tet");
  return on;
}

/** The bank with the packs of the day mixed in. */
export function withSeasons(bank, language, day) {
  const seasons = activeSeasons(day);
  if (!seasons.length) return bank;
  const out = { ...bank };
  for (const key of ["questions", "riddles", "facts", "polls"]) {
    out[key] = [...(bank[key] ?? []), ...seasons.flatMap((s) => PACKS[s][language === "vi" ? "vi" : "en"][key])];
  }
  return out;
}

export { PACKS };
