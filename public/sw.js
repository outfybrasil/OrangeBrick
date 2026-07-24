self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  event.waitUntil((async () => {
    let data = {};

    if (event.data) {
      try {
        data = event.data.json();
      } catch {
        data = { body: event.data.text() };
      }
    }

    const requestedUrl = typeof data.url === "string" ? data.url : "/";
    let targetUrl = self.location.origin;
    try {
      const parsedUrl = new URL(requestedUrl, self.location.origin);
      if (parsedUrl.origin === self.location.origin) targetUrl = parsedUrl.toString();
    } catch {
      targetUrl = self.location.origin;
    }

    const title = typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : "Orange Brick";
    const body = typeof data.body === "string" ? data.body.trim() : "";
    const tag = typeof data.tag === "string" && data.tag.trim()
      ? data.tag.trim()
      : undefined;

    await self.registration.showNotification(title, {
      body,
      icon: typeof data.icon === "string" ? data.icon : "/icons/icon-192.png",
      badge: typeof data.badge === "string" ? data.badge : "/icons/icon-192.png",
      tag,
      renotify: Boolean(tag),
      timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now(),
      lang: "pt-BR",
      dir: "auto",
      vibrate: [140, 70, 140],
      actions: [{ action: "open", title: data.kind === "community" ? "Ver conversa" : "Ler agora" }],
      data: { url: targetUrl },
    });
  })());
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const requestedUrl = event.notification.data?.url || "/";
  let url = self.location.origin;
  try {
    const parsedUrl = new URL(requestedUrl, self.location.origin);
    if (parsedUrl.origin === self.location.origin) url = parsedUrl.toString();
  } catch {
    url = self.location.origin;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          if ("navigate" in client && client.url !== url) await client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
