"use client";

import React from "react";
import { Wallet, ArrowRight } from "lucide-react";
import { ACC, ACCOUNTS, monthNames, monthShort } from "../constants";
import { useI18n } from "../../context/LanguageContext";
import { chf, fdate, fmt, curYM } from "../format";
import { Budget, Debt, FinanceTab, Pot } from "../types";
import { useVerteilertopf } from "../hooks/useVerteilertopf";

export default function FinanceOverview({
  vt,
  budgets,
  spentByCategory,
  pots,
  debts,
  onNavigate,
}: {
  vt: ReturnType<typeof useVerteilertopf>;
  budgets: Budget[];
  spentByCategory: Record<string, number>;
  pots: Pot[];
  debts: Debt[];
  onNavigate: (tab: FinanceTab) => void;
}) {
  const { bal, ft, status, settings, soll, dists, alreadyDistributedThisMonth, upcoming, minP } = vt;
  const { t: tr, lang } = useI18n();
  const MON = monthNames(lang);
  const MS = monthShort(lang);

  return (
    <div className="space-y-6 animate-rise">
      {status === "bad" && (
        <div className="p-3 rounded-[var(--radius-md)] text-sm" style={{ background: "var(--danger-soft)" }}>
          <b className="block" style={{ color: "var(--danger)" }}>{tr("Main account in the red", "Hauptkonto im Minus")}: {chf(bal.main)}</b>
          <span style={{ color: "var(--danger)" }}>{tr("No more private spending until the next income is distributed.", "Keine privaten Ausgaben mehr, bis der nächste Lohn verteilt ist.")}</span>
        </div>
      )}
      {status === "warn" && (
        <div className="p-3 rounded-[var(--radius-md)] text-sm" style={{ background: "var(--warning-soft)" }}>
          <b className="block" style={{ color: "var(--warning)" }}>{tr("Buffer below", "Puffer unter")} {chf(settings.minBuffer)}</b>
          <span style={{ color: "var(--warning)" }}>{tr(`${chf(settings.minBuffer - bal.main)} missing to reach the minimum buffer.`, `Es fehlen ${chf(settings.minBuffer - bal.main)} bis zum Mindestpuffer.`)}</span>
        </div>
      )}

      {/* Hero */}
      <div
        className="surface p-5 border-l-4"
        style={{ borderLeftColor: status === "bad" ? "var(--danger)" : status === "warn" ? "var(--warning)" : ACC.main.color }}
      >
        <div className="text-micro normal-case tracking-wide">{ACC.main.name[lang]} · {ACC.main.role[lang]}</div>
        <div className="text-4xl font-semibold mt-1" style={{ color: status === "bad" ? "var(--danger)" : undefined }}>
          {fmt(bal.main)} <span className="text-lg text-[var(--text-tertiary)]">CHF</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 border-t divider pt-3 text-sm">
          <div>
            <div className="text-caption">{tr("Lasts for", "Reicht für")}</div>
            <div className="font-medium">{ft > 0 ? (bal.main / ft).toFixed(1).replace(".", lang === "de" ? "," : ".") : "0"} {tr("months", "Monate")}</div>
          </div>
          <div>
            <div className="text-caption">{tr("Income", "Lohn")} {MS[+curYM().slice(5) - 1]}</div>
            <div className="font-medium">{alreadyDistributedThisMonth ? tr("distributed", "verteilt") : tr("not distributed yet", "noch nicht verteilt")}</div>
          </div>
          <div>
            <div className="text-caption">{tr("Fixed deductions / month", "Fixabzüge / Monat")}</div>
            <div className="font-medium">{chf(ft)}</div>
          </div>
        </div>
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ACCOUNTS.filter((a) => a.id !== "main").map((a, i) => {
          const per = settings[a.id as "taxes" | "bills" | "joint"];
          const Icon = a.icon;
          return (
            <div key={a.id} className="surface card-interactive p-4 animate-rise" style={{ "--stagger-i": i } as React.CSSProperties}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: a.color }} />
                <span className="font-medium text-sm">{a.name[lang]}</span>
                <span className="ml-auto text-xs text-[var(--text-tertiary)]">+{fmt(per)}{tr("/mo.", "/Mt.")}</span>
              </div>
              <div className="text-2xl font-semibold" style={{ color: bal[a.id] < 0 ? "var(--danger)" : undefined }}>{fmt(bal[a.id])}</div>
              {a.id === "bills" && (
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  {tr("Target balance", "Soll-Stand")} {chf(soll)} ·{" "}
                  {bal.bills >= soll ? (
                    <span style={{ color: "var(--success)" }}>{tr("covered", "gedeckt")}</span>
                  ) : (
                    <span style={{ color: "var(--warning)" }}>{tr("Gap", "Lücke")} {chf(soll - bal.bills)}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Budgets summary */}
      <div className="surface p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-headline flex items-center gap-2"><Wallet className="w-4 h-4" /> {tr("Budgets this month", "Budgets diesen Monat")}</h2>
          <button onClick={() => onNavigate("budgets")} className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
            {tr("Manage all", "Alle verwalten")} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {budgets.length === 0 ? (
          <p className="text-caption">{tr("No budgets yet.", "Noch keine Budgets angelegt.")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {budgets.map((b) => {
              const spent = spentByCategory[b.category] || 0;
              const pct = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
              return (
                <div key={b.id} className="surface-2 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{b.category}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{fmt(spent)} / {fmt(b.amount)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[var(--surface-3)] overflow-hidden">
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: pct > 90 ? "var(--danger)" : "var(--accent)",
                        transition: "width var(--dur-slow) var(--ease-spring)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schulden summary */}
      {debts.length > 0 && (
        <div className="surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-headline">{tr("Debts", "Schulden")}</h2>
            <button onClick={() => onNavigate("schulden")} className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
              {tr("View all", "Alle ansehen")} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {debts.slice(0, 3).map((debt) => {
              const paid = debt.total - debt.remaining;
              const pct = debt.total > 0 ? Math.min(100, Math.round((paid / debt.total) * 100)) : 0;
              return (
                <div key={debt.id} className="surface-2 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{debt.name}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{fmt(debt.remaining)} {tr("open", "offen")}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[var(--surface-3)] overflow-hidden">
                    <div style={{ width: `${pct}%`, height: "100%", background: "#f97316", transition: "width var(--dur-slow) var(--ease-spring)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sparziele summary */}
      <div className="surface p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-headline">{tr("Savings goals", "Sparziele")}</h2>
          <button onClick={() => onNavigate("sparziele")} className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
            {tr("View all", "Alle ansehen")} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {pots.length === 0 ? (
          <p className="text-caption">{tr("No savings goals yet.", "Noch keine Sparziele angelegt.")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pots.slice(0, 3).map((p) => {
              const pct = p.target > 0 ? Math.min(100, Math.round((p.saved / p.target) * 100)) : 0;
              return (
                <div key={p.id} className="surface-2 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{pct}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[var(--surface-3)] overflow-hidden">
                    <div style={{ width: `${pct}%`, height: "100%", background: "#3b82f6", transition: "width var(--dur-slow) var(--ease-spring)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface p-4">
          <h3 className="text-headline mb-3">{tr("Upcoming big bills", "Nächste Grossrechnungen")}</h3>
          {upcoming.length === 0 && <p className="text-caption">{tr("No bills in the next 4 months.", "Keine Rechnungen in den nächsten 4 Monaten.")}</p>}
          <div className="space-y-2">
            {upcoming.map((p) =>
              p.due.map((x) => (
                <div key={x.id + p.m} className="flex items-center justify-between text-sm border-t divider pt-2 first:border-0 first:pt-0">
                  <div>
                    <div className="font-medium">{x.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{MON[p.m - 1]} {p.y}</div>
                  </div>
                  <div className="font-medium">{chf(-x.amount)}</div>
                </div>
              ))
            )}
          </div>
          {minP && (
            <div
              className="mt-3 text-xs p-2 rounded-[var(--radius-sm)]"
              style={minP.bal < 0 ? { background: "var(--danger-soft)", color: "var(--danger)" } : { background: "var(--surface-2)", color: "var(--text-secondary)" }}
            >
              {tr("Lowest balance in 12 months", "Tiefster Stand in 12 Monaten")}: {chf(minP.bal)} ({MON[minP.m - 1]})
            </div>
          )}
        </div>
        <div className="surface p-4">
          <h3 className="text-headline mb-3">{tr("Recent distributions", "Letzte Verteilungen")}</h3>
          {dists.length === 0 && <p className="text-caption">{tr("No income distributed yet.", "Noch kein Lohn verteilt.")}</p>}
          <div className="space-y-2">
            {dists.slice(0, 6).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm border-t divider pt-2 first:border-0 first:pt-0">
                <div>
                  <div className="font-medium">{tr("Income distributed", "Lohn verteilt")}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{fdate(d.date)}</div>
                </div>
                <div className="font-medium" style={{ color: "var(--success)" }}>{chf(d.amount, true)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
