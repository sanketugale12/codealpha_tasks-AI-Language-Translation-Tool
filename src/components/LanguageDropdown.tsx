import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, Globe } from "lucide-react";
import { LanguageOption } from "../types";

interface LanguageDropdownProps {
  languages: LanguageOption[];
  selectedLanguageCode: string;
  onChange: (code: string) => void;
  isSource?: boolean; // If true, includes "Auto-Detect"
  autoDetectName?: string; // e.g. "Auto-Detect (Spanish)" if detected
  idPrefix: string;
}

export default function LanguageDropdown({
  languages,
  selectedLanguageCode,
  onChange,
  isSource = false,
  autoDetectName = "",
  idPrefix
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Find the currently selected language details
  const getSelectedLangLabel = () => {
    if (isSource && selectedLanguageCode === "auto") {
      return autoDetectName ? `Auto-Detect (${autoDetectName})` : "Auto-Detect";
    }
    const found = languages.find((lang) => lang.code === selectedLanguageCode);
    return found ? found.name : "Select Language";
  };

  // Filter languages based on search query
  const filteredLanguages = languages.filter((lang) =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative inline-block w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        id={`${idPrefix}-trigger`}
      >
        <div className="flex items-center space-x-2 truncate">
          <Globe className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate">{getSelectedLangLabel()}</span>
        </div>
        <ChevronDown className={`w-4.5 h-4.5 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 mt-1.5 w-full min-w-[240px] max-h-[320px] bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col transition-all duration-200"
          id={`${idPrefix}-menu`}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              id={`${idPrefix}-search`}
            />
          </div>

          {/* Languages List */}
          <div className="overflow-y-auto flex-1 py-1 text-sm text-gray-700 dark:text-gray-300">
            {/* Auto-Detect Option (if source selector) */}
            {isSource && (
              <button
                type="button"
                onClick={() => handleSelect("auto")}
                className={`w-full text-left px-4 py-2 flex items-center justify-between hover:bg-brand-50 dark:hover:bg-brand-950/20 hover:text-brand-700 dark:hover:text-brand-300 transition-colors ${
                  selectedLanguageCode === "auto" ? "bg-brand-50/50 dark:bg-brand-950/10 text-brand-700 dark:text-brand-400 font-semibold" : ""
                }`}
              >
                <span>Auto-Detect Language</span>
                {selectedLanguageCode === "auto" && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />}
              </button>
            )}

            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full text-left px-4 py-2 flex items-center justify-between hover:bg-brand-50 dark:hover:bg-brand-950/20 hover:text-brand-700 dark:hover:text-brand-300 transition-colors ${
                    selectedLanguageCode === lang.code ? "bg-brand-50/50 dark:bg-brand-950/10 text-brand-700 dark:text-brand-400 font-semibold" : ""
                  }`}
                  id={`${idPrefix}-lang-${lang.code}`}
                >
                  <span>{lang.name}</span>
                  {selectedLanguageCode === lang.code && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
                No languages found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
