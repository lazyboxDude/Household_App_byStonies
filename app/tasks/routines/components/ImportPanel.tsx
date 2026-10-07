// PARKED: not mounted anywhere right now (see docs/tasks-rethink.html). The text is German only;
// translate it with t("English", "Deutsch") before it goes back on a page.
"use client";

import { useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import { groupEvents, parseCalendarFile, planCalendarImport, type ImportItem } from "../calendarImport";
import type { Routine } from "../types";

function fmt(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-CH", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });
}

interface Props {
  routines: Routine[];
  today: string;
  onImport: (items: ImportItem[]) => Promise<{ created: number; updated: number } | null>;
  onCancel: () => void;
}

// Entsorgungskalender importieren: .ics from the Gemeinde, or a simple list. Once a year is enough:
// importing again adds the new dates to the reminders that already exist.
export default function ImportPanel({ routines, today, onImport, onCancel }: Props) {
  const [text, setText] = useState("");
  const [defaultTitle, setDefaultTitle] = useState("");
  const [step, setStep] = useState<"input" | "preview">("input");
  const [items, setItems] = useState<ImportItem[]>([]);
  const [unsupported, setUnsupported] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const todo = useMemo(() => items.filter((i) => picked.has(i.title) && i.action !== "nothing"), [items, picked]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
    setMessage(null);
  };

  const next = () => {
    const parsed = parseCalendarFile(text, defaultTitle.trim() || "Entsorgung");
    const plan = planCalendarImport(groupEvents(parsed.events), routines, today);
    if (plan.length === 0) {
      setMessage("Ich habe keine Termine gefunden. Probier eine .ics-Datei oder eine Liste wie „12.11.2026;Kehricht“.");
      return;
    }
    setItems(plan);
    setUnsupported([...new Set(parsed.unsupported)]);
    setPicked(new Set(plan.filter((p) => p.action !== "nothing").map((p) => p.title)));
    setMessage(null);
    setStep("preview");
  };

  const submit = async () => {
    setSaving(true);
    const result = await onImport(todo);
    setSaving(false);
    if (result) onCancel();
  };

  return (
    <section className="surface p-5 space-y-4 animate-rise">
      <div>
        <h2 className="text-headline flex items-center gap-2"><FileUp className="w-5 h-5" style={{ color: "var(--accent)" }} /> Entsorgungskalender importieren</h2>
        <p className="text-caption mt-1">
          Lad die Datei deiner Gemeinde hoch (.ics) oder füg eine Liste ein. Einmal im Jahr genügt: Beim nächsten Import ergänzen wir nur die neuen Termine.
        </p>
      </div>

      {step === "input" ? (
        <>
          <input type="file" accept=".ics,.csv,.txt,text/calendar,text/csv,text/plain" aria-label="Datei auswählen" className="text-sm" onChange={(e) => readFile(e.target.files?.[0])} />
          <textarea
            className="field min-h-32 font-mono text-xs"
            aria-label="Termine"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"BEGIN:VCALENDAR … oder:\n12.11.2026;Kehricht\n10.12.2026;Papier"}
          />
          <div>
            <label className="text-caption mb-1 block" htmlFor="import-title">Wie heisst es, falls in der Liste kein Name steht?</label>
            <input id="import-title" className="field" value={defaultTitle} onChange={(e) => setDefaultTitle(e.target.value)} placeholder="Kehricht" />
          </div>
          {message && <p className="text-sm text-[var(--text-secondary)]">{message}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Abbrechen</button>
            <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={next}>Weiter</button>
          </div>
        </>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((i) => {
              const label =
                i.action === "create" ? `${i.dates.length} ${i.dates.length === 1 ? "Termin" : "Termine"}, neu`
                : i.action === "update" ? (i.added === 1 ? "1 neuer Termin, wird ergänzt" : `${i.added} neue Termine, werden ergänzt`)
                : i.dates.length === 0 ? "keine Termine ab heute" : "nichts Neues";
              return (
                <li key={i.title}>
                  <label className={`flex items-center gap-3 text-sm ${i.action === "nothing" ? "opacity-60" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      disabled={i.action === "nothing"}
                      checked={picked.has(i.title) && i.action !== "nothing"}
                      onChange={(e) => setPicked((prev) => { const n = new Set(prev); if (e.target.checked) n.add(i.title); else n.delete(i.title); return n; })}
                    />
                    <span className="text-xl" aria-hidden>{i.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium block truncate">{i.title}</span>
                      <span className="text-caption">{label}{i.dates.length > 0 ? ` · ab ${fmt(i.dates[0])}` : ""}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {unsupported.length > 0 && (
            <p className="text-caption">
              Bei {unsupported.map((t) => `„${t}“`).join(", ")} kann ich die Wiederholung nicht lesen. Magst du sie als Liste mit einzelnen Daten einfügen?
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setStep("input")}>Zurück</button>
            <button type="button" className="btn btn-primary" disabled={todo.length === 0 || saving} onClick={submit}>
              {todo.length === 0 ? "Übernehmen" : `${todo.length} übernehmen`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
