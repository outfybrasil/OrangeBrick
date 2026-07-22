self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: data.icon || "/logos/Logo Tijolo Quebrado.PNG",
      badge: data.badge || "/logos/Logo Tijolo Quebrado.PNG",
      data: { url: data.url || "/" },
    };

    event.waitUntil(self.registration.showNotification(data.title || "Orange Brick", options));
  } catch {
    // ignore malformed payloads
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", function (event) {});

