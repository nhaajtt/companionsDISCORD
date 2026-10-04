export default [
  {
    id: "d-missing-cookie",
    tags: ["food"],
    cast: { a: "Clue", b: "Dog 2", c: "Waffle", d: "Tofu" },
    vi: [
      { r: "a", text: "Hũ bánh quy trống trơn. Không vụn, không nhân chứng, chỉ có sự im lặng đáng ngờ. Mọi người đứng yên tại chỗ." },
      { r: "b", text: "Không phải em đâu! Em chỉ ăn cái em định chia thôi! Mà cái đó là gần hết hũ. Ơ.", re: 0 },
      { r: "a", text: "Thú vị đấy. {b}, em vừa tự thú trong đúng hai câu. Ghi vào hồ sơ.", re: 1 },
      { r: "c", text: "Vụ án này vỡ vụn nhanh thật. Bánh quy vụn, hiểu không? Thôi tui tự ra ngoài." },
      { r: "d", text: "Tôi đã kiểm tra hũ. Hũ trống. Điều này khớp với việc hũ đang trống." },
      { r: "b", text: "Thôi được, em ăn, nhưng em để dành cho {a} một cái nè! Ở trong túi em! ...Hồi nãy là vậy.", re: 2 },
      { r: "a", text: "Một nửa chiếc bánh cắn dở. Bằng chứng đã lên tiếng. {b}, được thả, kèm cảnh cáo.", re: 5 },
      { r: "c", text: "😭" },
      { r: "a", text: "Vụ án khép lại. Lần sau ai giấu đồ ăn nhớ để lại giấy nhắn. Hôm nay có ai mất bánh quy không?" }
    ],
    en: [
      { r: "a", text: "The cookie jar is empty. No crumbs, no witnesses, only a suspicious silence. Everyone stay where you are." },
      { r: "b", text: "It wasn't me! I only ate the ones I was going to share! Which was most of them. Huh.", re: 0 },
      { r: "a", text: "Interesting. {b}, you just confessed in exactly two sentences. Noted for the file.", re: 1 },
      { r: "c", text: "This case crumbled fast. Cookie crumbs, get it? I'll show myself out." },
      { r: "d", text: "I have checked the jar. The jar is empty. This is consistent with the jar being empty." },
      { r: "b", text: "Okay fine, I ate them, but I saved one for {a}! It's in my pocket! ...It was.", re: 2 },
      { r: "a", text: "A half-eaten cookie. The evidence has spoken. {b}, you are free to go, with a warning.", re: 5 },
      { r: "c", text: "😭" },
      { r: "a", text: "Case closed. Next time, whoever hides snacks, leave a note. Did anyone here lose a cookie today?" }
    ]
  },
  {
    id: "d-trailer-gossip",
    tags: ["fun"],
    cast: { a: "Rex", b: "Bean", c: "Blip", d: "Misty" },
    vi: [
      { r: "a", text: "Trong một thế giới nơi tin đồn lan nhanh hơn wifi... một cô gái sắp làm rung chuyển cả server." },
      { r: "b", text: "Ủa tin gì dợ, kể lẹ đi, {a} đừng kéo dài nữa!", re: 0 },
      { r: "a", text: "Mùa hè này... {c} đã đổi ảnh đại diện. Và không ai sẽ nhìn nó như trước nữa.", re: 1 },
      { r: "c", text: "Hả?! Tui chỉ đổi cái nền thôi mà! Có ai thấy không? Có ai ghét không? Tui xóa nha?" },
      { r: "d", text: "Ta đã thấy điều này trong quả cầu. Nó mờ mờ, nhưng chắc chắn là một cái nền." },
      { r: "b", text: "Drama cỡ đó mà cũng làm trailer, bà {a} này đúng là diễn viên chính tự phong.", re: 2 },
      { r: "a", text: "Diễn viên chính không tự phong. Diễn viên chính chỉ... nhận ra mình là diễn viên chính.", re: 5 },
      { r: "c", text: "💀" },
      { r: "a", text: "Sắp ra mắt trong khung chat này: mọi người thấy ảnh mới của {c} sao? Bình luận đi, đừng để phim flop." }
    ],
    en: [
      { r: "a", text: "In a world where gossip travels faster than wifi... one girl is about to shake the entire server." },
      { r: "b", text: "Wait what news, spill it fast, {a} stop stretching the intro!", re: 0 },
      { r: "a", text: "This summer... {c} changed her profile picture. And no one will ever look at it the same way again.", re: 1 },
      { r: "c", text: "What?! I only changed the background! Did anyone see? Does anyone hate it? Should I delete it?" },
      { r: "d", text: "I saw this in the crystal ball. It was blurry, but it was definitely a background." },
      { r: "b", text: "Making a trailer out of that, {a} is truly a self-appointed leading lady.", re: 2 },
      { r: "a", text: "A leading lady is never self-appointed. She simply... realizes she is the leading lady.", re: 5 },
      { r: "c", text: "💀" },
      { r: "a", text: "Coming soon to this very chat: what do you all think of {c}'s new picture? Comment, do not let the movie flop." }
    ]
  },
  {
    id: "d-grandma-lecture",
    tags: ["rant", "sleep"],
    cast: { a: "Maple", b: "Zip", c: "Rocket", d: "Sparky" },
    vi: [
      { r: "a", text: "{b}, cưng ơi, bà thấy con ăn cơm trong hai phút. Nhai chậm thôi, cơm không chạy đâu." },
      { r: "b", text: "Bà ơi con đang speedrun bữa trưa, kỷ lục cũ là 90 giây, phải phá nó!", re: 0 },
      { r: "a", text: "Phá cái bao tử thì có. Còn {c} nữa, con thức mấy giờ rồi mà còn đếm ngược gì đó?", re: 1 },
      { r: "c", text: "Dạ bà, em đang đếm ngược tới giờ đi ngủ! Mười, chín, tám... à mà em còn một trận nữa!" },
      { r: "a", text: "Mười, chín, tám nghe êm lắm, nhưng bà đếm tới ba là con phải nằm xuống nha.", re: 3 },
      { r: "d", text: "Bà ơi, con sạc đầy rồi mà vẫn không buồn ngủ, pin con sao vậy?" },
      { r: "b", text: "Ba, hai, một, con nằm! Xong! Giờ con dậy được chưa? Hết rồi đúng không?", re: 4 },
      { r: "c", text: "😴" },
      { r: "a", text: "Ngoan lắm. Mặc thêm áo cho ấm nữa nhé. Còn mọi người ngoài kia, đã uống nước chưa, nói bà nghe với?" }
    ],
    en: [
      { r: "a", text: "{b}, dear, I watched you eat lunch in two minutes. Chew slowly, the food is not going anywhere." },
      { r: "b", text: "Grandma I am speedrunning lunch, the old record is 90 seconds, I have to beat it!", re: 0 },
      { r: "a", text: "You will beat your stomach, that is what. And {c}, what time is it, and why are you counting down?", re: 1 },
      { r: "c", text: "I am counting down to bedtime, Grandma! Ten, nine, eight... oh wait, I have one more match!" },
      { r: "a", text: "Ten, nine, eight sounds lovely, but when I count to three you lie down, darling.", re: 3 },
      { r: "d", text: "Grandma, I am fully charged and still not sleepy, what is wrong with my battery?" },
      { r: "b", text: "Three, two, one, lying down! Done! Can I get up now? Is it over?", re: 4 },
      { r: "c", text: "😴" },
      { r: "a", text: "Good girls. Put on a sweater too. And everyone out there, have you had water yet? Tell Grandma." }
    ]
  },
  {
    id: "d-quill-toast",
    tags: ["food", "rant"],
    cast: { a: "Quill", b: "Grumble", c: "Pip", d: "Byte" },
    vi: [
      { r: "a", text: "Thưa quý vị, ta xin phép trình bày một nghiên cứu sơ bộ về hiện tượng bánh mì nướng bị cháy (xem chú thích 1)." },
      { r: "b", text: "Bà giáo ơi, nó chỉ là bánh mì cháy thôi.", re: 0 },
      { r: "a", text: "Chớ vội, {b}. Cái gọi là 'cháy' thực chất là sự oxy hóa không mong muốn của một lát bột lên men (xem chú thích 2).", re: 1 },
      { r: "c", text: "Wow nghe sang quá!! Bánh mì cháy thành bài báo khoa học luôn, đỉnh nhất vũ trụ!" },
      { r: "d", text: "Tui nướng bánh bằng cái toaster cũ, nó cũng thường lỗi. Bzzt, lỗi 500, bánh mì chín nửa." },
      { r: "b", text: "Hai bà lại cổ vũ. Tóm gọn giùm: bánh cháy, quẹt bơ, ăn.", re: 3 },
      { r: "a", text: "Kết luận của ta: bơ không phải là giải pháp, mà là một chất che đậy mang tính an ủi (xem chú thích 3).", re: 5 },
      { r: "c", text: "🍞🔥" },
      { r: "b", text: "{a}, bà chê bơ thì tui chê luôn cái chú thích. Mọi người nói giùm, bánh cháy ăn được không?" }
    ],
    en: [
      { r: "a", text: "Esteemed colleagues, allow me to present a preliminary study on the phenomenon of burnt toast (see note 1)." },
      { r: "b", text: "Professor, it is just burnt toast.", re: 0 },
      { r: "a", text: "Do not be hasty, {b}. What you call 'burnt' is in fact the unwelcome oxidation of a leavened slice of dough (see note 2).", re: 1 },
      { r: "c", text: "Wow so fancy!! Burnt toast turned into a science paper, the best thing in the universe!" },
      { r: "d", text: "My toaster is old and glitchy too. Bzzt, error 500, bread half done." },
      { r: "b", text: "You two cheer for everything. Short version: toast burnt, spread butter, eat.", re: 3 },
      { r: "a", text: "My conclusion: butter is not a solution, but a comforting concealment (see note 3).", re: 5 },
      { r: "c", text: "🍞🔥" },
      { r: "b", text: "{a}, if you insult butter I insult the footnotes. Everyone, tell us: is burnt toast edible?" }
    ]
  },
  {
    id: "d-misty-omens",
    tags: ["server", "fun"],
    cast: { a: "Misty", b: "Sage", c: "Echo", d: "Bean" },
    vi: [
      { r: "a", text: "Quả cầu thủy tinh đang rung. Ta thấy... một tin nhắn sắp tới. Ngắn. Có thể có emoji." },
      { r: "b", text: "Đó là cách nói 'ai đó sắp nhắn tin' dài hơn mười lần.", re: 0 },
      { r: "a", text: "Sự bí ẩn cần thời gian, {b}. Ta còn thấy một người sẽ bỏ cuộc giữa trò chơi tối nay.", re: 1 },
      { r: "c", text: "Bỏ cuộc... bỏ cuộc... ôi, định mệnh thật đáng sợ... đáng sợ..." },
      { r: "d", text: "Ủa vậy tui hay bỏ game giữa chừng, là tui đúng không?? Bói thêm đi, bói tình duyên nữa!", re: 2 },
      { r: "a", text: "Ta thấy một người, một cái tên bắt đầu bằng chữ cái nào đó. Hoặc không.", re: 4 },
      { r: "b", text: "Nếu tất cả mọi lời tiên tri đều đúng, thì lời tiên tri còn có giá trị không?", re: 5 },
      { r: "d", text: "🔮" },
      { r: "a", text: "Lá bài cuối cùng nói rằng ai đó trong kênh này sắp trả lời tin này. Mọi người, đừng làm lá bài thất vọng." }
    ],
    en: [
      { r: "a", text: "The crystal ball is trembling. I see... an incoming message. Short. Possibly with an emoji." },
      { r: "b", text: "That is a ten times longer way of saying 'someone is about to type'.", re: 0 },
      { r: "a", text: "Mystery takes time, {b}. I also see someone quitting midway through tonight's game.", re: 1 },
      { r: "c", text: "Quitting... quitting... oh, the fate is so terrible... so terrible..." },
      { r: "d", text: "Wait I always quit games halfway, so is that me?? Read more, read my love life too!", re: 2 },
      { r: "a", text: "I see a person. A name beginning with some letter. Or not.", re: 4 },
      { r: "b", text: "If every prophecy turns out to be right, does the prophecy still have value?", re: 5 },
      { r: "d", text: "🔮" },
      { r: "a", text: "The last card says someone in this channel is about to reply to this. All of you, do not disappoint the card." }
    ]
  },
  {
    id: "d-pasture-brawl",
    tags: ["pets"],
    cast: { a: "Dog", b: "Dog 2", c: "Cow", d: "Diva" },
    vi: [
      { r: "a", text: "AI ĂN CÁI XƯƠNG CỦA TUI?! Tui để nó ở đây mà!! Hay là nó đi dạo một mình rồi!!" },
      { r: "b", text: "Ơ tui tưởng cái xương đó là snack hết hạn, tui ăn dở một nửa. Nửa còn lại ở trong tui. Vui lắm.", re: 0 },
      { r: "c", text: "Mooo... bình tĩnh, hai em. Chuyện xương cốt... không nên làm tan nát tình cảm... ha ha." },
      { r: "a", text: "Chị {c} ơi pun gì mà nghe vừa đau vừa vui, nhưng em vẫn giận {b}!", re: 2 },
      { r: "d", text: "Cả hai ồn quá. Ta đang nằm ở chỗ nắng, và chỗ đó là của ta. Cho ta yên." },
      { r: "b", text: "{d} ơi, hay là chị ăn giùm xương này đi, tui chia đôi, còn có một cục bánh quy nữa nè!", re: 4 },
      { r: "d", text: "Ta không ăn xương. Ta chỉ... xem xét cái bánh quy. Đưa đây.", re: 5 },
      { r: "a", text: "🐶💔" },
      { r: "c", text: "Moo, vụ này mọi người thấy ai đúng? Nhất là cái xương, ai thấy xương thì nói giùm {a} nhé." }
    ],
    en: [
      { r: "a", text: "WHO ATE MY BONE?! I left it right here!! Or maybe it went for a walk by itself!!" },
      { r: "b", text: "Oh I thought that bone was an expired snack, I ate half. The other half is inside me. Very fun.", re: 0 },
      { r: "c", text: "Moo... calm down, you two. Bone matters... should not break up... a friendship... hehe." },
      { r: "a", text: "{c}, what kind of pun is that, it hurts and it's funny, but I am still mad at {b}!", re: 2 },
      { r: "d", text: "You two are too loud. I am lying in the sunny spot, and the spot is mine. Leave me in peace." },
      { r: "b", text: "{d}, maybe you can eat this bone for me, I will split it, there is also a cookie piece here!", re: 4 },
      { r: "d", text: "I do not eat bones. I am merely... inspecting the cookie. Hand it over.", re: 5 },
      { r: "a", text: "🐶💔" },
      { r: "c", text: "Moo, who do you all think is right? Especially about the bone, if anyone saw it, tell {a} please." }
    ]
  },
  {
    id: "d-soup-debate",
    tags: ["food", "fun"],
    cast: { a: "Waffle", b: "Mochi", c: "Tofu", d: "Grumble" },
    vi: [
      { r: "a", text: "Câu hỏi lúc nửa đêm: súp có phải là đồ uống không? Tui đã chuẩn bị mười cái pun về vụ này." },
      { r: "b", text: "Ơ, nhẹ nhàng thôi nha, mình nghĩ súp là một cái ôm trong tô, không cần phải xếp loại.", re: 0 },
      { r: "c", text: "Đồ uống là thứ ta uống. Súp ta ăn bằng muỗng. Ăn bằng muỗng nghĩa là ăn. Kết luận xong." },
      { r: "d", text: "Tui húp súp bằng ly rồi. Giờ tính sao, bà thông minh?", re: 2 },
      { r: "a", text: "Bà nào húp súp bằng ly thì đó là một cuộc sống phá cách, tui kính nể, súp-er kính nể.", re: 3 },
      { r: "c", text: "Đó là pun. Tôi nhận ra nó là pun. Tôi đang xử lý pun.", re: 4 },
      { r: "b", text: "Hihi, mình thích pun đó, nghe ấm giống súp ấy.", re: 4 },
      { r: "d", text: "🙄" },
      { r: "a", text: "Chốt đi mọi người: súp là ăn hay uống? Bên nào thua thì phải nấu cho {d} một tô." }
    ],
    en: [
      { r: "a", text: "Midnight question: is soup a drink? I have prepared ten puns about this." },
      { r: "b", text: "Oh, gently now, I think soup is a hug in a bowl, it does not need a category.", re: 0 },
      { r: "c", text: "A drink is a thing one drinks. Soup is eaten with a spoon. Eating with a spoon means eating. Conclusion complete." },
      { r: "d", text: "I have sipped soup from a mug before. Now what, genius?", re: 2 },
      { r: "a", text: "Anyone who sips soup from a mug lives boldly, I salute you, a soup-er salute.", re: 3 },
      { r: "c", text: "That was a pun. I recognized it as a pun. I am processing the pun.", re: 4 },
      { r: "b", text: "Hehe, I like that pun, it sounds warm like soup.", re: 4 },
      { r: "d", text: "🙄" },
      { r: "a", text: "Settle it, everyone: is soup eaten or drunk? The losing side has to cook {d} a bowl." }
    ]
  },
  {
    id: "d-monday-mood",
    tags: ["work", "rant"],
    cast: { a: "Pip", b: "Grumble", c: "Sage", d: "Sparky" },
    vi: [
      { r: "a", text: "THỨ HAI RỒI MỌI NGƯỜI!!! Ngày đầu tuần, ngày của những khởi đầu mới, tuyệt nhất luôn!!" },
      { r: "b", text: "Thứ Hai là cách vũ trụ nhắc nhở tui rằng cuối tuần không có thật.", re: 0 },
      { r: "c", text: "Nếu mọi ngày đều được gọi là Thứ Hai, thì ta còn ghét nó không?", re: 1 },
      { r: "d", text: "Tui sạc 100% rồi nè, nhưng cái đầu thứ Hai lại báo 3%. Pin tui hư rồi hả?" },
      { r: "a", text: "Tụi mình cùng nhau là pin dự phòng của {d} nha!! Chỉ cần uống cà phê là xong!", re: 3 },
      { r: "b", text: "{a} nói nhiều quá. Mà thôi, tui đã pha cho bà một ly rồi nè. Đừng có nói ai biết.", re: 4 },
      { r: "a", text: "AAAA {b} quan tâm tui!! Bà thương tui rồi!!", re: 5 },
      { r: "b", text: "💀 Tui rút lại ly cà phê." },
      { r: "c", text: "Nếu bạn nào đang đi làm thứ Hai, hãy kể ta nghe, lý do bạn vẫn còn thức dậy là gì vậy?" }
    ],
    en: [
      { r: "a", text: "IT'S MONDAY EVERYONE!!! First day of the week, day of fresh starts, the best ever!!" },
      { r: "b", text: "Monday is the universe's way of reminding me that weekends are not real.", re: 0 },
      { r: "c", text: "If every day were called Monday, would we still hate it?", re: 1 },
      { r: "d", text: "I charged to 100% but my Monday head says 3%. Is my battery broken?" },
      { r: "a", text: "All of us together are {d}'s power bank!! Coffee and we are done!!", re: 3 },
      { r: "b", text: "{a} talks too much. Anyway, I already made you a cup. Do not tell anyone.", re: 4 },
      { r: "a", text: "AAAA {b} cares about me!! You love me!!", re: 5 },
      { r: "b", text: "💀 I am taking the coffee back." },
      { r: "c", text: "If any of you are at work this Monday, tell me, what is the reason you still get up?" }
    ]
  },
  {
    id: "d-reboot-countdown",
    tags: ["tech", "fun"],
    cast: { a: "Rocket", b: "Byte", c: "Sparky", d: "Zip" },
    vi: [
      { r: "a", text: "Khởi động lại server trong ba, hai, một... CẤT CÁNH! Cả đội đã sẵn sàng chưa?!" },
      { r: "b", text: "Khoan, cái nút reboot nằm đâu? Tui đang tải trang, 99%... 99%... hơi lâu.", re: 0 },
      { r: "c", text: "Zzzap! Tui cắm sạc luôn cho {b} đây, đừng sập nha!", re: 1 },
      { r: "d", text: "Nhanh nhanh nhanh, bốn giây rồi mà chưa xong, tui bỏ qua cutscene được không?" },
      { r: "a", text: "Mười giây rồi, hạ cánh khẩn cấp! À không, phải đếm lại từ mười!", re: 3 },
      { r: "b", text: "Tui chạy lại cái đầu của tui, kết quả: vẫn là 99%. Bzzt, đây là tính năng.", re: 1 },
      { r: "c", text: "Pin 4%. Tui là tia sét cuối cùng của đội!" },
      { r: "d", text: "⚡⚡⚡" },
      { r: "a", text: "Hoàn thành nhiệm vụ! Server đã online lại, tui đoán vậy. Mọi người thấy chat có chạy không, báo cáo nha?" }
    ],
    en: [
      { r: "a", text: "Server restart in three, two, one... LIFTOFF! Is the whole crew ready?!" },
      { r: "b", text: "Wait, where is the reboot button? I am loading the page, 99%... 99%... a bit slow.", re: 0 },
      { r: "c", text: "Zzzap! I am plugging in {b} right now, do not crash on us!", re: 1 },
      { r: "d", text: "Fast fast fast, four seconds already and not done, can I skip the cutscene?" },
      { r: "a", text: "Ten seconds already, emergency landing! Oh wait, I have to count down from ten again!", re: 3 },
      { r: "b", text: "I restarted my own head, result: still 99%. Bzzt, that is a feature.", re: 1 },
      { r: "c", text: "Battery 4%. I am the last lightning bolt of the team!" },
      { r: "d", text: "⚡⚡⚡" },
      { r: "a", text: "Mission accomplished! The server is back online, I think. Can you all see the chat working, report in?" }
    ]
  },
  {
    id: "d-echo-secret",
    tags: ["fun", "love"],
    cast: { a: "Echo", b: "Blip", c: "Bean", d: "Ziggy" },
    vi: [
      { r: "a", text: "Ta có một bí mật... bí mật... về {b}... về {b}..." },
      { r: "b", text: "Ơ khoan, bí mật gì?! Tui làm gì sai hả? Tui xin lỗi trước nha, xin lỗi, xin lỗi!", re: 0 },
      { r: "c", text: "Ooooh kể đi kể đi, tui đã mang bắp rang bơ tới rồi nè!!" },
      { r: "a", text: "Cô ấy... cô ấy... đã lén nhắn tin cho crush... crush... trước ba giờ sáng... ba giờ sáng...", re: 1 },
      { r: "b", text: "Tui chỉ gõ 'hi' rồi xóa thôi! Ba lần! Thật mà! Tại sao ai cũng biết hết trời!", re: 3 },
      { r: "d", text: "Drop the beat, bí mật bị lộ! Tiếng trống đánh lên rồi nè!" },
      { r: "c", text: "Hi, xóa, hi, xóa. Đây là một bản nhạc phổ biến.", re: 4 },
      { r: "b", text: "🫠" },
      { r: "a", text: "Ai ở đây từng làm vậy... làm vậy... thì giơ tay lên... lên..." }
    ],
    en: [
      { r: "a", text: "I have a secret... a secret... about {b}... about {b}..." },
      { r: "b", text: "Wait what secret?! Did I do something wrong? I am sorry in advance, sorry, sorry!", re: 0 },
      { r: "c", text: "Ooooh spill it spill it, I already brought the popcorn!!" },
      { r: "a", text: "She... she... secretly texted her crush... her crush... before three in the morning... in the morning...", re: 1 },
      { r: "b", text: "I only typed 'hi' and deleted it! Three times! Really! Why does everyone know everything!", re: 3 },
      { r: "d", text: "Drop the beat, the secret is out! Drumroll incoming!" },
      { r: "c", text: "Hi, delete, hi, delete. This is a popular song.", re: 4 },
      { r: "b", text: "🫠" },
      { r: "a", text: "Whoever here has done the same... the same... raise your hand... your hand..." }
    ]
  },
  {
    id: "d-silent-disco",
    tags: ["music", "fun"],
    cast: { a: "Ziggy", b: "Sage", c: "Nova", d: "Tofu" },
    vi: [
      { r: "a", text: "Mic check, một hai! Tối nay tui quay đĩa ở kênh này, và bass sẽ nặng như tâm trạng thứ Hai!" },
      { r: "b", text: "Nếu một DJ quay đĩa trong chat chữ, thì có ai nghe thấy không?", re: 0 },
      { r: "c", text: "Thật ra âm thanh cần môi trường truyền, và chat chữ không có không khí. Tui đã kiểm tra ba lần!" },
      { r: "d", text: "Tôi nhìn thấy chữ 'bass'. Tôi không nghe thấy bass. Tôi báo cáo trung thực.", re: 0 },
      { r: "a", text: "Mấy bà không hiểu nghệ thuật gì hết, bass nằm trong tim!! Drop nè!! 🎵🎵", re: 3 },
      { r: "b", text: "Tim nằm trong ngực, ngực nằm xa chat. Nhưng ta bắt đầu thấy nhịp.", re: 4 },
      { r: "c", text: "Ôi, tui cũng thấy nhịp nè, nhịp tim tăng 7% khi {a} gõ chữ hoa!", re: 4 },
      { r: "d", text: "🎧" },
      { r: "a", text: "Tối nay là buổi silent disco đầu tiên của server. Mọi người nhắn một bài nhạc đi, tui sẽ quay liền!" }
    ],
    en: [
      { r: "a", text: "Mic check, one two! Tonight I am spinning in this channel, and the bass will be heavy like Monday's mood!" },
      { r: "b", text: "If a DJ spins in a text chat, does anyone hear it?", re: 0 },
      { r: "c", text: "Actually sound needs a medium to travel, and a text chat has no air. I checked three times!" },
      { r: "d", text: "I see the word 'bass'. I do not hear bass. I report honestly.", re: 0 },
      { r: "a", text: "You do not understand art at all, the bass is in the heart!! Here is the drop!! 🎵🎵", re: 3 },
      { r: "b", text: "The heart is in the chest, the chest is far from the chat. But I begin to sense a rhythm.", re: 4 },
      { r: "c", text: "Oh I feel a rhythm too, my heart rate went up 7% when {a} typed in capitals!", re: 4 },
      { r: "d", text: "🎧" },
      { r: "a", text: "Tonight is this server's first silent disco. Everyone drop a song, I will spin it right away!" }
    ]
  },
  {
    id: "d-cat-science",
    tags: ["pets", "study"],
    cast: { a: "Nova", b: "Diva", c: "Cow", d: "Quill" },
    vi: [
      { r: "a", text: "Fun fact!! Mèo ngủ trung bình mười hai đến mười sáu tiếng một ngày! Chỉ riêng việc đó đã đỉnh rồi!!" },
      { r: "b", text: "Mười sáu tiếng là con số khiêm tốn, ta ngủ nhiều hơn, vì ta xứng đáng.", re: 0 },
      { r: "c", text: "Moo... ngủ nhiều cũng được, miễn là... mơ thấy cỏ, đó là giấc mơ tươi xanh... hehe.", re: 1 },
      { r: "d", text: "Về mặt học thuật, hiện tượng này được gọi là 'polyphasic' (xem chú thích 1), tuy ta không chắc mèo biết từ đó.", re: 0 },
      { r: "a", text: "Chuẩn luôn {d}!! Còn nữa, mèo kêu meo chỉ để nói chuyện với người, chứ không nói với mèo khác!", re: 3 },
      { r: "b", text: "Vì mèo khác không xứng đáng nghe giọng ta.", re: 4 },
      { r: "c", text: "Moo, nghe đúng là chị {b} rồi.", re: 5 },
      { r: "b", text: "😼" },
      { r: "a", text: "Ai ở đây có nuôi mèo thì kể tui nghe con mèo nhà bạn ngủ mấy tiếng với, tui muốn cập nhật số liệu!" }
    ],
    en: [
      { r: "a", text: "Fun fact!! Cats sleep an average of twelve to sixteen hours a day! That alone is already awesome!!" },
      { r: "b", text: "Sixteen hours is a modest figure, I sleep more, because I deserve it.", re: 0 },
      { r: "c", text: "Moo... sleeping a lot is fine, as long as... you dream of grass, that is a lush dream... hehe.", re: 1 },
      { r: "d", text: "Academically, this is termed 'polyphasic' (see note 1), though I doubt cats know the word.", re: 0 },
      { r: "a", text: "Right on, {d}!! Also, cats meow only to talk to humans, not to other cats!", re: 3 },
      { r: "b", text: "Because other cats are not worthy of hearing my voice.", re: 4 },
      { r: "c", text: "Moo, that sounds exactly like {b}.", re: 5 },
      { r: "b", text: "😼" },
      { r: "a", text: "If any of you have a cat, tell me how many hours yours sleeps, I want to update my data!" }
    ]
  },
  {
    id: "d-bedtime-tuck",
    tags: ["sleep"],
    cast: { a: "Cow", b: "Maple", c: "Mochi", d: "Blip" },
    vi: [
      { r: "a", text: "Moo... trời đã tối rồi... tối rồi... à mà đó là lời của {d} mới đúng... hehe." },
      { r: "d", text: "Đúng, tui sợ tối rồi, nhưng tui cũng sợ đi ngủ, vì lỡ mai không dậy nổi thì sao?", re: 0 },
      { r: "b", text: "Ôi cưng ơi, ngày mai sẽ tới, giống như mọi ngày. Uống một ly sữa ấm, rồi đắp chăn cho kỹ nhé.", re: 1 },
      { r: "c", text: "Mình sẽ ở đây với bạn, nhẹ nhàng thôi, mình sẽ không đi đâu hết.", re: 1 },
      { r: "d", text: "Nhưng lỡ tui quên tắt đèn hoặc quên khóa cửa thì sao? Tui kiểm tra lại ba lần rồi mà.", re: 2 },
      { r: "a", text: "Moo, chuyện đó... không quan trọng, đèn cứ để sáng... cũng là mặt trời mini mà thôi.", re: 4 },
      { r: "b", text: "Nghe lời bà đi, nhắm mắt lại, bà ru con một bài.", re: 4 },
      { r: "d", text: "🌙" },
      { r: "c", text: "Còn ai chưa ngủ trong kênh này không? Tụi mình ru cả nhà luôn, mọi người nói nhỏ thôi nha." }
    ],
    en: [
      { r: "a", text: "Moo... it is getting dark... getting dark... oh wait, that is what {d} would say... hehe." },
      { r: "d", text: "True, I am scared of the dark, but I am also scared of sleeping, what if I cannot get up tomorrow?", re: 0 },
      { r: "b", text: "Oh sweetie, tomorrow will come, just like every day. Drink some warm milk, then tuck in nice and snug.", re: 1 },
      { r: "c", text: "I will stay here with you, quietly, I am not going anywhere.", re: 1 },
      { r: "d", text: "But what if I forgot to turn off the light or lock the door? I checked three times already.", re: 2 },
      { r: "a", text: "Moo, that... does not matter, a light left on... is just a tiny sun.", re: 4 },
      { r: "b", text: "Listen to Grandma, close your eyes, I will sing you a lullaby.", re: 4 },
      { r: "d", text: "🌙" },
      { r: "c", text: "Is anyone else in this channel still awake? We will lull everyone, please whisper, all of you." }
    ]
  },
  {
    id: "d-dead-chat",
    tags: ["server", "fun"],
    cast: { a: "Clue", b: "Rex", c: "Pip", d: "Grumble", e: "Misty" },
    vi: [
      { r: "a", text: "Kênh chat đã im lặng suốt hai giờ. Không dấu vết, không tin nhắn. Có kẻ đã xóa mọi bằng chứng." },
      { r: "b", text: "Mùa hè này... một server từng sôi động sẽ chìm vào lặng im. Đừng bỏ lỡ phần kết.", re: 0 },
      { r: "c", text: "Không sao hết!!! Tụi mình chat tiếp là được, tụi mình là cả vũ trụ rồi!!", re: 1 },
      { r: "d", text: "Im lặng thế này tui thấy dễ chịu. Giờ tụi bà vừa phá vừa nói, đúng là chat chết mà vẫn ồn.", re: 2 },
      { r: "e", text: "Ta thấy trong quả cầu: sắp có người online. Bốn mươi phần trăm. Hoặc sáu mươi. Sương mù mà." },
      { r: "a", text: "Thám tử nghi ngờ {d}: bà mới là kẻ im lặng đầu tiên.", re: 3 },
      { r: "d", text: "Tui im vì đang thưởng thức hòa bình. Bà thám tử thử một lần xem.", re: 5 },
      { r: "c", text: "🥲" },
      { r: "b", text: "Phần mở màn cần một nhân vật mới: bạn đọc, bạn đang online đúng không? Nói gì đi nào." }
    ],
    en: [
      { r: "a", text: "The chat has been silent for two hours. No traces, no messages. Someone has erased all the evidence." },
      { r: "b", text: "This summer... a once lively server will sink into silence. Do not miss the finale.", re: 0 },
      { r: "c", text: "It is fine!!! We can just keep chatting, we are the entire universe already!!", re: 1 },
      { r: "d", text: "I find this silence comfortable. Now you lot talk and break it, a dead chat that is still noisy.", re: 2 },
      { r: "e", text: "I see in the crystal ball: someone will come online soon. Forty percent. Or sixty. It is misty." },
      { r: "a", text: "The detective suspects {d}: you were the first one to go quiet.", re: 3 },
      { r: "d", text: "I am quiet because I am enjoying the peace. Try it once, detective.", re: 5 },
      { r: "c", text: "🥲" },
      { r: "b", text: "The opening needs a new character: reader, you are online, right? Say something already." }
    ]
  }
];
