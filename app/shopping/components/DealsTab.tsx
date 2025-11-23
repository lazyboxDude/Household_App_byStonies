import { Loader2, ExternalLink, Plus, Package } from "lucide-react";
import { SaleOffer } from "../types";
import { STORE_LINKS, CATEGORIES } from "../constants";

interface DealsTabProps {
  currentStoreSales: string;
  salesOffers: SaleOffer[];
  isLoadingSales: boolean;
  salesError: string;
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
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Current Offers at {currentStoreSales}
          </h2>
          <div className="flex gap-2">
            {Object.keys(STORE_LINKS).map(store => (
              <button
                key={store}
                onClick={() => loadDeals(store)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  currentStoreSales === store
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
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
                className={`flex items-center whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.name
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
                    : "bg-gray-50 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="w-4 h-4 mr-1.5" />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {isLoadingSales ? (
        <div className="flex flex-col items-center justify-center h-60 space-y-4">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-gray-500">Fetching latest deals...</p>
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
                      <div key={idx} className="group border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex gap-4 hover:shadow-md transition-all bg-white dark:bg-gray-800 relative">
                        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center overflow-hidden relative">
                          {offer.image ? (
                            <img 
                              src={offer.image} 
                              alt={offer.title} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                // Show the icon sibling
                                const iconContainer = e.currentTarget.parentElement?.querySelector('.icon-fallback');
                                if (iconContainer) iconContainer.classList.remove('hidden');
                              }} 
                            />
                          ) : null}
                          <div className={`icon-fallback flex flex-col items-center justify-center text-gray-400 w-full h-full absolute inset-0 bg-gray-100 dark:bg-gray-700 ${offer.image ? 'hidden' : ''}`}>
                            <CategoryIcon className="w-8 h-8 mb-1" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 text-sm mb-1 pr-6">
                              {offer.title}
                            </h3>
                          </div>
                          <p className="text-green-600 font-bold text-lg">{offer.price}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {offer.category && (
                              <span className="inline-block text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                {offer.category}
                              </span>
                            )}
                            {offer.link && (
                              <a
                                href={offer.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-orange-500 transition-colors p-1"
                                title="View on store website"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => addDealToList(offer)}
                          className="absolute top-3 right-3 p-2 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Add to shopping list"
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
                  <p className="text-gray-500 mb-4">
                    {salesOffers.length > 0 
                      ? `No offers found in "${selectedCategory}".` 
                      : (salesError || "No offers found directly.")}
                  </p>
                  <a 
                    href={STORE_LINKS[Object.keys(STORE_LINKS).find(k => currentStoreSales.toLowerCase().includes(k.toLowerCase())) || ""] || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Open {currentStoreSales} Website <ExternalLink className="w-4 h-4 ml-2" />
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
