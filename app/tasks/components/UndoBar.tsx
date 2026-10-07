"use client";

import { Undo2 } from "lucide-react";
import { useI18n } from "../../context/LanguageContext";
import type { UndoableAction } from "../routines/useRoutines";

// "Erledigt · Rückgängig": sits above the bottom tab bar on phones, in the corner on a desktop.
export default function UndoBar({ undoable }: { undoable: UndoableAction | null }) {
  const { t } = useI18n();
  if (!undoable) return null;
  return (
    <div
      role="status"
      className="material-sheet fixed z-40 left-4 right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:left-auto md:right-6 md:bottom-6 md:w-96 flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-sm animate-rise"
      style={{ boxShadow: "var(--shadow-lg)", borderLeft: "3px solid var(--accent)" }}
    >
      <span className="truncate">{undoable.label}</span>
      <button type="button" onClick={() => undoable.undo()} className="press btn btn-ghost btn-sm shrink-0">
        <Undo2 className="w-4 h-4" /> {t("Undo", "Rückgängig")}
      </button>
    </div>
  );
}
