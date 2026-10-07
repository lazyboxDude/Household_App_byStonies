"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "../../context/LanguageContext";
import { useIsClient } from "./useIsClient";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  // Shown in the header, next to the close button.
  title: React.ReactNode;
  // Extra controls in the header, left of the close button.
  actions?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

// A window over the page: slides up from the bottom on a phone, sits in the middle on a bigger
// screen. Escape and a tap on the dim background close it, the page behind does not scroll, and
// focus stays inside until it closes and then goes back to where it came from.
export default function Sheet({ title, actions, onClose, children }: Props) {
  const { t } = useI18n();
  const isClient = useIsClient();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isClient) return null;

  // Rendered straight into the body: a page section that is animated (`animate-rise` keeps a
  // transform) would otherwise become the container of `position: fixed` and cut the window short.
  return createPortal(
    <div
      className="fixed inset-0 z-[55] flex items-end md:items-center justify-center p-0 md:p-4 scrim animate-fade"
      // mousedown, not click: selecting text inside and letting go outside must not close it.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        // Opaque, not the see-through material: there is text and there are inputs in here, and the
        // page behind it should not shine through them.
        className="animate-sheet w-full md:max-w-xl max-h-[92vh] md:max-h-[85vh] flex flex-col rounded-t-[var(--radius-lg)] md:rounded-[var(--radius-lg)] shadow-xl outline-none"
        style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border-strong)" }}
      >
        <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b divider shrink-0">
          <h2 id={titleId} className="text-headline flex items-center gap-2 min-w-0 flex-1">
            {title}
          </h2>
          {actions}
          <button type="button" onClick={onClose} aria-label={t("Close", "Schliessen")} className="press btn btn-ghost btn-icon shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
