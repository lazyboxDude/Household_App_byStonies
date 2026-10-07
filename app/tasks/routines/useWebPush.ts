"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../../lib/toast";

// unconfigured: no VAPID public key set, so the whole feature stays hidden.
// needs-install: iPhones only allow push for apps added to the Home Screen.
export type PushState = "checking" | "unconfigured" | "unsupported" | "needs-install" | "denied" | "off" | "on" | "busy";

const SW_PATH = "/sw.js";
const ERROR_TEXT = "Das hat gerade nicht geklappt. Magst du es nochmal versuchen?";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

// Reminders on this device: the evening before, "Morgen · Kehricht rausstellen".
export function useWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [state, setState] = useState<PushState>("checking");

  useEffect(() => {
    let cancelled = false;
    const set = (s: PushState) => {
      if (!cancelled) setState(s);
    };
    (async () => {
      if (!publicKey) return set("unconfigured");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return set(isIos() && !isStandalone() ? "needs-install" : "unsupported");
      }
      if (Notification.permission === "denied") return set("denied");
      try {
        const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
        set((await reg?.pushManager.getSubscription()) ? "on" : "off");
      } catch {
        set("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  const enable = useCallback(async () => {
    if (!publicKey) return;
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource });
      const json = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "", user_agent: navigator.userAgent.slice(0, 200) },
        { onConflict: "endpoint" }
      );
      if (error) {
        await sub.unsubscribe();
        showToast(ERROR_TEXT, "error");
        setState("off");
        return;
      }
      setState("on");
      showToast("Erinnerungen sind eingeschaltet", "success");
    } catch {
      showToast(ERROR_TEXT, "error");
      setState("off");
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      showToast(ERROR_TEXT, "error");
      setState("on");
    }
  }, []);

  return { state, enable, disable };
}
