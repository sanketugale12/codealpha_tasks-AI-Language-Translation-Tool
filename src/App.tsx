import React, { useState, useEffect, useRef } from "react";
import {
  Languages,
  Sparkles,
  ArrowRightLeft,
  Copy,
  Check,
  Volume2,
  Mic,
  MicOff,
  Trash2,
  Star,
  RefreshCw,
  Upload,
  AlertCircle,
  HelpCircle,
  Info,
  Clock,
  BookOpen,
  CornerDownRight,
  Sparkle
} from "lucide-react";
import { SUPPORTED_LANGUAGES } from "./languages";
import { TranslationHistoryItem, TranslationResult } from "./types";

export default function App() {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("es");
  
  // Results
  const [detectedLangName, setDetectedLangName] = useState("");
  const [detectedLangCode, setDetectedLangCode] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [alternatives, setAlternatives] = useState<{
    formal: string;
    informal: string;
    creative: string;
  } | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [explanation, setExplanation] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [searchSourceQuery, setSearchSourceQuery] = useState("");
  const [searchTargetQuery, setSearchTargetQuery] = useState("");
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // History & Favorites
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [isCurrentSaved, setIsCurrentSaved] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"all" | "favorites">("all");

  // Refs
  const recognitionRef = useRef<any>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const targetDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setInputText((prev) => (prev ? prev + " " + resultText : resultText));
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    // Load History
    const savedHistory = localStorage.getItem("lingo_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history from localStorage", e);
      }
    }
  }, []);

  // Sync dropdown closures
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
        setShowSourceDropdown(false);
      }
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(event.target as Node)) {
        setShowTargetDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Save history to localStorage
  const saveHistoryToStorage = (updatedHistory: TranslationHistoryItem[]) => {
    setHistory(updatedHistory);
    localStorage.setItem("lingo_history", JSON.stringify(updatedHistory));
  };

  // Real-time Translate Debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!inputText.trim()) {
      setTranslatedText("");
      setPronunciation("");
      setAlternatives(null);
      setConfidence(null);
      setExplanation("");
      setDetectedLangName("");
      setDetectedLangCode("");
      setIsCurrentSaved(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      handleTranslation();
    }, 600); // 600ms debounce

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputText, sourceLang, targetLang]);

  // Main Translation Function
  const handleTranslation = async (forcedText?: string) => {
    const textToTranslate = forcedText !== undefined ? forcedText : inputText;
    if (!textToTranslate.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textToTranslate,
          sourceLang,
          targetLang,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Translation API returned an error");
      }

      const data: TranslationResult & { cached?: boolean } = await response.json();
      
      setTranslatedText(data.translatedText);
      setDetectedLangCode(data.detectedLanguageCode);
      setDetectedLangName(data.detectedLanguageName);
      setPronunciation(data.pronunciationGuide || "");
      setAlternatives(data.alternatives || null);
      setConfidence(data.confidenceScore || 1.0);
      setExplanation(data.explanation || "");

      // Check if this is already in our history
      const existingHistoryIndex = history.findIndex(
        (h) => h.inputText === textToTranslate && h.targetLang === targetLang
      );

      if (existingHistoryIndex > -1) {
        setIsCurrentSaved(history[existingHistoryIndex].isFavorite);
      } else {
        setIsCurrentSaved(false);
        // Add to history list automatically
        const newItem: TranslationHistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          inputText: textToTranslate,
          translatedText: data.translatedText,
          sourceLang: sourceLang === "auto" ? "auto" : sourceLang,
          targetLang,
          detectedLangName: data.detectedLanguageName,
          detectedLangCode: data.detectedLanguageCode,
          timestamp: Date.now(),
          isFavorite: false,
          pronunciationGuide: data.pronunciationGuide,
          alternatives: data.alternatives,
          explanation: data.explanation,
          confidenceScore: data.confidenceScore
        };

        const updatedHistory = [newItem, ...history].slice(0, 20); // Keep last 20
        saveHistoryToStorage(updatedHistory);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to the translation server. Please check your network or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Language Swapping
  const handleSwapLanguages = () => {
    if (sourceLang === "auto") {
      // If auto-detected, swap with the detected language code
      if (detectedLangCode) {
        const temp = detectedLangCode;
        setSourceLang(targetLang);
        setTargetLang(temp);
        setInputText(translatedText);
        setTranslatedText(inputText);
      } else {
        // Fallback swap to first available language or Spanish/English
        setSourceLang(targetLang);
        setTargetLang("en");
      }
    } else {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
      setInputText(translatedText);
      setTranslatedText(inputText);
    }
  };

  // Toggle Favorite
  const toggleFavoriteCurrent = () => {
    const existingHistoryIndex = history.findIndex(
      (h) => h.inputText === inputText && h.targetLang === targetLang
    );

    if (existingHistoryIndex > -1) {
      const updatedHistory = [...history];
      const nextFavState = !updatedHistory[existingHistoryIndex].isFavorite;
      updatedHistory[existingHistoryIndex].isFavorite = nextFavState;
      setIsCurrentSaved(nextFavState);
      saveHistoryToStorage(updatedHistory);
    } else if (translatedText) {
      // Create new history item as favorite
      const newItem: TranslationHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        inputText,
        translatedText,
        sourceLang,
        targetLang,
        detectedLangName,
        detectedLangCode,
        timestamp: Date.now(),
        isFavorite: true,
        pronunciationGuide: pronunciation,
        alternatives: alternatives || undefined,
        explanation,
        confidenceScore: confidence || undefined
      };
      saveHistoryToStorage([newItem, ...history]);
      setIsCurrentSaved(true);
    }
  };

  const toggleFavoriteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = history.map((item) => {
      if (item.id === id) {
        const nextState = !item.isFavorite;
        if (item.inputText === inputText && item.targetLang === targetLang) {
          setIsCurrentSaved(nextState);
        }
        return { ...item, isFavorite: nextState };
      }
      return item;
    });
    saveHistoryToStorage(updatedHistory);
  };

  // Delete Item from History
  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.id !== id);
    saveHistoryToStorage(updated);
    if (history.find((item) => item.id === id)?.inputText === inputText) {
      setIsCurrentSaved(false);
    }
  };

  // Clear All History
  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your translation history? Your favorites will also be removed.")) {
      saveHistoryToStorage([]);
      setIsCurrentSaved(false);
    }
  };

  // Load a translation item from history
  const handleLoadHistoryItem = (item: TranslationHistoryItem) => {
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
    setInputText(item.inputText);
    setTranslatedText(item.translatedText);
    setDetectedLangName(item.detectedLangName || "");
    setDetectedLangCode(item.detectedLangCode || "");
    setPronunciation(item.pronunciationGuide || "");
    setAlternatives(item.alternatives || null);
    setConfidence(item.confidenceScore || null);
    setExplanation(item.explanation || "");
    setIsCurrentSaved(item.isFavorite);
  };

  // Speech to Text (Microphone dictation)
  const handleMicrophoneClick = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not fully supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Configure speech language if source language is set, otherwise default to user's browser language
      if (sourceLang !== "auto") {
        recognitionRef.current.lang = sourceLang;
      } else {
        recognitionRef.current.lang = navigator.language || "en-US";
      }
      recognitionRef.current.start();
    }
  };

  // Text to Speech playback
  const handleSpeak = (text: string, langCode: string) => {
    if (!text) return;
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to match suitable language voice
    utterance.lang = langCode === "auto" ? (detectedLangCode || "en-US") : langCode;
    window.speechSynthesis.speak(utterance);
  };

  // Copy to clipboard
  const handleCopyToClipboard = (text: string, isInput: boolean) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isInput) {
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 2000);
    } else {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  // File document upload (.txt files)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/plain" && !file.name.endsWith(".txt")) {
      alert("Only plain text (.txt) files are supported for instant translation.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        if (text.length > 5000) {
          setInputText(text.slice(0, 5000));
          alert("File content was truncated to the maximum 5000 characters limit.");
        } else {
          setInputText(text);
        }
      }
    };
    reader.readAsText(file);
    // Reset file input value to allow the same file to be selected again
    e.target.value = "";
  };

  // Search filtered lists
  const filteredSourceLangs = SUPPORTED_LANGUAGES.filter((lang) =>
    lang.name.toLowerCase().includes(searchSourceQuery.toLowerCase())
  );
  const filteredTargetLangs = SUPPORTED_LANGUAGES.filter((lang) =>
    lang.name.toLowerCase().includes(searchTargetQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-100 font-sans antialiased selection:bg-indigo-500/30 selection:text-white transition-colors duration-300">
      
      {/* Header Bar */}
      <nav className="h-16 flex items-center justify-between px-6 lg:px-8 border-b border-slate-800/60 bg-[#020617] shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8.5 h-8.5 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Languages className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white leading-tight">
              Linguist<span className="text-indigo-400">AI</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Powered by Gemini</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>API Status: Active</span>
          </div>
          <div className="h-5 w-px bg-slate-800 hidden sm:block"></div>
          
          <button
            onClick={() => setShowAboutModal(true)}
            className="p-2 hover:bg-slate-800/80 rounded-xl text-slate-400 hover:text-slate-100 transition-colors"
            title="About LingoAI"
            id="nav-about-btn"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row p-4 lg:p-6 gap-6 overflow-x-hidden">
        
        {/* Left Side: Translation Area */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Top Panel: Language Selection Selectors */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/30 border border-slate-800/50 p-2 rounded-2xl">
            
            {/* Source Language Search Selector */}
            <div className="relative w-full sm:flex-1" ref={sourceDropdownRef}>
              <button
                type="button"
                onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/80 hover:bg-slate-800/60 border border-slate-800 rounded-xl text-sm font-semibold text-slate-200 transition-all duration-200"
                id="source-lang-dropdown-btn"
              >
                <span className="truncate">
                  {sourceLang === "auto"
                    ? detectedLangName
                      ? `Auto-Detect (${detectedLangName})`
                      : "Auto-Detect Language"
                    : SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang)?.name || sourceLang}
                </span>
                <span className="text-slate-500 text-xs ml-2">▼</span>
              </button>

              {showSourceDropdown && (
                <div className="absolute left-0 mt-1.5 w-full min-w-[250px] bg-[#090d1f] border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[300px]">
                  <div className="p-2 border-b border-slate-800/60 shrink-0">
                    <input
                      type="text"
                      placeholder="Search source language..."
                      value={searchSourceQuery}
                      onChange={(e) => setSearchSourceQuery(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceLang("auto");
                        setShowSourceDropdown(false);
                        setSearchSourceQuery("");
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        sourceLang === "auto" ? "bg-indigo-500/10 text-indigo-400 font-semibold" : "text-slate-300 hover:bg-slate-800/40"
                      }`}
                    >
                      Auto-Detect Language
                    </button>
                    {filteredSourceLangs.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setSourceLang(lang.code);
                          setShowSourceDropdown(false);
                          setSearchSourceQuery("");
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          sourceLang === lang.code ? "bg-indigo-500/10 text-indigo-400 font-semibold" : "text-slate-300 hover:bg-slate-800/40"
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Interchange Swap Button */}
            <button
              onClick={handleSwapLanguages}
              disabled={sourceLang === "auto" && !detectedLangCode}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Swap languages"
              id="swap-languages-btn"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            {/* Target Language Search Selector */}
            <div className="relative w-full sm:flex-1" ref={targetDropdownRef}>
              <button
                type="button"
                onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/80 hover:bg-slate-800/60 border border-slate-800 rounded-xl text-sm font-semibold text-slate-200 transition-all duration-200"
                id="target-lang-dropdown-btn"
              >
                <span className="truncate">
                  {SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang}
                </span>
                <span className="text-slate-500 text-xs ml-2">▼</span>
              </button>

              {showTargetDropdown && (
                <div className="absolute right-0 mt-1.5 w-full min-w-[250px] bg-[#090d1f] border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[300px]">
                  <div className="p-2 border-b border-slate-800/60 shrink-0">
                    <input
                      type="text"
                      placeholder="Search target language..."
                      value={searchTargetQuery}
                      onChange={(e) => setSearchTargetQuery(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 py-1">
                    {filteredTargetLangs.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setTargetLang(lang.code);
                          setShowTargetDropdown(false);
                          setSearchTargetQuery("");
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          targetLang === lang.code ? "bg-indigo-500/10 text-indigo-400 font-semibold" : "text-slate-300 hover:bg-slate-800/40"
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Same language warning */}
          {sourceLang === targetLang && sourceLang !== "auto" && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Source and Target languages are set to the same language.</span>
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Two Columns Grid: Input (left) & Translated (right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            
            {/* Input Panel Card */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 lg:p-8 flex flex-col relative group shadow-xl">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, 5000))}
                placeholder="Enter text to translate..."
                className="bg-transparent border-none focus:ring-0 text-xl lg:text-2xl text-slate-100 placeholder-slate-600 resize-none flex-1 leading-relaxed focus:outline-none min-h-[220px]"
                id="input-text-area"
              />

              {/* Input Action Tray */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 mt-4 shrink-0">
                <div className="flex gap-2">
                  {/* Microphone */}
                  <button
                    onClick={handleMicrophoneClick}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isListening
                        ? "bg-rose-500/20 border-rose-500/30 text-rose-400 animate-pulse"
                        : "bg-slate-800/50 hover:bg-slate-700/80 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                    title={isListening ? "Stop dictating" : "Dictate using microphone"}
                    id="input-mic-btn"
                  >
                    {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                  </button>

                  {/* Audio TTS */}
                  <button
                    onClick={() => handleSpeak(inputText, sourceLang)}
                    disabled={!inputText.trim()}
                    className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/80 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-45 disabled:pointer-events-none transition-all"
                    title="Listen to input text"
                    id="input-speak-btn"
                  >
                    <Volume2 className="w-4.5 h-4.5" />
                  </button>

                  {/* Copy */}
                  <button
                    onClick={() => handleCopyToClipboard(inputText, true)}
                    disabled={!inputText.trim()}
                    className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/80 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-45 disabled:pointer-events-none transition-all relative"
                    title="Copy input text"
                    id="input-copy-btn"
                  >
                    {copiedInput ? <Check className="w-4.5 h-4.5 text-emerald-400" /> : <Copy className="w-4.5 h-4.5" />}
                    {copiedInput && (
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-950 border border-slate-800 text-[10px] text-emerald-400 font-semibold rounded shadow-md whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </button>

                  {/* Document Upload */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/80 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all"
                    title="Upload .txt file"
                    id="input-upload-btn"
                  >
                    <Upload className="w-4.5 h-4.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Counter & Clear */}
                <div className="flex items-center gap-3">
                  {inputText && (
                    <button
                      onClick={() => setInputText("")}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold hover:underline"
                      id="input-clear-btn"
                    >
                      Clear
                    </button>
                  )}
                  <span className="text-xs font-mono text-slate-500 tracking-wider">
                    {inputText.length} / 5000
                  </span>
                </div>
              </div>
            </div>

            {/* Output Panel Card */}
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6 lg:p-8 flex flex-col shadow-2xl relative min-h-[280px]">
              {/* Spinner Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center z-10 transition-all duration-300">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                  <span className="text-xs text-slate-300 font-medium tracking-widest uppercase">Translating...</span>
                </div>
              )}

              {/* Translated Text Box */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 text-xl lg:text-2xl text-indigo-100 font-light leading-relaxed min-h-[150px] whitespace-pre-wrap">
                  {translatedText || (
                    <span className="text-slate-600 select-none italic text-lg font-normal">
                      Translation output will appear here...
                    </span>
                  )}
                </div>

                {/* Pronunciation Guide (Only when translation is present) */}
                {pronunciation && (
                  <div className="mt-4 p-3 bg-indigo-950/40 border border-indigo-900/40 rounded-xl flex items-center gap-2.5 shrink-0">
                    <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider font-mono">Pronounce:</span>
                    <span className="text-slate-300 text-sm italic font-medium">{pronunciation}</span>
                  </div>
                )}
              </div>

              {/* Output Action Tray */}
              <div className="flex items-center justify-between pt-4 border-t border-indigo-500/10 mt-4 shrink-0">
                <div className="flex gap-2">
                  {/* Speak Output */}
                  <button
                    onClick={() => handleSpeak(translatedText, targetLang)}
                    disabled={!translatedText}
                    className="p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 disabled:opacity-40 disabled:pointer-events-none transition-all"
                    title="Listen to translation"
                    id="output-speak-btn"
                  >
                    <Volume2 className="w-4.5 h-4.5" />
                  </button>

                  {/* Favorite Save */}
                  <button
                    onClick={toggleFavoriteCurrent}
                    disabled={!translatedText}
                    className={`p-3 rounded-xl border transition-all ${
                      isCurrentSaved
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-indigo-500/10 hover:bg-indigo-500/20 border-transparent text-indigo-300 disabled:opacity-40"
                    }`}
                    title={isCurrentSaved ? "Remove from Favorites" : "Save to Favorites"}
                    id="output-fav-btn"
                  >
                    <Star className={`w-4.5 h-4.5 ${isCurrentSaved ? "fill-amber-400" : ""}`} />
                  </button>

                  {/* Copy Output */}
                  <button
                    onClick={() => handleCopyToClipboard(translatedText, false)}
                    disabled={!translatedText}
                    className="p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 disabled:opacity-40 disabled:pointer-events-none transition-all relative"
                    title="Copy translation"
                    id="output-copy-btn"
                  >
                    {copiedOutput ? <Check className="w-4.5 h-4.5 text-emerald-400" /> : <Copy className="w-4.5 h-4.5" />}
                    {copiedOutput && (
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-950 border border-slate-800 text-[10px] text-emerald-400 font-semibold rounded shadow-md whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </button>
                </div>

                {/* Confidence Level */}
                {confidence !== null && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider font-mono">
                    <Sparkle className="w-3.5 h-3.5" />
                    <span>Confidence: {Math.round(confidence * 100)}%</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Explanation, Grammatical or Cultural Context Tip */}
          {explanation && (
            <div className="bg-[#090d23] border border-indigo-500/10 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4.5 h-4.5 text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-200 tracking-wide uppercase font-mono">AI Context Note</h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed font-normal">{explanation}</p>
            </div>
          )}

          {/* Alternatives Subsection */}
          {alternatives && (
            <div className="bg-[#090d23] border border-indigo-500/10 rounded-2xl p-6 shadow-lg">
              <h4 className="text-xs font-bold text-slate-400 tracking-widest uppercase font-mono mb-4">Stylistic Alternatives</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Formal</span>
                    <p className="text-slate-200 text-sm mt-1.5 leading-relaxed font-light">{alternatives.formal || "N/A"}</p>
                  </div>
                  {alternatives.formal && (
                    <button
                      onClick={() => handleCopyToClipboard(alternatives.formal, false)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 font-medium mt-3 flex items-center gap-1 hover:underline self-start cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  )}
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono">Informal</span>
                    <p className="text-slate-200 text-sm mt-1.5 leading-relaxed font-light">{alternatives.informal || "N/A"}</p>
                  </div>
                  {alternatives.informal && (
                    <button
                      onClick={() => handleCopyToClipboard(alternatives.informal, false)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 font-medium mt-3 flex items-center gap-1 hover:underline self-start cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  )}
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-mono">Creative</span>
                    <p className="text-slate-200 text-sm mt-1.5 leading-relaxed font-light">{alternatives.creative || "N/A"}</p>
                  </div>
                  {alternatives.creative && (
                    <button
                      onClick={() => handleCopyToClipboard(alternatives.creative, false)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 font-medium mt-3 flex items-center gap-1 hover:underline self-start cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Translation History Panel (Perfect fit with desktop layout) */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 flex flex-col h-[500px] lg:h-full lg:min-h-[500px]">
            
            {/* History Panel Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-indigo-400" />
                <span className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">Translation Logs</span>
              </div>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                  title="Clear history"
                  id="clear-all-history-btn"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl my-4 shrink-0">
              <button
                onClick={() => setActiveHistoryTab("all")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeHistoryTab === "all"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id="history-tab-all"
              >
                Recent
              </button>
              <button
                onClick={() => setActiveHistoryTab("favorites")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeHistoryTab === "favorites"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id="history-tab-favs"
              >
                Starred
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {history.filter(h => activeHistoryTab === "all" || h.isFavorite).length > 0 ? (
                history
                  .filter(h => activeHistoryTab === "all" || h.isFavorite)
                  .map((item) => {
                    const sourceLabel = item.sourceLang === "auto" 
                      ? item.detectedLangName || "Auto"
                      : SUPPORTED_LANGUAGES.find(l => l.code === item.sourceLang)?.name.split(" ")[0] || item.sourceLang.toUpperCase();
                    const targetLabel = SUPPORTED_LANGUAGES.find(l => l.code === item.targetLang)?.name.split(" ")[0] || item.targetLang.toUpperCase();

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleLoadHistoryItem(item)}
                        className={`p-3.5 bg-slate-950/60 border rounded-xl hover:border-indigo-500/40 transition-all cursor-pointer group relative ${
                          inputText === item.inputText && targetLang === item.targetLang
                            ? "border-indigo-500/60 bg-indigo-500/5"
                            : "border-slate-800/60"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                            {sourceLabel} → {targetLabel}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-200 line-clamp-1 pr-6">{item.inputText}</p>
                        <p className="text-xs text-slate-400 line-clamp-1 italic mt-0.5">{item.translatedText}</p>

                        {/* Hover Quick actions */}
                        <div className="absolute right-2 top-2 flex items-center gap-1">
                          <button
                            onClick={(e) => toggleFavoriteItem(item.id, e)}
                            className={`p-1 rounded hover:scale-110 transition ${
                              item.isFavorite ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
                            }`}
                            title={item.isFavorite ? "Unstar" : "Star"}
                          >
                            <Star className={`w-3 h-3 ${item.isFavorite ? "fill-amber-400" : ""}`} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded hover:scale-110 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs font-semibold text-slate-400">Empty list</p>
                  <p className="text-[10px] text-slate-600 max-w-[150px] mt-1">
                    Translations you make will be saved here automatically.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

      </main>

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#090d1f] border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                <Languages className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-lg text-white">About LinguistAI</h3>
            </div>
            <div className="space-y-3.5 text-sm text-slate-300 leading-relaxed">
              <p>
                <strong>LinguistAI</strong> is a context-rich, smart AI language translation tool powered securely by the next-generation <strong>Google Gemini 3.5 Flash</strong> model.
              </p>
              <p>
                Unlike basic keyword translator dictionaries, LingoAI parses slang, idioms, tone, style, and cultural contexts to deliver highly natural translations.
              </p>
              <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1 text-xs">
                <h4 className="font-bold text-indigo-400">Key Capabilities included:</h4>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                  <li>Automatic Language Detection with confidence rating</li>
                  <li>Phonetic pronunciation guide for non-native speakers</li>
                  <li>Alternative translation suggestions (Formal, Informal, Creative)</li>
                  <li>Offline history caching & Favorite Starring</li>
                  <li>Microphone dictation input & Text-to-Speech audio reader</li>
                  <li>Plain text document translation uploads</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowAboutModal(false)}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl transition"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
