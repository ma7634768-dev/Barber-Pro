// Service worker mínimo: permite mostrar avisos de novo agendamento no celular
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.includes("/painel"));
      if (open) return open.focus();
      return self.clients.openWindow("/painel/agenda");
    }),
  );
});
