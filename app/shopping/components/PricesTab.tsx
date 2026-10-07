import { ExternalLink, ArrowUp, ArrowDown } from "lucide-react";
import Mascot from "@/components/Mascot";
import { useI18n } from "../../context/LanguageContext";
import { STORE_LINKS } from "../constants";
import { formatPrice, type Direction, type PriceTrend } from "../priceHistory";

interface PricesTabProps {
  trends: PriceTrend[];
}

// Calm on purpose (onboarding-tone: "Kein Urteil"): a higher price is news, not an alarm,
// so it gets the accent colour and never the danger red.
const GROUPS: { direction: Direction[]; en: string; de: string }[] = [
  { direction: ["up", "down"], en: "Price changed", de: "Preis hat sich geändert" },
  { direction: ["same"], en: "As usual", de: "Wie immer" },
  { direction: ["new"], en: "Noted once", de: "Einmal notiert" },
];

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 56;
  const h = 20;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="flex-shrink-0 text-[var(--text-tertiary)]">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PricesTab({ trends }: PricesTabProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      {trends.length === 0 ? (
        <div className="surface flex flex-col items-center p-8 text-center text-[var(--text-secondary)]">
          <Mascot mood="sleepy" size={80} />
          <p className="font-hand text-2xl font-semibold mt-2">{t("No prices yet.", "Noch keine Preise.")}</p>
          <p className="text-body mt-1 max-w-xs">
            {t(
              "Check off an item with a price and we'll remember it. Then you see when something gets more expensive.",
              "Hak etwas mit Preis ab, dann merken wir es uns. So siehst du, wenn etwas teurer wird."
            )}
          </p>
        </div>
      ) : (
        GROUPS.map((group) => {
          const rows = trends.filter((tr) => group.direction.includes(tr.direction));
          if (rows.length === 0) return null;
          return (
            <section key={group.en}>
              <h2 className="text-micro mb-2 px-1">{t(group.en, group.de)}</h2>
              <ul className="surface overflow-hidden divide-y" style={{ borderColor: "var(--border)" }}>
                {rows.map((tr) => (
                  <li key={tr.key} className="flex items-center gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text)] truncate">{tr.name}</p>
                      <p className="text-caption truncate">
                        {tr.usual !== null && tr.direction !== "same"
                          ? t(`Usually CHF ${formatPrice(tr.usual)}`, `Sonst CHF ${formatPrice(tr.usual)}`)
                          : tr.store ?? ""}
                        {tr.usual !== null && tr.direction !== "same" && tr.store ? ` · ${tr.store}` : ""}
                      </p>
                    </div>
                    <Sparkline values={tr.history} />
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold tabular-nums text-[var(--text)]">CHF {formatPrice(tr.latest)}</p>
                      {(tr.direction === "up" || tr.direction === "down") && tr.change !== null && (
                        <p
                          className="text-caption tabular-nums inline-flex items-center gap-0.5"
                          style={{ color: tr.direction === "up" ? "var(--accent)" : "var(--success)" }}
                        >
                          {tr.direction === "up" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {formatPrice(Math.abs(tr.change))}
                          {tr.changePct !== null && ` (${Math.abs(tr.changePct)} %)`}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <section>
        <h2 className="text-micro mb-2 px-1">{t("Offers", "Angebote")}</h2>
        <div className="surface p-4">
          <p className="text-body text-[var(--text-secondary)] mb-3">
            {t(
              "Current offers are best seen straight at the store. Their own pages and apps are always up to date.",
              "Aktuelle Angebote siehst du am besten direkt beim Laden. Deren Seiten und Apps sind immer auf dem neusten Stand."
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STORE_LINKS).map(([store, url]) => (
              <a
                key={store}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="chip press"
                aria-label={t(`${store} offers (opens the store's website)`, `Angebote bei ${store} (öffnet die Website des Ladens)`)}
              >
                {store}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
