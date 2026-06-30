import React from "react";
import { Languages, Sparkles, Moon, Sun, Info } from "lucide-react";

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  onOpenAbout: () => void;
}

export default function Header({ darkMode, toggleDarkMode, onOpenAbout }: HeaderProps) {
  return (
    <header className="w-full border-b border-gray-200/80 dark:border-gray-800/80 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-40 px-4 py-3.5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-2.5">
          <div className="bg-brand-600 dark:bg-brand-500 p-2 rounded-xl text-white shadow-md shadow-brand-500/20 flex items-center justify-center">
            <Languages className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-display font-extrabold text-xl tracking-tight text-gray-900 dark:text-white">
                Lingo<span className="text-brand-600 dark:text-brand-400">Gemini</span>
              </h1>
              <span className="flex items-center space-x-0.5 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-brand-100/50 dark:border-brand-900/30">
                <Sparkles className="w-2.5 h-2.5 text-brand-500" />
                <span>AI</span>
              </span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Next-Gen Contextual Language Translation
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* About / Info Button */}
          <button
            onClick={onOpenAbout}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-200 cursor-pointer"
            title="About LingoGemini"
            id="btn-about"
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-200 cursor-pointer"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            id="btn-theme-toggle"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
