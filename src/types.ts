export interface TranslationAlternatives {
  formal: string;
  informal: string;
  creative: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguageCode: string;
  detectedLanguageName: string;
  pronunciationGuide: string;
  alternatives: TranslationAlternatives;
  confidenceScore: number;
  explanation?: string;
  cached?: boolean;
}

export interface TranslationHistoryItem {
  id: string;
  inputText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  detectedLangName?: string;
  detectedLangCode?: string;
  timestamp: number;
  isFavorite: boolean;
  pronunciationGuide?: string;
  alternatives?: TranslationAlternatives;
  explanation?: string;
  confidenceScore?: number;
}

export interface LanguageOption {
  code: string;
  name: string;
  flag?: string;
}
