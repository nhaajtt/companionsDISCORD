/* companionsDISCORD invite helper: Application IDs in, one invite link per bot out.
   Everything runs in the page. No requests, no tokens kept. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root && root.document) api.init(root);
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  var MAX = 30;
  var NAMES = ["Pip", "Grumble", "Nova", "Sage", "Bean", "Diva", "Dog", "Dog 2", "Cow", "Rex", "Maple", "Rocket", "Zip", "Clue", "Mochi", "Waffle", "Tofu", "Ziggy", "Echo", "Misty", "Byte", "furyZ", "Chamy", "Sizzle", "Gizmo", "Anchor", "Jinx", "Quill", "Blip", "Sparky"];
  var PERMISSIONS = 562949954538496;
  var KEY = "companions-invite-ids";

  function personality(n) {
    // n is the 1-based bot number; the order matches how the program assigns personalities by token order
    return NAMES[(n - 1) % NAMES.length];
  }

  function inviteLink(id) {
    return "https://discord.com/oauth2/authorize?client_id=" + id + "&scope=bot%20applications.commands&permissions=" + PERMISSIONS;
  }

  /* Looks like a bot token (or another secret): has a dot, or is long text that is not purely digits. */
  function looksLikeToken(s) {
    if (/^\d+$/.test(s)) return false;
    return s.indexOf(".") !== -1 || (s.length >= 30 && /[A-Za-z]/.test(s)) || /^[A-Za-z0-9_-]{24,}$/.test(s);
  }

  /* Pure parser. Never returns or keeps a token-like entry.
     ids: valid, deduplicated, capped; tokens: how many token-like entries were dropped;
     invalid: how many entries were not 15-22 digits; extra: valid ids beyond the cap;
     kept: the entries that are safe to show again (everything except token-like ones). */
  function parseIds(text) {
    var parts = String(text == null ? "" : text).split(/[\s,;]+/).filter(Boolean);
    var ids = [];
    var seen = {};
    var kept = [];
    var res = { ids: ids, tokens: 0, invalid: 0, extra: 0, kept: kept };
    parts.forEach(function (p) {
      if (looksLikeToken(p)) {
        res.tokens++;
        return;
      }
      kept.push(p);
      if (!/^\d{15,22}$/.test(p)) {
        res.invalid++;
        return;
      }
      if (seen[p]) return;
      seen[p] = true;
      if (ids.length >= MAX) res.extra++;
      else ids.push(p);
    });
    return res;
  }

  function init(win) {
    var doc = win.document;
    var ta = doc.getElementById("ids");
    if (!ta) return;
    var vi = (doc.documentElement.lang || "en").slice(0, 2) === "vi";
    var T = vi
      ? {
          bot: "Bot ", pers: "tính cách: ", open: "Mở lời mời", copy: "Chép link", copied: "Đã chép",
          count: function (n) { return n + " bot"; },
          token: "Đó trông như một token bot, không phải Application ID. Mình đã bỏ nó, không lưu và không hiển thị. Chỉ dán Application ID (dãy số dài). Nếu lỡ dán token thật ở đâu đó, hãy vào Developer Portal và đặt lại (Reset Token).",
          invalid: function (n) { return n + " mục không phải ID hợp lệ (cần 15 đến 22 chữ số), đã bỏ qua."; },
          extra: function (n) { return "Chỉ lấy " + MAX + " bot đầu tiên, bỏ " + n + " ID thừa."; },
          blocked: "Trình duyệt có thể chặn bớt cửa sổ. Khi đó hãy cho phép pop-up với trang này, hoặc dùng nút Mở lời mời ở từng dòng.",
          opened: function (n) { return "Đang mở " + n + " lời mời. Nhớ bấm Authorize ở từng tab."; },
          bm: "Đã chép link đánh dấu.", bmFail: "Không chép được, hãy chép thanh địa chỉ bằng tay.", cleared: "Đã xóa hết.",
          empty: "Chưa có bot nào. Dán Application ID ở trên."
        }
      : {
          bot: "Bot ", pers: "personality: ", open: "Open invite", copy: "Copy link", copied: "Copied",
          count: function (n) { return n + (n === 1 ? " bot" : " bots"); },
          token: "That looks like a bot token, not an Application ID. It was dropped, never stored and never shown. Paste Application IDs only (the long numbers). If you pasted a real token anywhere, open the Developer Portal and reset it (Reset Token).",
          invalid: function (n) { return n + (n === 1 ? " entry is" : " entries are") + " not a valid ID (15 to 22 digits) and " + (n === 1 ? "was" : "were") + " skipped."; },
          extra: function (n) { return "Only the first " + MAX + " bots are used; " + n + " extra ID" + (n === 1 ? "" : "s") + " ignored."; },
          blocked: "Your browser may block some windows. If so, allow pop-ups for this site, or use the Open invite button on each row.",
          opened: function (n) { return "Opening " + n + " invite" + (n === 1 ? "" : "s") + ". Press Authorize in each tab."; },
          bm: "Bookmark link copied.", bmFail: "Could not copy, please copy the address bar by hand.", cleared: "Cleared.",
          empty: "No bots yet. Paste Application IDs above."
        };

    var list = doc.getElementById("list");
    var counter = doc.getElementById("count");
    var errBox = doc.getElementById("err");
    var info = doc.getElementById("info");
    var openAll = doc.getElementById("open-all");
    var bmBtn = doc.getElementById("bookmark");
    var clearBtn = doc.getElementById("clear");
    var current = [];
    var timers = [];

    function store(ids) {
      try {
        if (ids.length) win.localStorage.setItem(KEY, ids.join(","));
        else win.localStorage.removeItem(KEY);
      } catch (e) {}
    }
    function setHash(ids) {
      try {
        var url = win.location.pathname + win.location.search + (ids.length ? "#ids=" + ids.join(",") : "");
        win.history.replaceState(null, "", url);
      } catch (e) {}
    }
    function say(el, msgs) {
      el.textContent = "";
      msgs.forEach(function (m) {
        var p = doc.createElement("p");
        p.textContent = m;
        el.appendChild(p);
      });
      el.hidden = msgs.length === 0;
    }
    function copyText(text) {
      return new Promise(function (resolve, reject) {
        if (win.navigator.clipboard && win.navigator.clipboard.writeText) {
          win.navigator.clipboard.writeText(text).then(resolve, reject);
          return;
        }
        var t = doc.createElement("textarea");
        t.value = text;
        t.setAttribute("readonly", "");
        t.style.position = "fixed";
        t.style.opacity = "0";
        doc.body.appendChild(t);
        t.select();
        try {
          if (doc.execCommand("copy")) resolve();
          else reject();
        } catch (e) {
          reject(e);
        }
        doc.body.removeChild(t);
      });
    }
    function flash(btn, label, back) {
      btn.textContent = label;
      win.setTimeout(function () { btn.textContent = back; }, 1600);
    }

    function render(res, persist) {
      current = res.ids;
      var msgs = [];
      if (res.tokens) msgs.push(T.token);
      if (res.invalid) msgs.push(T.invalid(res.invalid));
      if (res.extra) msgs.push(T.extra(res.extra));
      say(errBox, msgs);
      counter.textContent = T.count(current.length);
      list.textContent = "";
      if (!current.length) {
        var li0 = doc.createElement("li");
        li0.className = "bots__empty";
        li0.textContent = T.empty;
        list.appendChild(li0);
      }
      current.forEach(function (id, i) {
        var n = i + 1;
        var label = T.bot + n + " (" + personality(n) + ")";
        var li = doc.createElement("li");
        li.className = "bots__row";
        var who = doc.createElement("div");
        who.className = "bots__who";
        var b = doc.createElement("strong");
        b.textContent = T.bot + n;
        var p = doc.createElement("span");
        p.textContent = T.pers + personality(n);
        var code = doc.createElement("code");
        code.textContent = id;
        who.appendChild(b);
        who.appendChild(p);
        who.appendChild(code);
        var a = doc.createElement("a");
        a.className = "btn btn--solid btn--sm";
        a.href = inviteLink(id);
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = T.open;
        a.setAttribute("aria-label", T.open + ", " + label);
        var c = doc.createElement("button");
        c.type = "button";
        c.className = "btn btn--sm";
        c.textContent = T.copy;
        c.setAttribute("aria-label", T.copy + ", " + label);
        c.addEventListener("click", function () {
          copyText(inviteLink(id)).then(function () { flash(c, T.copied, T.copy); }, function () {});
        });
        var act = doc.createElement("div");
        act.className = "bots__act";
        act.appendChild(a);
        act.appendChild(c);
        li.appendChild(who);
        li.appendChild(act);
        list.appendChild(li);
      });
      openAll.disabled = !current.length;
      bmBtn.disabled = !current.length;
      clearBtn.disabled = !current.length && !ta.value;
      if (persist) {
        store(current);
        setHash(current);
      }
    }

    function handle() {
      var res = parseIds(ta.value);
      // a token never stays in the box: put back only the safe entries
      if (res.tokens) ta.value = res.kept.join("\n");
      render(res, true);
    }

    ta.addEventListener("input", handle);

    openAll.addEventListener("click", function () {
      timers.forEach(win.clearTimeout);
      timers = [];
      current.forEach(function (id, i) {
        function go() {
          win.open(inviteLink(id), "_blank", "noopener,noreferrer");
        }
        if (i === 0) go(); // inside the click, so it is allowed
        else timers.push(win.setTimeout(go, 700 * i));
      });
      say(info, current.length ? [T.opened(current.length), T.blocked] : []);
    });

    bmBtn.addEventListener("click", function () {
      var url = win.location.href.split("#")[0] + "#ids=" + current.join(",");
      copyText(url).then(function () { say(info, [T.bm]); }, function () { say(info, [T.bmFail]); });
    });

    clearBtn.addEventListener("click", function () {
      timers.forEach(win.clearTimeout);
      ta.value = "";
      store([]);
      setHash([]);
      render(parseIds(""), false);
      say(info, [T.cleared]);
      ta.focus();
    });

    // start: the hash wins, then localStorage
    var start = "";
    var m = /[#&]ids=([^&]*)/.exec(win.location.hash || "");
    if (m) {
      try { start = decodeURIComponent(m[1]); } catch (e) { start = m[1]; }
    } else {
      try { start = win.localStorage.getItem(KEY) || ""; } catch (e) {}
    }
    var first = parseIds(start);
    ta.value = first.ids.join("\n");
    render(first, first.ids.length > 0 || first.tokens > 0);
  }

  return { parseIds: parseIds, personality: personality, inviteLink: inviteLink, looksLikeToken: looksLikeToken, MAX: MAX, init: init };
});
