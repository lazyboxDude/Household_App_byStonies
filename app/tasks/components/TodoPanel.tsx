"use client";

import { Lock } from "lucide-react";
import { useI18n } from "../../context/LanguageContext";
import type { QuickWhen } from "../routines/quickAdd";
import type { Task } from "../types";

type When = Exclude<QuickWhen, "none">;

// What a to-do without a date can turn into: one tap puts a day or a rhythm on it, and it moves
// over to the tasks. Nobody but its owner sees a private to-do, so that has to be shared first.
export default function TodoPanel({
  task,
  onConvert,
  onMore,
  onShare,
}: {
  task: Task;
  onConvert: (when: When) => void;
  onMore: () => void;
  onShare: () => void;
}) {
  const { t } = useI18n();
  const options: { value: When; label: string }[] = [
    { value: "today", label: t("Today", "Heute") },
    { value: "tomorrow", label: t("Tomorrow", "Morgen") },
    { value: "daily", label: t("Daily", "Täglich") },
    { value: "weekly", label: t("Weekly", "Wöchentlich") },
    { value: "biweekly", label: t("Every 2 weeks", "Alle 2 Wochen") },
    { value: "monthly", label: t("Monthly", "Monatlich") },
  ];

  return (
    <div className="mt-1 mb-2 ml-10 rounded-[var(--radius-md)] p-3 space-y-2" style={{ background: "var(--surface-2)" }}>
      {task.is_shared ? (
        <>
          <div className="text-caption">{t("Give it a day or a rhythm", "Gib ihr einen Tag oder eine Wiederkehr")}</div>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <button key={o.value} type="button" className="chip" onClick={() => onConvert(o.value)}>
                {o.label}
              </button>
            ))}
            <button type="button" className="chip" onClick={onMore}>{t("More precisely …", "Genauer …")}</button>
          </div>
          <p className="text-caption">{t("It moves over to the tasks with a date.", "Sie wandert dann mit Termin zu den Aufgaben.")}</p>
        </>
      ) : (
        <>
          <p className="text-caption flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {t(
              "Only you see this one. A task with a date is visible to the whole household.",
              "Nur du siehst diese Aufgabe. Eine Aufgabe mit Termin sehen alle im Haushalt."
            )}
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onShare}>
            {t("Share with household", "Mit dem Haushalt teilen")}
          </button>
        </>
      )}
    </div>
  );
}
