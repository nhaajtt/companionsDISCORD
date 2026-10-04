// Lines for /tranhluan, when the companions split into two camps and argue about "a or b".
// Placeholders: camp lines use {mine} (the side this bot defends) and {other} (the opposing side),
// opener lines use {a} and {b}, verdict lines use {winner} and {loser}, tie lines use {a} and {b}.
// girl and boy are for the two kinds of bots in Vietnamese; English lines are the same for everyone and live under girl.
export default {
  vi: {
    girl: {
      camp: [
        "{mine} mới là chân ái, ai cãi thì cứ thử!",
        "Nói thật nha, {mine} hơn {other} cả một con phố luôn.",
        "Team {mine} đây, không bàn cãi nữa!",
        "{other} cũng được thôi, nhưng {mine} mới là đỉnh của chóp.",
        "Cả đời này chỉ tin {mine}, không phản bội đâu.",
        "Ai chọn {other} chắc chưa biết {mine} tuyệt cỡ nào đó.",
        "{mine} mà thua thì tui đi ngược luôn!",
        "Cứ {mine} là chuẩn, khỏi cần suy nghĩ nhiều.",
        "Em đứng về {mine} tới cùng, ai rủ cũng không đổi ý.",
        "So {mine} với {other} là hơi bất công cho {mine} rồi đó.",
        "{mine} có fan cứng, {other} thì để đó cho vui thôi.",
        "Mọi người bình tĩnh, {mine} thắng là chuyện sớm muộn.",
        "Gọi {mine} là số một cũng hơi khiêm tốn đó nha.",
        "{other} ổn thôi, nhưng sao bằng {mine} được!",
        "Tui mà cầm mic là {mine} thắng từ vòng gửi xe luôn.",
        "Thử một lần {mine} là nhớ cả đời, {other} thì quên liền.",
        "Phe {mine} xin phép vỗ ngực tự hào nha!",
        "Em bênh {mine} không cần lý do, mà lý do thì có cả rổ.",
        "{mine} là đẳng cấp, còn {other} là... cũng có người thích.",
        "Ai bảo {other} hơn {mine} thì cho tui xin tờ giấy chứng minh!",
        "Nhìn {mine} là biết ai thắng rồi, khỏi cần đếm phiếu.",
        "Đừng làm {mine} giận nha, {mine} giận là không đùa đâu.",
        "{mine} ơi đừng lo, cả đội cổ vũ nhiệt tình nè!",
        "Tui nói trước, {mine} sẽ thắng, ai không tin chờ xem.",
        "Từ nhỏ đến lớn tui chỉ chung thủy với {mine} thôi.",
        "Cho {other} một điểm cố gắng, còn lại tất cả cho {mine}!",
        "Đội {mine} đông vui lắm, qua phe tui đi rồi biết.",
        "Thua {mine} không có gì xấu hổ, ai cũng vậy hết."
      ]
    },
    boy: {
      camp: [
        "Tui chọn {mine}, chốt đơn, không hoàn trả!",
        "{mine} thắng {other} nhẹ nhàng thôi, tui đoán vậy.",
        "Tui theo {mine} từ bé tới giờ, đổi sao được.",
        "Đội {mine} có tui là yên tâm rồi nha.",
        "Nói {other} hay hơn {mine} thì tui xin phép không đồng ý.",
        "{mine} là chân lý, tui nói thiệt chứ không đùa.",
        "Tui bênh {mine} tới cùng, ai qua phe {other} tui vẫn quý.",
        "Cứ để tui lo, {mine} thắng chắc luôn.",
        "Tui mà bỏ {mine} thì chắc trời sập mất.",
        "{other} cũng ngon đó, nhưng {mine} thì khỏi bàn."
      ]
    },
    opener: [
      "Kèo mới nè, {a} hay {b}? Chia phe đi mọi người!",
      "Hôm nay cãi nhau chút cho vui nha, {a} hay {b} đây?",
      "Tới giờ chia phe rồi, {a} hay {b}, chọn nhanh còn kịp!",
      "Câu hỏi triệu đô, {a} hay {b}? Ai dám nói trước nào!",
      "Chiến trường mở màn, {a} đấu với {b}, cả đội vào vị trí!"
    ],
    verdict: [
      "Tui phán nhé, {winner} thắng, {loser} cố gắng lần sau nha.",
      "Sau một hồi cãi nhau, {winner} giành chiến thắng, {loser} đừng buồn!",
      "Kết quả đã có, {winner} thắng, vỗ tay cho cả {loser} nữa nè.",
      "Trọng tài tuyên bố {winner} thắng, {loser} thua nhưng vẫn đáng yêu.",
      "Cuối cùng thì {winner} cũng lên ngôi, {loser} hẹn gặp lại!",
      "Chốt kèo, {winner} thắng, {loser} thua trong vinh quang.",
      "Phiếu bầu đã đếm xong, {winner} thắng, {loser} thua sát nút luôn.",
      "{winner} thắng rồi nha, {loser} đừng giận, mình vẫn là bạn.",
      "Hội đồng giám khảo chọn {winner}, còn {loser} thì được an ủi bằng một cái ôm."
    ],
    tie: [
      "Hòa rồi, {a} với {b} đều xứng đáng, ai cũng đúng hết!",
      "Không phân thắng bại, {a} và {b} mỗi bên một nửa thế giới.",
      "Kèo này hòa, {a} hay {b} gì cũng ngon, chọn cả hai đi!"
    ]
  },
  en: {
    girl: {
      camp: [
        "{mine} is the real deal, and I will fight anyone about it!",
        "Honestly, {mine} beats {other} by a mile.",
        "Team {mine} reporting for duty, no debate needed!",
        "{other} is fine, but {mine} is on another level.",
        "I will back {mine} for life, no regrets.",
        "Anyone picking {other} clearly has not met {mine} yet.",
        "If {mine} loses, I will eat my own hat!",
        "Just pick {mine}, no overthinking required.",
        "I am with {mine} to the very end, try me.",
        "Comparing {mine} to {other} is a little unfair to {mine}.",
        "{mine} has die-hard fans, {other} is there for decoration.",
        "Calm down everyone, {mine} wins sooner or later.",
        "Calling {mine} number one is almost too modest.",
        "{other} is okay, but how could it ever match {mine}?",
        "Hand me the mic and {mine} wins before the first round.",
        "Try {mine} once and you remember it forever.",
        "Team {mine} would like to puff its chest with pride.",
        "I defend {mine} for no reason, and I still have a hundred reasons.",
        "{mine} is class, and {other} is, well, someone likes it.",
        "Whoever says {other} beats {mine}, show me the proof!",
        "One look at {mine} and you know who wins, no vote needed.",
        "Do not make {mine} angry, it is not a joke.",
        "Do not worry, {mine}, the whole team is cheering for you!",
        "Mark my words, {mine} will win, just watch.",
        "I have been loyal to {mine} since forever.",
        "Fine, {other} gets a point for effort, and {mine} gets everything else!",
        "Team {mine} is lively and fun, join us and see!",
        "Losing to {mine} is no shame, it happens to everyone."
      ]
    },
    boy: {
      camp: []
    },
    opener: [
      "New debate time, {a} or {b}? Pick your side, everyone!",
      "Let us argue a little for fun today, {a} or {b}?",
      "Time to split into camps, {a} or {b}, choose fast!",
      "The million dollar question, {a} or {b}? Who dares go first?",
      "The battle begins, {a} versus {b}, everyone take your positions!"
    ],
    verdict: [
      "My verdict is in, {winner} wins, and {loser} can try again next time.",
      "After all that arguing, {winner} takes the crown, so chin up, {loser}!",
      "The result is here, {winner} wins, and a round of applause for {loser} too.",
      "The referee declares {winner} the winner, and {loser} is still adorable.",
      "{winner} finally takes the throne, see you again, {loser}!",
      "Deal closed, {winner} wins, and {loser} loses with honor.",
      "Votes are counted, {winner} wins, and {loser} lost by a hair.",
      "{winner} wins, {loser}, no hard feelings, we are still friends.",
      "The judges pick {winner}, and {loser} gets a consolation hug."
    ],
    tie: [
      "It is a tie, both {a} and {b} deserve it, everyone is right!",
      "No winner today, {a} and {b} each own half the world.",
      "Draw! {a} or {b}, both are great, so just take both!"
    ]
  }
};
