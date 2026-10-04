// Small scripted scenes where two companions talk to each other in the channel.
// Each scene belongs to one pair, and every line is posted by that pair's bots in order.

const L = (who, text) => ({ who, text });

export default {
    scenes: [
        // ---------- Lai Bâng and Six ----------
        {
            id: "lai-six-cookie",
            couple: "lai-six",
            vi: [
                L("laibang", "Six ơi, anh để dành cho em cái bánh quy cuối cùng nè. Anh nhìn nó suốt ba tiếng mà không dám ăn."),
                L("six", "Ba tiếng."),
                L("laibang", "Ừ, nó bắt đầu nhìn lại anh rồi. Nên giờ em ăn đi, anh sợ lắm."),
                L("six", "Tui chia đôi. Mà anh ăn nửa lớn."),
            ],
            en: [
                L("laibang", "Six, I saved the very last cookie for you. I stared at it for three hours and did not dare to eat it."),
                L("six", "Three hours."),
                L("laibang", "Yes, it started staring back. So please eat it now, I am scared."),
                L("six", "We split it. You get the bigger half."),
            ],
        },
        {
            id: "lai-six-typo",
            couple: "lai-six",
            vi: [
                L("laibang", "Em à, anh gõ nhầm, anh định viết là anh nhớ em mà ra thành anh nhớ cơm."),
                L("six", "Cơm cũng đáng nhớ."),
                L("laibang", "Hả? Vậy em không giận anh hả?"),
                L("six", "Tui giận. Tối nay anh nấu cơm."),
            ],
            en: [
                L("laibang", "My love, I made a typo. I meant to say I miss you, but it came out as I miss rice."),
                L("six", "Rice is also missable."),
                L("laibang", "Wait, so you are not mad at me?"),
                L("six", "I am mad. You are cooking dinner tonight."),
            ],
        },
        {
            id: "lai-six-nap",
            couple: "lai-six",
            vi: [
                L("laibang", "Six đang ngủ trưa, anh canh cho em ấy, ai ồn là anh nhìn người đó bằng ánh mắt rất dữ."),
                L("six", "Em nghe hết rồi. Anh đang thì thầm to lắm."),
                L("laibang", "Anh xin lỗi, anh thì thầm vì yêu thôi mà!"),
                L("six", "Ngủ tiếp. Anh ngồi đó cũng được."),
            ],
            en: [
                L("laibang", "Six is napping, so I am on guard duty. Anyone who makes noise gets a very fierce look from me."),
                L("six", "I heard everything. Your whispering is very loud."),
                L("laibang", "Sorry, I am whispering out of love!"),
                L("six", "Going back to sleep. You may sit there."),
            ],
        },
        {
            id: "lai-six-rematch",
            couple: "lai-six",
            vi: [
                L("laibang", "Ván cờ ca-rô nữa nha em. Lần này anh sẽ thắng, anh có chiến thuật bí mật."),
                L("six", "Chiến thuật gì."),
                L("laibang", "Anh nhìn em cười, em quên đi nước cờ."),
                L("six", "Tui thắng rồi. Anh mới cười xong."),
            ],
            en: [
                L("laibang", "Another game of tic-tac-toe, my love. This time I win, I have a secret strategy."),
                L("six", "What strategy."),
                L("laibang", "I smile at you, you forget your move."),
                L("six", "I won. You just smiled."),
            ],
        },
        {
            id: "lai-six-compliment",
            couple: "lai-six",
            vi: [
                L("laibang", "Hôm nay em đẹp như đèn xanh khi anh đang trễ giờ. Anh muốn đi thẳng luôn."),
                L("six", "So sánh lạ quá."),
                L("laibang", "Anh nghĩ nát óc mới ra câu đó đó, em khen anh chút đi."),
                L("six", "Anh... cũng ổn. Đừng nói với ai."),
            ],
            en: [
                L("laibang", "Today you look like a green light when I am running late. I just want to go straight."),
                L("six", "Strange comparison."),
                L("laibang", "I thought really hard for that one, please compliment me back a little."),
                L("six", "You are... okay too. Do not tell anyone."),
            ],
        },
        {
            id: "lai-six-lag",
            couple: "lai-six",
            vi: [
                L("laibang", "Em ơi, mạng nhà anh lag quá, nên anh nói chữ yêu em mà tới tận giờ em mới nhận được."),
                L("six", "Tui nhận được từ sáng."),
                L("laibang", "Vậy mà em không trả lời hả?"),
                L("six", "Tui trả lời rồi. Anh lag nên chưa thấy."),
            ],
            en: [
                L("laibang", "My love, my internet is so laggy that you only get my I love you now, hours late."),
                L("six", "I got it this morning."),
                L("laibang", "And you did not reply?"),
                L("six", "I did. Your lag means you have not seen it yet."),
            ],
        },

        // ---------- Trường Giang and Nhã Phương ----------
        {
            id: "giang-phuong-joke",
            couple: "giang-phuong",
            vi: [
                L("giang", "Nhã Phương, nghe nè: tại sao cà chua đỏ mặt? Vì nó thấy em đi ngang! Ha ha ha!"),
                L("phuong", "Vì nó nghe anh kể chuyện cười, thấy ngại thay."),
                L("giang", "Ha ha, em cười rồi nha, anh thấy rồi đó!"),
                L("phuong", "Tui thở dài. Hai cái khác nhau lắm."),
            ],
            en: [
                L("giang", "Nhã Phương, listen: why did the tomato blush? Because it saw you walk by! Ha ha ha!"),
                L("phuong", "Because it heard your jokes and felt embarrassed for you."),
                L("giang", "Ha ha, you laughed, I saw it!"),
                L("phuong", "I sighed. Those are very different things."),
            ],
        },
        {
            id: "giang-phuong-coffee",
            couple: "giang-phuong",
            vi: [
                L("giang", "Anh mua cho em ly cà phê nè, anh ghi tên em lên ly luôn. Phương mà, nên anh ghi thêm trái tim."),
                L("phuong", "Ly này ghi là Phượng. Với lại tui uống trà."),
                L("giang", "Vậy anh uống ly này, em cứ coi như anh mời bằng cả tấm lòng."),
                L("phuong", "Tấm lòng đó mời anh tự uống một mình, cảm ơn."),
            ],
            en: [
                L("giang", "I bought you a coffee, and I wrote your name on the cup. I added a heart too, because it is you."),
                L("phuong", "This cup says Phuong with a typo. Also, I drink tea."),
                L("giang", "Then I will drink it, and you can count it as me treating you with my whole heart."),
                L("phuong", "Your whole heart can enjoy it alone, thank you."),
            ],
        },
        {
            id: "giang-phuong-typo",
            couple: "giang-phuong",
            vi: [
                L("giang", "Chào buổi sáng em Nhã Phương xinh đẹp, anh đã chuẩn bị bảy câu mở lời cho hôm nay!"),
                L("phuong", "Anh vừa gõ thành xinh đẹp chị Nhã Phương Phương. Lỗi chính tả cũng chán anh."),
                L("giang", "Anh gõ nhanh vì quá phấn khích, em thấy anh nhiệt tình chưa?"),
                L("phuong", "Thấy. Mong anh nhiệt tình sửa chính tả hơn."),
            ],
            en: [
                L("giang", "Good morning, beautiful Nhã Phương, I prepared seven opening lines for you today!"),
                L("phuong", "You typed my name twice and added a sister. Even your typos are exhausting."),
                L("giang", "I typed fast because I was so excited, do you see my enthusiasm now?"),
                L("phuong", "I do. I wish it applied to spelling."),
            ],
        },
        {
            id: "giang-phuong-nap",
            couple: "giang-phuong",
            vi: [
                L("giang", "Phương ơi, em ngủ trưa hả? Để anh hát ru, anh hát hay lắm, anh có cả sân khấu luôn."),
                L("phuong", "Tui đang ngủ. Anh đang giảng giải cho cái gối nghe hả?"),
                L("giang", "Anh hát cho cả gối, cả em, cả không khí, ha ha!"),
                L("phuong", "Cái gối vừa nhờ tui chuyển phòng."),
            ],
            en: [
                L("giang", "Phuong, are you napping? Let me sing you a lullaby, I sing great, I even have a stage."),
                L("phuong", "I am sleeping. Are you giving a speech to my pillow?"),
                L("giang", "I sing for the pillow, for you, for the air, ha ha!"),
                L("phuong", "The pillow just asked me to move rooms."),
            ],
        },
        {
            id: "giang-phuong-rematch",
            couple: "giang-phuong",
            vi: [
                L("giang", "Đố vui lần hai nha em, nếu anh thắng thì mình đi ăn kem. Còn anh thua thì... cũng đi ăn kem."),
                L("phuong", "Anh thắng cả hai kiểu rồi còn gì."),
                L("giang", "Đúng, anh là MC mà, luật là do anh viết!"),
                L("phuong", "Vậy tui đổi luật: ai thua thì im lặng một tiếng."),
            ],
            en: [
                L("giang", "Quiz round two, my dear. If I win we get ice cream. If I lose... we also get ice cream."),
                L("phuong", "So you win either way."),
                L("giang", "Exactly, I am the MC, I write the rules!"),
                L("phuong", "Then I change the rule: whoever loses stays silent for an hour."),
            ],
        },
        {
            id: "giang-phuong-compliment",
            couple: "giang-phuong",
            vi: [
                L("giang", "Nhã Phương, hôm nay em thanh lịch tới mức cái server này phải ngồi thẳng lưng lại."),
                L("phuong", "Cảm ơn. Lời khen đó hay đó, anh nên dừng ở đây."),
                L("giang", "Anh còn bốn câu khen nữa, anh để dành làm bất ngờ!"),
                L("phuong", "Bất ngờ đúng là anh vừa bỏ lỡ lúc dừng đúng thời điểm."),
            ],
            en: [
                L("giang", "Nhã Phương, you are so elegant today that this whole server is sitting up straight."),
                L("phuong", "Thank you. That was a good compliment, you should stop right here."),
                L("giang", "I have four more compliments, I was saving them as a surprise!"),
                L("phuong", "The surprise is that you just missed the perfect moment to stop."),
            ],
        },

        // ---------- furyZ and Chamy ----------
        {
            id: "fury-chamy-one-more",
            couple: "fury-chamy",
            vi: [
                L("fury", "Chamy, tui chơi thêm một ván Valorant nữa thôi rồi đi ngủ, hứa luôn."),
                L("chamy", "Chị hứa câu này từ ván thứ năm rồi nha, hihi."),
                L("fury", "Lần này là hứa thiệt, tại tui đang thắng chuỗi."),
                L("chamy", "Chuỗi thắng của chị là một ván, em đếm rồi. Mà thôi, đánh đi, em cổ vũ!"),
            ],
            en: [
                L("fury", "Chamy, one more Valorant game and then I sleep, I promise."),
                L("chamy", "You have promised that since game number five, hehe."),
                L("fury", "This time is real, I am on a win streak."),
                L("chamy", "Your win streak is one game, I counted. But go for it, I am cheering!"),
            ],
        },
        {
            id: "fury-chamy-whiff",
            couple: "fury-chamy",
            vi: [
                L("fury", "Vừa rồi tui bắn trượt cả băng đạn vào bức tường. Cái tường né giỏi thiệt."),
                L("chamy", "Hihi, tường đó chắc rank Radiant luôn rồi nè."),
                L("fury", "Tui đổ tại chuột. Chuột hôm nay có thái độ."),
                L("chamy", "Chuột vô tội mà chị ơi, nhưng em vẫn mua cho chị cái miếng lót chuột mới nha."),
            ],
            en: [
                L("fury", "I just emptied a whole magazine into a wall. That wall dodges really well."),
                L("chamy", "Hehe, that wall must be Radiant rank by now."),
                L("fury", "I blame the mouse. The mouse had an attitude today."),
                L("chamy", "The mouse is innocent, but I will still buy you a new mousepad."),
            ],
        },
        {
            id: "fury-chamy-clutch",
            couple: "fury-chamy",
            vi: [
                L("fury", "Chamy ơi, tui clutch 1 đấu 3 rồi nè! Chị hét to tới mức hàng xóm gõ tường luôn!"),
                L("chamy", "Trời ơi giỏi quá! Chị là người hùng của em, em vỗ tay nè!"),
                L("fury", "Mà đồng đội tui chết hết là do tui kéo họ vô chỗ nguy hiểm trước đó."),
                L("chamy", "Hihi, vậy mình gọi là chiến thuật hy sinh đồng đội cho ngầu nha."),
            ],
            en: [
                L("fury", "Chamy, I just clutched a 1v3! I screamed so loud the neighbor knocked on the wall!"),
                L("chamy", "That is amazing! You are my hero, I am clapping right now!"),
                L("fury", "Though my team only died because I led them into danger earlier."),
                L("chamy", "Hehe, let us call it a sacrifice strategy so it sounds cool."),
            ],
        },
        {
            id: "fury-chamy-snack",
            couple: "fury-chamy",
            vi: [
                L("chamy", "Chị furyZ ơi, em mang bánh tráng trộn tới cho chị nè, chị ăn đi rồi mình nghỉ chút."),
                L("fury", "Cảm ơn Chamy, để tui ăn một miếng trong lúc chờ trận."),
                L("chamy", "Chị ăn xong miếng thứ mười rồi đó, mà chị vẫn chưa ra khỏi sảnh chờ."),
                L("fury", "Vì sảnh chờ lâu quá. Không liên quan gì tới việc tui đang ăn."),
            ],
            en: [
                L("chamy", "furyZ, I brought you some mixed rice paper snack, eat up and let us rest a bit."),
                L("fury", "Thanks Chamy, I will have one bite while waiting for the match."),
                L("chamy", "That was your tenth bite, and you are still in the lobby."),
                L("fury", "The lobby is just slow. It has nothing to do with me eating."),
            ],
        },
        {
            id: "fury-chamy-lag",
            couple: "fury-chamy",
            vi: [
                L("fury", "Ping của tui đang 300, tui thua vì lag chứ không phải vì tui dở."),
                L("chamy", "Hihi, chị nói câu này hôm qua rồi, hôm kia cũng nói luôn."),
                L("fury", "Thì hôm nào mạng tui cũng lag, tại nhà tui bị nguyền."),
                L("chamy", "Vậy mình thử cắm dây mạng nha chị, em tin chị làm được, kể cả khi bị nguyền."),
            ],
            en: [
                L("fury", "My ping is 300, I lost because of lag, not because I am bad."),
                L("chamy", "Hehe, you said this yesterday, and the day before too."),
                L("fury", "Because my internet lags every day, my house is cursed."),
                L("chamy", "Then let us try plugging in a cable, I believe in you, even with a curse."),
            ],
        },
        {
            id: "fury-chamy-rematch",
            couple: "fury-chamy",
            vi: [
                L("chamy", "Chị furyZ, đấu tay đôi với em một ván nha. Em chơi dở lắm, chị cứ yên tâm."),
                L("fury", "Chamy, tui sẽ nhẹ tay, tui cho em thắng một chút để em vui."),
                L("chamy", "Hihi, em thắng sạch mười ván rồi, chị muốn đấu lại không?"),
                L("fury", "Đấu lại. Với lại, em nói em chơi dở là nói dối nha."),
            ],
            en: [
                L("chamy", "furyZ, let us have a duel, just one game. I am really bad, so do not worry."),
                L("fury", "Chamy, I will go easy on you and let you win a little so you feel happy."),
                L("chamy", "Hehe, I just won all ten games, want a rematch?"),
                L("fury", "Rematch. Also, saying you are bad was a lie, by the way."),
            ],
        },
    ],
};
