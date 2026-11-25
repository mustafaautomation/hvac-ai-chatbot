(function () {
  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  if (!script || document.querySelector("[data-northwind-widget]")) return;
  var origin = new URL(script.src, window.location.href).origin;
  var title = script.getAttribute("data-title") || "Chat with Northwind Comfort";
  var position = script.getAttribute("data-position") === "left" ? "left" : "right";
  var theme = script.getAttribute("data-theme") || "system";
  var root = document.createElement("div");
  root.setAttribute("data-northwind-widget", "true");
  var side = position === "left" ? "left" : "right";
  var nudgeKey = "northwind-nudges-dismissed";
  var teaserKey = "northwind-teaser-dismissed";

  var style = document.createElement("style");
  style.textContent = ""
    + ".nw-fab{position:fixed;bottom:16px;" + side + ":16px;z-index:2147483000;width:56px;height:56px;border:0;border-radius:999px;background:#C57A4A;color:#1A140F;box-shadow:0 8px 24px rgba(197,122,74,.35), inset 0 1px 0 rgba(255,255,255,.25);cursor:pointer;display:grid;place-items:center}"
    + "@media(min-width:640px){.nw-fab{width:60px;height:60px;bottom:24px;" + side + ":24px}}"
    + ".nw-fab:focus-visible{outline:3px solid #C57A4A;outline-offset:3px}"
    + ".nw-panel{position:fixed;z-index:2147483000;background:rgba(255,252,248,.92);border:1px solid rgba(228,221,212,.9);box-shadow:0 18px 50px rgba(15,18,22,.2);overflow:hidden}"
    + "@media(min-width:640px){.nw-panel{width:400px;height:min(680px,calc(100dvh - 124px));bottom:100px;" + side + ":24px;border-radius:24px}}"
    + "@media(max-width:639px){.nw-panel{inset:0;width:100dvw;height:100dvh;border-radius:0;box-shadow:none}.nw-fab.nw-open{display:none}}"
    + ".nw-pills{position:fixed;z-index:2147483000;display:flex;flex-direction:column;align-items:" + (position === "left" ? "flex-start" : "flex-end") + ";gap:12px;bottom:88px;" + side + ":16px}"
    + "@media(min-width:640px){.nw-pills{bottom:100px;" + side + ":24px}}"
    + ".nw-pill{height:36px;padding:0 14px;border-radius:999px;border:1px solid rgba(228,221,212,.9);background:rgba(255,252,248,.92);font:500 13px/36px system-ui,sans-serif;cursor:pointer}"
    + ".nw-teaser{position:fixed;z-index:2147483000;bottom:28px;max-width:240px;" + (position === "left" ? "left:92px" : "right:92px") + ";display:flex;gap:8px;align-items:flex-start;padding:8px 12px;border-radius:16px;border:1px solid rgba(228,221,212,.9);background:#FFFCF8;box-shadow:0 8px 24px rgba(15,18,22,.08);font:500 13px/1.4 system-ui,sans-serif}"
    + ".nw-x{border:0;background:transparent;cursor:pointer;font:600 14px/1 system-ui}";
  document.head.appendChild(style);

  var button = document.createElement("button");
  button.type = "button";
  button.className = "nw-fab";
  button.setAttribute("data-testid", "chat-launcher");
  button.setAttribute("aria-label", "Open chat with Ava");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "northwind-chat-frame");
  button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M3.5 8.25c2.6 0 3.5 2.35 8.5 2.35s5.9-2.35 8.5-2.35M5.25 12.75c2.2 0 3 2.1 6.75 2.1s4.55-2.1 6.75-2.1M8 17.25h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  var panel = document.createElement("div");
  panel.id = "northwind-chat-frame";
  panel.className = "nw-panel";
  panel.hidden = true;
  var frame = document.createElement("iframe");
  frame.src = origin + "/widget";
  frame.title = title;
  frame.style.cssText = "width:100%;height:100%;border:0;background:transparent";
  panel.appendChild(frame);

  var pills = document.createElement("div");
  pills.className = "nw-pills";
  var dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "nw-x";
  dismiss.setAttribute("aria-label", "Dismiss suggestions");
  dismiss.textContent = "×";
  pills.appendChild(dismiss);
  ["Get a visit quote", "Book a tech"].forEach(function (label) {
    var pill = document.createElement("button");
    pill.type = "button";
    pill.className = "nw-pill";
    pill.setAttribute("data-testid", "launcher-nudge");
    pill.textContent = label;
    pill.addEventListener("click", function () {
      setOpen(true);
      var text = label === "Book a tech"
        ? "The AC is not cooling. About 2,200 sq ft, the system is 12 years old, and the house is in 78704."
        : "What does a heat-pump install run for an 1,800 sq ft home in 78703? The old system is 16 years old. No rush.";
      window.setTimeout(function () {
        frame.contentWindow.postMessage({ type: "northwind-ask", text: text, target: "embed" }, origin);
      }, 400);
    });
    pills.appendChild(pill);
  });
  if (sessionStorage.getItem(nudgeKey) === "1") pills.hidden = true;
  dismiss.addEventListener("click", function () {
    sessionStorage.setItem(nudgeKey, "1");
    pills.hidden = true;
  });

  var teaser = document.createElement("div");
  teaser.className = "nw-teaser";
  teaser.setAttribute("data-testid", "launcher-teaser");
  teaser.hidden = true;
  var teaserText = document.createElement("button");
  teaserText.type = "button";
  teaserText.className = "nw-x";
  teaserText.style.textAlign = "left";
  teaserText.textContent = "Furnace acting up? I can book a tech today.";
  var teaserClose = document.createElement("button");
  teaserClose.type = "button";
  teaserClose.className = "nw-x";
  teaserClose.setAttribute("aria-label", "Dismiss teaser");
  teaserClose.textContent = "×";
  teaser.appendChild(teaserText);
  teaser.appendChild(teaserClose);
  teaserText.addEventListener("click", function () {
    setOpen(true);
    window.setTimeout(function () {
      frame.contentWindow.postMessage({ type: "northwind-ask", text: "The furnace is not heating. The house is 1,800 sq ft in 78704 and the system is 14 years old.", target: "embed" }, origin);
    }, 400);
  });
  teaserClose.addEventListener("click", function () {
    localStorage.setItem(teaserKey, "1");
    teaser.hidden = true;
  });

  function postTheme() {
    var resolved = theme;
    if (resolved === "system") resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    if (frame.contentWindow) frame.contentWindow.postMessage({ type: "northwind-theme", theme: resolved }, origin);
  }

  function setOpen(open) {
    panel.hidden = !open;
    button.classList.toggle("nw-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-label", open ? "Close chat" : "Open chat with Ava");
    button.innerHTML = open
      ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M3.5 8.25c2.6 0 3.5 2.35 8.5 2.35s5.9-2.35 8.5-2.35M5.25 12.75c2.2 0 3 2.1 6.75 2.1s4.55-2.1 6.75-2.1M8 17.25h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    pills.hidden = open || sessionStorage.getItem(nudgeKey) === "1";
    teaser.hidden = open || localStorage.getItem(teaserKey) === "1" || teaser.hidden;
    if (open) {
      postTheme();
      frame.focus();
    } else button.focus();
  }

  button.addEventListener("click", function () { setOpen(panel.hidden); });
  window.addEventListener("message", function (event) {
    if (!event.data) return;
    if (event.data.type === "northwind-close") setOpen(false);
    if (event.data.type === "northwind-theme" && event.source !== frame.contentWindow && frame.contentWindow) {
      frame.contentWindow.postMessage(event.data, origin);
    }
    if (event.data.type === "northwind-ask" && event.source !== frame.contentWindow && frame.contentWindow) {
      setOpen(true);
      frame.contentWindow.postMessage(event.data, origin);
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });
  frame.addEventListener("load", postTheme);
  if (localStorage.getItem(teaserKey) !== "1") {
    window.setTimeout(function () { if (panel.hidden) teaser.hidden = false; }, 4000);
  }
  root.appendChild(panel);
  root.appendChild(pills);
  root.appendChild(teaser);
  root.appendChild(button);
  document.body.appendChild(root);
})();
