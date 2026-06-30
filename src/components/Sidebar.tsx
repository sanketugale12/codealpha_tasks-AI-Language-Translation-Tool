import React, { useState } from "react";
import { History, Star, Trash2, Clock, FileText, ChevronRight, X } from "lucide-react";
import { TranslationHistoryItem, LanguageOption } from "../types";

interface SidebarProps {
  history: TranslationHistoryItem[];
  languages: LanguageOption[];
  onLoadItem: (item: TranslationHistoryItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
  idPrefix: string;
}

export default function Sidebar({
  history,
  languages,
  onLoadItem,
  onToggleFavorite,
  onDeleteItem,
  onClearHistory,
  idPrefix
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"history" | "favorites">("history");

  const getLanguageName = (code: string, detectedName?: string) => {
    if (code === "auto" && detectedName) {
      return `Auto (${detectedName})`;
    }
    if (code === "auto") return "Auto-Detect";
    const found = languages.find((lang) => lang.code === code);
    return found ? found.name.split(" ")[0] : code.toUpperCase();
  };

  const filteredItems = history.filter((item) => {
    if (activeTab === "favorites") return item.isFavorite;
    return true;
  });

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all duration-300">
      {/* Header Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition-all ${
            activeTab === "history"
              ? "border-brand-600 dark:border-brand-500 text-brand-700 dark:text-brand-400 bg-brand-50/20 dark:bg-brand-950/5"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
          }`}
          id={`${idPrefix}-tab-history`}
        >
          <Clock className="w-4 h-4" />
          <span>History</span>
          {history.length > 0 && (
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full font-medium">
              {history.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition-all ${
            activeTab === "favorites"
              ? "border-brand-600 dark:border-brand-500 text-brand-700 dark:text-brand-400 bg-brand-50/20 dark:bg-brand-950/5"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
          }`}
          id={`${idPrefix}-tab-favorites`}
        >
          <Star className="w-4 h-4" />
          <span>Favorites</span>
          {history.filter((item) => item.isFavorite).length > 0 && (
            <span className="bg-brand-100 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400 text-xs px-2 py-0.5 rounded-full font-medium">
              {history.filter((item) => item.isFavorite).length}
            </span>
          )}
        </button>
      </div>

      {/* Action panel (Clear actions) */}
      {filteredItems.length > 0 && (
        <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/10 border-b border-gray-100 dark:border-gray-800 shrink-0 flex justify-between items-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
            {activeTab === "history" ? "All Translations" : "Saved Translations"}
          </span>
          {activeTab === "history" && (
            <button
              onClick={onClearHistory}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline flex items-center space-x-1.5 font-medium transition"
              id={`${idPrefix}-clear-all`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear history</span>
            </button>
          )}
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative p-4 flex flex-col hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all duration-200"
              id={`${idPrefix}-item-${item.id}`}
            >
              {/* Language Indicator */}
              <div className="flex items-center justify-between mb-1.5 shrink-0">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {getLanguageName(item.sourceLang, item.detectedLangName)}
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded">
                    {getLanguageName(item.targetLang)}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium font-mono">
                  {formatTime(item.timestamp)}
                </span>
              </div>

              {/* Text content previews */}
              <div
                onClick={() => onLoadItem(item)}
                className="cursor-pointer space-y-1.5 pr-14"
              >
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                  {item.inputText}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 italic">
                  {item.translatedText}
                </p>
              </div>

              {/* Action buttons overlay */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                {/* Favorite Toggle */}
                <button
                  onClick={() => onToggleFavorite(item.id)}
                  className={`p-1.5 rounded-lg border hover:scale-105 transition ${
                    item.isFavorite
                      ? "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-900/40 dark:bg-amber-950/30"
                      : "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200"
                  }`}
                  title={item.isFavorite ? "Unsave translation" : "Save translation"}
                  id={`${idPrefix}-fav-${item.id}`}
                >
                  <Star className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
                </button>

                {/* Delete button */}
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:text-rose-400 dark:hover:bg-rose-950/20 dark:hover:border-rose-900/40 transition"
                  title="Delete from list"
                  id={`${idPrefix}-del-${item.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-full mb-3 text-gray-400 dark:text-gray-600">
              {activeTab === "history" ? (
                <History className="w-8 h-8" />
              ) : (
                <Star className="w-8 h-8" />
              )}
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {activeTab === "history" ? "No translations yet" : "No saved favorites"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px] mt-1">
              {activeTab === "history"
                ? "Translations you perform will be saved here automatically."
                : "Star items to save them for quick access later."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
