"use client";

import Script from "next/script";
import { forwardRef, useEffect, useImperativeHandle, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export interface TurnstileHandle {
  reset: () => void;
}

const Turnstile = forwardRef<TurnstileHandle, { onVerify: (token: string) => void; onExpire?: () => void }>(
  function Turnstile({ onVerify, onExpire }, ref) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const containerId = useId().replace(/:/g, "");
    const widgetId = useRef<string | null>(null);
    const [isScriptReady, setIsScriptReady] = useState(false);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
      },
    }));

    useEffect(() => {
      if (!isScriptReady || !siteKey || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(`#${containerId}`, {
        sitekey: siteKey,
        callback: onVerify,
        "error-callback": onExpire,
        "expired-callback": onExpire,
        theme: "auto",
      });
      return () => {
        if (widgetId.current) window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScriptReady, siteKey, containerId]);

    if (!siteKey) return null;

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
          onReady={() => setIsScriptReady(true)}
        />
        <div id={containerId} />
      </>
    );
  }
);

export default Turnstile;
