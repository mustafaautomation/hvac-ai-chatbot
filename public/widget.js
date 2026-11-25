(function () {
  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  if (!script) return;
  var origin = new URL(script.src, window.location.href).origin;
  var title = script.getAttribute("data-title") || "Chat with Northwind Comfort";
  var root = document.createElement("div");
  root.setAttribute("data-northwind-widget", "true");
  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Open Northwind chat");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "northwind-chat-frame");
  button.textContent = "Chat";
  button.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483000;border:0;border-radius:999px;padding:12px 16px;background:#9a4a2a;color:#fffaf3;font:600 14px/1 system-ui,sans-serif;box-shadow:0 10px 30px rgba(60,30,10,.25);cursor:pointer";
  var panel = document.createElement("div");
  panel.id = "northwind-chat-frame";
  panel.hidden = true;
  panel.style.cssText = "position:fixed;right:16px;bottom:72px;z-index:2147483000;width:min(400px,calc(100vw - 24px));height:min(640px,calc(100dvh - 96px));border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(40,20,10,.28);background:#fffdf8";
  var frame = document.createElement("iframe");
  frame.src = origin + "/widget";
  frame.title = title;
  frame.style.cssText = "width:100%;height:100%;border:0;background:#fffdf8";
  panel.appendChild(frame);
  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-label", open ? "Close Northwind chat" : "Open Northwind chat");
    button.textContent = open ? "Close" : "Chat";
    if (open) frame.focus();
    else button.focus();
  }
  button.addEventListener("click", function () {
    setOpen(panel.hidden);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });
  root.appendChild(panel);
  root.appendChild(button);
  document.body.appendChild(root);
})();
