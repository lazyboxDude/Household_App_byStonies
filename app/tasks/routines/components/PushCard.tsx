"use client";

import { Bell, BellOff } from "lucide-react";
import { useWebPush } from "../useWebPush";

// Reminders on this phone. Hidden until push is set up and when the device cannot do it.
export default function PushCard() {
  const { state, enable, disable } = useWebPush();
  if (state === "checking" || state === "unconfigured" || state === "unsupported") return null;

  return (
    <section className="surface p-5">
      <h2 className="text-headline flex items-center gap-2 mb-1">
        {state === "on" ? <Bell className="w-5 h-5" style={{ color: "var(--accent)" }} /> : <BellOff className="w-5 h-5" style={{ color: "var(--accent)" }} />}
        Erinnerungen aufs Handy
      </h2>
      {state === "needs-install" && (
        <p className="text-caption">Auf dem iPhone geht das, sobald du die App zum Home-Bildschirm hinzufügst. Öffne sie danach von dort und schau hier nochmal vorbei.</p>
      )}
      {state === "denied" && (
        <p className="text-caption">Dieses Gerät blockiert Benachrichtigungen für die Seite. Du kannst sie in den Einstellungen deines Browsers wieder erlauben.</p>
      )}
      {(state === "off" || state === "busy") && (
        <>
          <p className="text-caption mb-3">Am Abend vorher: „Morgen · Kehricht rausstellen“. Gilt nur für dieses Gerät, und du bekommst eine Nachricht am Tag, nicht eine pro Routine.</p>
          <button type="button" className="btn btn-secondary btn-sm" disabled={state === "busy"} onClick={enable}>Einschalten</button>
        </>
      )}
      {state === "on" && (
        <>
          <p className="text-caption mb-3">Auf diesem Gerät an. Du bekommst Bescheid, wenn etwas ansteht, das dich betrifft.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={disable}>Ausschalten</button>
        </>
      )}
    </section>
  );
}
