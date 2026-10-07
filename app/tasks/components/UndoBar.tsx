"use client";

import { createPortal } from "react-dom";
import { Undo2 } from "lucide-react";
import { useI18n } from "../../context/LanguageContext";
import type { UndoableAction } from "../routines/useRoutines";
import { useIsClient } from "./useIsClient";

// "Erledigt · Rückgängig": sits above the bottom tab bar on phones, in the corner on a desktop.
export default function UndoBar({ undoable }: { undoable: UndoableAction | null }) {
  const { t } = useI18n();
  const isClient = useIsClient();
  if (!isClient) return null;
  // In the body, like the windows: inside an animated card (the dashboard) `position: fixed`
  // would be relative to that card. The live region is always there, so a screen reader
  // announces the message when it appears.
  return createPortal(
    <div role="status" aria-live="polite">
      {undoable && (
        <div
          className="material-sheet fixed z-[60] left-4 right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:left-auto md:right-6 md:bottom-6 md:w-96 flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-sm animate-rise"
          style={{ boxShadow: "var(--shadow-lg)", borderLeft: "3px solid var(--accent)" }}
        >
          <span className="truncate">{undoable.label}</span>
          <button type="button" onClick={() => undoable.undo()} className="press btn btn-ghost btn-sm shrink-0">
            <Undo2 className="w-4 h-4" /> {t("Undo", "Rückgängig")}
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
