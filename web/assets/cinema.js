/* companionsDISCORD site: the cinematic layer. Vanilla JS, one scroll listener, one animation loop that only runs
   while the hero is on screen. Nothing here is needed to read the site: with reduced motion most of it is skipped. */
(function () {
  "use strict";

  var root = document.documentElement;
  var vi = (root.lang || "en").slice(0, 2) === "vi";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (sel, ctx) {
    return (ctx || document).querySelector(sel);
  };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  var clamp = function (v, a, b) {
    return Math.min(b, Math.max(a, v));
  };

  var BOTS = [
    { n: "Pip", h: 335 },
    { n: "Grumble", h: 25 },
    { n: "Nova", h: 195 },
    { n: "Sage", h: 150 },
    { n: "Bean", h: 50 },
    { n: "Diva", h: 295 },
    { n: "Dog", h: 35 },
    { n: "Dog 2", h: 85 },
    { n: "Cow", h: 170 },
  ];

  /* ---------- scroll progress bar ---------- */
  var bar = document.createElement("div");
  bar.className = "progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  /* ---------- split text (keeps one accessible name, hides the pieces) ---------- */
  function splitNode(node, counter) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          var word = document.createElement("span");
          word.className = "kw";
          Array.prototype.forEach.call(part, function (ch) {
            var s = document.createElement("span");
            s.className = "kc";
            s.textContent = ch;
            s.style.setProperty("--i", counter.i++);
            s.style.setProperty("--r", (Math.random() * 10 - 5).toFixed(1) + "deg");
            word.appendChild(s);
          });
          frag.appendChild(word);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
        splitNode(child, counter);
      }
    });
  }
  var splits = $$("[data-split]");
  splits.forEach(function (el) {
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    splitNode(el, { i: 0 });
    $$(".kw", el).forEach(function (w) {
      w.setAttribute("aria-hidden", "true");
    });
  });
  if ("IntersectionObserver" in window) {
    var splitIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            splitIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    splits.forEach(function (el) {
      splitIO.observe(el);
    });
  } else {
    splits.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  /* letters lean away from the pointer in the hero headline */
  var heroTitle = $("[data-split='hero']");
  if (heroTitle && finePointer && !reduced) {
    var letters = [];
    var leanQueued = false;
    var px = -999;
    var py = -999;
    heroTitle.addEventListener("pointerenter", function () {
      letters = $$(".kc", heroTitle).map(function (el) {
        var r = el.getBoundingClientRect();
        return { el: el, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    });
    window.addEventListener("pointermove", function (e) {
      px = e.clientX;
      py = e.clientY;
      if (leanQueued || !letters.length) return;
      leanQueued = true;
      requestAnimationFrame(function () {
        leanQueued = false;
        letters.forEach(function (l) {
          var dx = l.x - px;
          var dy = l.y - py;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            var k = (130 - d) / 130;
            l.el.style.transform = "translate(" + ((dx / (d || 1)) * k * 10).toFixed(1) + "px," + ((dy / (d || 1)) * k * 8).toFixed(1) + "px) rotate(" + (dx * 0.04 * k).toFixed(1) + "deg)";
          } else if (l.el.style.transform) {
            l.el.style.transform = "";
          }
        });
      });
    });
    window.addEventListener("resize", function () {
      letters = [];
    });
  }

  /* ---------- hero orbs ---------- */
  var hero = $(".hero");
  var field = null;
  var orbs = [];
  var loopOn = false;
  var heroVisible = true;
  var mouse = { x: null, y: null };
  var t0 = performance.now();

  function buildOrbs() {
    field = document.createElement("div");
    field.className = "orbfield";
    field.setAttribute("aria-hidden", "true");
    BOTS.forEach(function (b, i) {
      var el = document.createElement("div");
      el.className = "orb";
      el.style.setProperty("--bot-hue", b.h);
      field.appendChild(el);
      orbs.push({ el: el, i: i, x: 0, y: 0, vx: 0, vy: 0, ax: 0.15 + (i % 3) * 0.08, ay: 0.12 + (i % 4) * 0.05, ph: i * 1.7 });
    });
    hero.insertBefore(field, hero.firstChild);
  }

  function homeOf(o, w, h, t) {
    // a row along the top and a row along the bottom, so they frame the text instead of sitting on it
    var top = o.i < 5;
    var count = top ? 5 : 4;
    var k = top ? o.i : o.i - 5;
    var bx = w * (top ? 0.06 + (k / (count - 1)) * 0.88 : 0.45 + (k / (count - 1)) * 0.5);
    var by = h * (top ? 0.07 + (k % 2) * 0.05 : 0.93 - (k % 2) * 0.05);
    return { x: bx + Math.cos(t * o.ax + o.ph) * 34, y: by + Math.sin(t * o.ay + o.ph) * 18 };
  }

  function frame(now) {
    if (!loopOn) return;
    var t = (now - t0) / 1000;
    var w = field.clientWidth;
    var h = field.clientHeight;
    orbs.forEach(function (o) {
      var home = homeOf(o, w, h, t);
      var fx = (home.x - o.x) * 0.02;
      var fy = (home.y - o.y) * 0.02;
      if (mouse.x !== null) {
        var dx = mouse.x - o.x;
        var dy = mouse.y - o.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < 260 && d > 90) {
          fx += (dx / d) * 0.35;
          fy += (dy / d) * 0.35;
        } else if (d <= 90) {
          fx -= (dx / d) * 0.9;
          fy -= (dy / d) * 0.9;
        }
      }
      o.vx = (o.vx + fx) * 0.9;
      o.vy = (o.vy + fy) * 0.9;
      o.x += o.vx;
      o.y += o.vy;
      o.el.style.transform = "translate3d(" + o.x.toFixed(1) + "px," + o.y.toFixed(1) + "px,0)";
    });
    requestAnimationFrame(frame);
  }
  function startLoop() {
    if (loopOn || reduced || !heroVisible || document.hidden) return;
    loopOn = true;
    requestAnimationFrame(frame);
  }
  function stopLoop() {
    loopOn = false;
  }

  if (hero && !reduced) {
    buildOrbs();
    var w0 = field.clientWidth;
    var h0 = field.clientHeight;
    orbs.forEach(function (o) {
      var home = homeOf(o, w0, h0, 0);
      o.x = home.x;
      o.y = home.y;
    });
    hero.addEventListener("pointermove", function (e) {
      var r = field.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    hero.addEventListener("pointerleave", function () {
      mouse.x = null;
      mouse.y = null;
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        heroVisible ? startLoop() : stopLoop();
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stopLoop() : startLoop();
    });
    startLoop();
    // someone says something every couple of seconds
    setInterval(function () {
      if (!loopOn) return;
      orbs.forEach(function (o) {
        o.el.classList.remove("is-talking");
      });
      var o = orbs[Math.floor(Math.random() * orbs.length)];
      o.el.classList.add("is-talking");
      setTimeout(function () {
        o.el.classList.remove("is-talking");
      }, 2600);
    }, 3200);
  }

  /* ---------- pinned story ---------- */
  var story = $("[data-story]");
  var steps = $$("[data-step]");
  var scenes = $$("[data-scene]");
  var stage = $(".story__stage");
  var activeScene = -1;
  function paintStory() {
    if (!story || reduced) return;
    var r = story.getBoundingClientRect();
    var span = Math.max(1, r.height - window.innerHeight);
    var p = clamp(-r.top / span, 0, 0.999);
    var idx = Math.min(scenes.length - 1, Math.floor(p * scenes.length));
    if (stage) stage.style.setProperty("--p", p.toFixed(3));
    if (idx !== activeScene) {
      activeScene = idx;
      steps.forEach(function (s, i) {
        s.classList.toggle("is-on", i === idx);
      });
      scenes.forEach(function (s, i) {
        s.classList.toggle("is-on", i === idx);
      });
      if (idx === scenes.length - 1) countUp($(".counter b", story));
    }
  }

  /* ---------- count up numbers when they appear ---------- */
  function countUp(el) {
    if (!el || el.dataset.done) return;
    el.dataset.done = "1";
    var target = Number(el.dataset.count);
    if (!isFinite(target)) return;
    var prefix = el.dataset.prefix || "";
    var format = function (n) {
      return prefix + Math.round(n).toLocaleString(vi ? "vi-VN" : "en-US");
    };
    if (reduced) {
      el.textContent = format(target);
      return;
    }
    var start = performance.now();
    var dur = 1400;
    (function tick(now) {
      var k = clamp((now - start) / dur, 0, 1);
      el.textContent = format(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(start);
  }
  if ("IntersectionObserver" in window) {
    var countIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            countUp(e.target);
            countIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    $$("[data-count]").forEach(function (el) {
      if (!el.closest("[data-story]")) countIO.observe(el);
    });
  } else {
    $$("[data-count]").forEach(countUp);
  }

  /* ---------- section titles fill as they scroll in ---------- */
  var titles = $$(".sheet h2");
  if (!reduced) titles.forEach(function (h) {
    h.classList.add("fill-title");
  });
  function paintTitles() {
    if (reduced) return;
    var vh = window.innerHeight;
    titles.forEach(function (h) {
      var r = h.getBoundingClientRect();
      h.style.setProperty("--fill-p", clamp((vh * 0.92 - r.top) / (vh * 0.4), 0, 1).toFixed(3));
    });
  }

  /* ---------- one scroll handler ---------- */
  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty("--scroll", max > 0 ? (window.scrollY / max).toFixed(4) : 0);
      paintStory();
      paintTitles();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- trivia you can really play ---------- */
  $$("[data-trivia]").forEach(function (box) {
    var src = document.getElementById(box.getAttribute("data-trivia"));
    var items;
    try {
      items = JSON.parse(src.textContent);
    } catch (e) {
      return;
    }
    var T = vi
      ? { right: "Đúng rồi!", wrong: "Chưa đúng. Đáp án:", next: "Câu tiếp", again: "Chơi lại", score: "Điểm", done: "Xong! Điểm của bạn:", q: "Câu" }
      : { right: "Correct!", wrong: "Not quite. The answer:", next: "Next question", again: "Play again", score: "Score", done: "Done! Your score:", q: "Question" };
    var i = 0;
    var score = 0;
    var order = items.slice();
    function render() {
      var it = order[i];
      box.innerHTML = "";
      var head = document.createElement("p");
      head.className = "scene__line";
      head.textContent = T.q + " " + (i + 1) + "/" + order.length + " | " + T.score + ": " + score;
      var q = document.createElement("p");
      q.className = "bubble";
      q.style.opacity = 1;
      q.style.translate = "0 0";
      q.innerHTML = "<b>Pip</b>";
      q.appendChild(document.createTextNode(it.q));
      var opts = document.createElement("div");
      opts.className = "opts";
      var note = document.createElement("p");
      note.className = "trivia-note";
      note.setAttribute("aria-live", "polite");
      var buttons = it.o.map(function (text, k) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "opt";
        b.innerHTML = "<b>" + "ABCD"[k] + "</b>";
        b.appendChild(document.createTextNode(text));
        b.addEventListener("click", function () {
          buttons.forEach(function (x, j) {
            x.disabled = true;
            if (j === it.a) x.classList.add("is-right");
          });
          if (k === it.a) {
            score++;
            note.textContent = T.right + " " + it.why;
          } else {
            b.classList.add("is-wrong");
            note.textContent = T.wrong + " " + it.o[it.a] + ". " + it.why;
          }
          var next = document.createElement("button");
          next.type = "button";
          next.className = "btn btn--sm";
          next.textContent = i + 1 < order.length ? T.next : T.again;
          next.addEventListener("click", function () {
            if (i + 1 < order.length) i++;
            else {
              i = 0;
              score = 0;
            }
            render();
          });
          if (i + 1 === order.length) note.textContent += " " + T.done + " " + score + "/" + order.length;
          box.appendChild(next);
          next.focus();
        });
        opts.appendChild(b);
        return b;
      });
      box.appendChild(head);
      box.appendChild(q);
      box.appendChild(opts);
      box.appendChild(note);
    }
    render();
  });

  /* ---------- cursor ring, tilt and scrambled nav (fine pointers, motion allowed) ---------- */
  if (finePointer && !reduced) {
    var ring = document.createElement("div");
    ring.className = "cursor";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);
    var rx = 0;
    var ry = 0;
    var tx = 0;
    var ty = 0;
    var ringOn = false;
    window.addEventListener("pointermove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!ringOn) {
        ringOn = true;
        rx = tx;
        ry = ty;
        ring.classList.add("is-on");
        requestAnimationFrame(follow);
      }
      ring.classList.toggle("is-link", !!(e.target.closest && e.target.closest("a, button, .opt, [data-tilt]")));
    });
    document.addEventListener("pointerleave", function () {
      ring.classList.remove("is-on");
      ringOn = false;
    });
    function follow() {
      if (!ringOn) return;
      rx += (tx - rx) * 0.2;
      ry += (ty - ry) * 0.2;
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
      requestAnimationFrame(follow);
    }

    $$(".card, .cast li, .stats div").forEach(function (el) {
      el.setAttribute("data-tilt", "");
      el.classList.add("tilt");
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(700px) rotateY(" + (x * 7).toFixed(2) + "deg) rotateX(" + (-y * 7).toFixed(2) + "deg)";
      });
      el.addEventListener("pointerleave", function () {
        el.style.transform = "";
      });
    });

    var GLYPHS = "!<>-_/[]{}=+*^?#";
    $$(".nav a").forEach(function (a) {
      var label = a.textContent;
      var running = 0;
      a.addEventListener("pointerenter", function () {
        var n = ++running;
        var frames = 0;
        (function step() {
          if (n !== running) return;
          frames++;
          var out = "";
          for (var k = 0; k < label.length; k++) out += k < frames / 2 || label[k] === " " ? label[k] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          a.textContent = out;
          if (frames < label.length * 2) setTimeout(step, 24);
          else a.textContent = label;
        })();
      });
      a.addEventListener("pointerleave", function () {
        running++;
        a.textContent = label;
      });
    });
  }

  /* ---------- status page: shows real numbers only when a status address is configured ---------- */
  var live = $("#live");
  if (live) {
    var L = vi
      ? { online: "Bot đang online", servers: "Server", rooms: "Phòng voice có bot ngồi", sitting: "Bot đang ngồi voice", convo: "Cuộc trò chuyện (7 ngày)", people: "Có người nói theo (7 ngày)", trivia: "Lượt trả lời đố vui (7 ngày)", up: "Chạy liên tục", demo: "Dữ liệu minh họa, không phải số thật", liveTag: "Số liệu trực tiếp", fail: "Không kết nối được tới trạng thái bot. Đang hiện dữ liệu minh họa.", h: "giờ", d: "ngày" }
      : { online: "Bots online", servers: "Servers", rooms: "Voice rooms with a bot sitting", sitting: "Bots sitting in voice", convo: "Conversations (7 days)", people: "People joined in (7 days)", trivia: "Trivia answers (7 days)", up: "Uptime", demo: "Sample data, not real numbers", liveTag: "Live numbers", fail: "Could not reach the bot status. Showing sample data.", h: "h", d: "d" };
    var sample = { uptimeSeconds: 3 * 86400 + 5 * 3600, bots: { online: 9, total: 9 }, servers: 3, voice: { rooms: 2, companionsSitting: 3 }, last7Days: { conversations: 47, withPeople: 31, triviaAnswers: 112 } };
    var url = live.getAttribute("data-url") || window.STATUS_URL || "";
    var badge = $("#live-badge");
    var note = $("#live-note");
    var paint = function (d, isLive) {
      var up = d.uptimeSeconds >= 86400 ? Math.floor(d.uptimeSeconds / 86400) + L.d : Math.floor(d.uptimeSeconds / 3600) + L.h;
      var cards = [
        [d.bots.online + "/" + d.bots.total, L.online],
        [d.servers, L.servers],
        [d.voice.rooms, L.rooms],
        [d.voice.companionsSitting, L.sitting],
        [d.last7Days.conversations, L.convo],
        [d.last7Days.withPeople, L.people],
        [d.last7Days.triviaAnswers, L.trivia],
        [up, L.up],
      ];
      live.innerHTML = "";
      cards.forEach(function (c) {
        var card = document.createElement("div");
        card.className = "live-card";
        var b = document.createElement("b");
        b.textContent = c[0];
        var s = document.createElement("span");
        s.textContent = c[1];
        card.appendChild(b);
        card.appendChild(s);
        live.appendChild(card);
      });
      if (badge) {
        badge.textContent = isLive ? L.liveTag : L.demo;
        badge.classList.toggle("is-live", isLive);
      }
    };
    paint(sample, false);
    if (url) {
      fetch(url, { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("bad status");
          return r.json();
        })
        .then(function (d) {
          paint(d, true);
        })
        .catch(function () {
          if (note) note.textContent = L.fail;
        });
    }
  }
})();
