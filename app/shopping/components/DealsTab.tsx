import React from 'react';
import { ExternalLink, Plus, Package } from "lucide-react";
import Image from 'next/image';
import { SaleOffer } from "../types";
import { STORE_LINKS, CATEGORIES, categoryLabel } from "../constants";
import { MascotLoader } from "@/components/Mascot";
import { useI18n } from "../../context/LanguageContext";

interface DealsTabProps {
  currentStoreSales: string;
  salesOffers: SaleOffer[];
  isLoadingSales: boolean;
  salesError: "" | "load" | "fetch";
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  loadDeals: (storeName: string) => void;
  addDealToList: (offer: SaleOffer) => void;
}

export default function DealsTab({
  currentStoreSales,
  salesOffers,
  isLoadingSales,
  salesError,
  selectedCategory,
  setSelectedCategory,
  loadDeals,
  addDealToList
}: DealsTabProps) {
  const { t, lang } = useI18n();
  return (
    <div className="surface p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-title">
            {t(`Current Offers at ${currentStoreSales}`, `Aktuelle Angebote bei ${currentStoreSales}`)}
          </h2>
          <div className="flex gap-2">
            {Object.keys(STORE_LINKS).map(store => (
              <button
                key={store}
                onClick={() => loadDeals(store)}
                className="chip"
                data-active={currentStoreSales === store}
                style={currentStoreSales === store ? { background: "var(--accent)", color: "white", borderColor: "transparent" } : undefined}
              >
                {store}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className="chip"
                data-active={selectedCategory === cat.name}
              >
                <Icon className="w-4 h-4" />
                {cat.label[lang]}
              </button>
            );
          })}
        </div>
      </div>

      {isLoadingSales ? (
        <div className="flex flex-col items-center justify-center h-60 space-y-2">
          <MascotLoader size={80} label={t("Loading", "Lädt")} />
          <p className="text-body text-[var(--text-secondary)]">{t("Fetching latest deals...", "Aktuelle Angebote werden geholt …")}</p>
        </div>
      ) : (
        <>
          {(() => {
            const filteredOffers = salesOffers.filter(
              (o) => selectedCategory === "All" || o.category === selectedCategory
            );

            if (filteredOffers.length > 0) {
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredOffers.map((offer, idx) => {
                    // Determine icon based on category if image fails or is missing
                    const CategoryIcon = CATEGORIES.find(c => c.name === offer.category)?.icon || Package;

                    return (
                      <div
                        key={idx}
                        className="group surface card-interactive p-4 flex gap-4 relative animate-rise"
                        style={{ "--stagger-i": idx } as React.CSSProperties}
                      >
                        <div className="w-20 h-20 flex-shrink-0 bg-[var(--surface-2)] rounded-[var(--radius-sm)] flex items-center justify-center overflow-hidden relative">
                          {offer.image ? (
                            <Image
                              src={offer.image}
                              alt={offer.title}
                              className="w-full h-full object-cover"
                              width={80}
                              height={80}
                              unoptimized
                              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                const target = e.currentTarget as HTMLImageElement;
                                if (target) target.style.display = 'none';
                                const iconContainer = target.parentElement?.querySelector('.icon-fallback');
                                if (iconContainer) iconContainer.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`icon-fallback flex flex-col items-center justify-center text-[var(--text-tertiary)] w-full h-full absolute inset-0 bg-[var(--surface-2)] ${offer.image ? 'hidden' : ''}`}>
                            <CategoryIcon className="w-8 h-8 mb-1" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-[var(--text)] line-clamp-2 text-sm mb-1 pr-6">
                              {offer.title}
                            </h3>
                          </div>
                          <p className="text-green-600 font-bold text-lg">{offer.price}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {offer.category && (
                              <span className="inline-block text-xs text-[var(--text-secondary)] bg-[var(--surface-2)] px-2 py-0.5 rounded">
                                {categoryLabel(offer.category, lang)}
                              </span>
                            )}
                            {offer.link && (
                              <a
                                href={offer.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="press text-[var(--text-tertiary)] hover:text-orange-500 transition-colors p-1"
                                title={t("View on store website", "Auf der Website des Geschäfts ansehen")}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => addDealToList(offer)}
                          className="press row-action absolute top-3 right-3 p-2 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                          title={t("Add to shopping list", "Zur Einkaufsliste hinzufügen")}
                          aria-label={t("Add to shopping list", "Zur Einkaufsliste hinzufügen")}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            } else {
              return (
                <div className="text-center py-10">
                  <p className="text-body text-[var(--text-secondary)] mb-4">
                    {salesOffers.length > 0
                      ? t(`No offers found in "${categoryLabel(selectedCategory, "en")}".`, `Keine Angebote in «${categoryLabel(selectedCategory, "de")}» gefunden.`)
                      : salesError === "load"
                      ? t("Could not load live offers.", "Die aktuellen Angebote konnten nicht geladen werden.")
                      : salesError === "fetch"
                      ? t("Failed to fetch offers.", "Angebote konnten nicht abgerufen werden.")
                      : t("No offers found directly.", "Keine Angebote direkt gefunden.")}
                  </p>
                  <a
                    href={STORE_LINKS[Object.keys(STORE_LINKS).find(k => currentStoreSales.toLowerCase().includes(k.toLowerCase())) || ""] || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary inline-flex"
                  >
                    {t(`Open ${currentStoreSales} Website`, `Website von ${currentStoreSales} öffnen`)} <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            }
          })()}
        </>
      )}
    </div>
  );
}
