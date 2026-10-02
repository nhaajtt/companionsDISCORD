/* companionsDISCORD site: theme, copy buttons, reveal on scroll, chat demo */
(function () {
  "use strict";

  var root = document.documentElement;
  var vi = (root.lang || "en").slice(0, 2) === "vi";
  var T = vi
    ? { copy: "Sao chép", copied: "Đã chép", typing: "đang gõ", toLight: "Chuyển sang giao diện sáng", toDark: "Chuyển sang giao diện tối" }
    : { copy: "Copy", copied: "Copied", typing: "is typing", toLight: "Switch to light theme", toDark: "Switch to dark theme" };
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* theme toggle */
  var themeBtn = document.getElementById("theme");
  function paintTheme() {
    if (!themeBtn) return;
    var light = root.dataset.theme === "light";
    themeBtn.setAttribute("aria-pressed", light ? "true" : "false");
    themeBtn.setAttribute("aria-label", light ? T.toDark : T.toLight);
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.dataset.theme === "light" ? "dark" : "light";
      root.dataset.theme = next;
      try {
        localStorage.setItem("companions-theme", next);
      } catch (e) {}
      paintTheme();
    });
    paintTheme();
  }

  /* copy buttons */
  Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (btn) {
    btn.textContent = T.copy;
    btn.addEventListener("click", function () {
      var code = btn.parentNode.querySelector("code");
      var text = code ? code.textContent : "";
      function done() {
        btn.textContent = T.copied;
        setTimeout(function () {
          btn.textContent = T.copy;
        }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          done();
        } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  });

  /* reveal on scroll */
  var reveals = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(reveals, function (el) {
      el.classList.add("in");
    });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    Array.prototype.forEach.call(reveals, function (el) {
      io.observe(el);
    });
  }

  /* scroll progress in the title strip */
  function progress() {
    var h = root.scrollHeight - window.innerHeight;
    root.style.setProperty("--scroll", h > 0 ? Math.min(1, window.scrollY / h).toFixed(3) : "0");
  }
  window.addEventListener("scroll", progress, { passive: true });
  progress();

  /* chat demo: the finished conversation is already in the HTML; with motion
     allowed we hide it and play it back, bot by bot, then start over. */
  var chat = document.getElementById("chat");
  var log = chat && chat.querySelector(".chat__log");
  if (!log) return;
  var steps = Array.prototype.slice.call(log.children);
  if (!steps.length) return;

  if (reduced) {
    chat.classList.add("chat--static");
    return;
  }

  var token = 0;
  var visible = true;
  var timer = null;

  function wait(ms) {
    return new Promise(function (resolve) {
      timer = setTimeout(resolve, ms);
    });
  }
  function until(run) {
    // resolves once the demo is on screen; rejects when this run was replaced
    return new Promise(function (resolve, reject) {
      (function check() {
        if (run !== token) return reject();
        if (visible && !document.hidden) return resolve();
        timer = setTimeout(check, 400);
      })();
    });
  }
  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }
  function typingRow(step) {
    var who = step.getAttribute("data-who");
    var name = step.querySelector(".msg__head b");
    var av = step.querySelector(".av");
    var row = document.createElement("div");
    row.className = "typing is-new";
    row.setAttribute("data-who", who);
    var a = document.createElement("span");
    a.className = "av";
    a.setAttribute("aria-hidden", "true");
    a.textContent = av ? av.textContent : "?";
    var t = document.createElement("span");
    t.textContent = (name ? name.textContent : "") + " " + T.typing;
    for (var i = 0; i < 3; i++) t.appendChild(document.createElement("i"));
    row.appendChild(a);
    row.appendChild(t);
    return row;
  }

  function play() {
    var run = ++token;
    steps.forEach(function (s) {
      s.hidden = true;
      s.classList.remove("is-new");
    });
    log.setAttribute("aria-live", "off");
    var chain = Promise.resolve();
    steps.forEach(function (step) {
      chain = chain.then(function () {
        return until(run);
      }).then(function () {
        var isMsg = step.classList.contains("msg");
        var typing = null;
        var pause = Number(step.getAttribute("data-pause")) || (isMsg ? 1500 : 1200);
        var p = wait(pause);
        if (isMsg) {
          typing = typingRow(step);
          p = p.then(function () {
            if (run !== token) return;
            log.appendChild(typing);
            scrollDown();
            return wait(Number(step.getAttribute("data-type")) || 1300);
          });
        }
        return p.then(function () {
          if (run !== token) return;
          if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
          step.hidden = false;
          step.classList.add("is-new");
          scrollDown();
        });
      });
    });
    chain
      .then(function () {
        return wait(7000);
      })
      .then(function () {
        if (run === token) play();
      })
      .catch(function () {});
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
      },
      { threshold: 0.2 }
    ).observe(chat);
  }
  play();
})();
