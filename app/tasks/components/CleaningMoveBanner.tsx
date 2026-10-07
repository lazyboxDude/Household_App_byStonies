"use client";

import { useState } from "react";
import { useI18n } from "../../context/LanguageContext";

// Tasks from the old cleaning plan that have not moved over yet. They only move when somebody
// says so, so that two people opening the page at once cannot copy them twice.
export default function CleaningMoveBanner({
  count,
  onMove,
  className = "",
}: {
  count: number;
  onMove: () => Promise<void>;
  className?: string;
}) {
  const { t } = useI18n();
  const [moving, setMoving] = useState(false);
  if (count <= 0) return null;

  const one = count === 1;
  return (
    <div className={`surface p-4 flex-wrap items-center justify-between gap-3 ${className || "flex"}`}>
      <p className="text-sm">
        {one
          ? t("Your old cleaning plan still has 1 task. It can move into the rooms here.", "In deinem alten Putzplan liegt noch 1 Aufgabe. Sie kann in die Räume hier umziehen.")
          : t(
              `Your old cleaning plan still has ${count} tasks. They can move into the rooms here.`,
              `In deinem alten Putzplan liegen noch ${count} Aufgaben. Sie können in die Räume hier umziehen.`
            )}
      </p>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={moving}
        onClick={async () => {
          setMoving(true);
          await onMove();
          setMoving(false);
        }}
      >
        {t("Move them over", "Jetzt umziehen")}
      </button>
    </div>
  );
}
