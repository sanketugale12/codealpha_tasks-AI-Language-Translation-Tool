import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Define the response schema for Gemini Translation
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    translatedText: {
      type: Type.STRING,
      description: "The primary high-quality translation of the text into the target language.",
    },
    detectedLanguageCode: {
      type: Type.STRING,
      description: "The 2-letter ISO 639-1 code of the detected source language (e.g., 'es', 'fr', 'en').",
    },
    detectedLanguageName: {
      type: Type.STRING,
      description: "The English name of the detected source language (e.g., 'Spanish', 'French', 'English').",
    },
    pronunciationGuide: {
      type: Type.STRING,
      description: "A phonetical reading/pronunciation guide for the translated text, suitable for non-native speakers (e.g., 'grah-see-ahs' for 'gracias').",
    },
    alternatives: {
      type: Type.OBJECT,
      properties: {
        formal: {
          type: Type.STRING,
          description: "A formal/polite translation alternative.",
        },
        informal: {
          type: Type.STRING,
          description: "An informal/casual translation alternative.",
        },
        creative: {
          type: Type.STRING,
          description: "A poetic, expressive, or idiomatic translation alternative.",
        }
      },
      required: ["formal", "informal", "creative"]
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: "Confidence score of the translation and language detection between 0.0 and 1.0.",
    },
    explanation: {
      type: Type.STRING,
      description: "An optional very brief cultural note, grammatical nuance, or tip about this translation (max 1-2 sentences).",
    }
  },
  required: [
    "translatedText",
    "detectedLanguageCode",
    "detectedLanguageName",
    "pronunciationGuide",
    "alternatives",
    "confidenceScore"
  ]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // In-memory simple cache for translations
  const cache = new Map<string, any>();

  // API endpoint for translation
  app.post("/api/translate", async (req: express.Request, res: express.Response) => {
    try {
      const { text, sourceLang, targetLang } = req.body;

      if (!text || typeof text !== "string" || text.trim() === "") {
        return res.status(400).json({ error: "Text is required for translation" });
      }

      if (text.length > 5000) {
        return res.status(400).json({ error: "Text exceeds the 5000 character limit" });
      }

      if (!targetLang) {
        return res.status(400).json({ error: "Target language is required" });
      }

      // Check cache
      const cacheKey = `${text.trim()}:${sourceLang || "auto"}:${targetLang}`;
      if (cache.has(cacheKey)) {
        return res.json({ ...cache.get(cacheKey), cached: true });
      }

      const ai = getGeminiClient();

      const translationPrompt = `Translate the following text.
Input Text: "${text}"
Requested Source Language: "${sourceLang || "auto"}"
Target Language: "${targetLang}"

Provide a highly accurate translation, language detection, pronunciation guide, alternative translations, and confidence score. Ensure response strictly adheres to the requested JSON schema.`;

      // Helper function to handle fallback models and exponential backoff
      const response = await generateContentWithRetry(
        ai,
        {
          contents: translationPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            systemInstruction: "You are an expert multilingual translation engine. Your task is to detect the source language accurately (if auto-detect is specified), translate the input text precisely to the target language, generate a helpful pronunciation guide for the output, offer stylistic alternatives (formal, informal, and creative), assess your confidence, and optionally provide a tiny cultural or grammatical tip. Always return valid JSON matching the schema.",
          },
        },
        ["gemini-3.5-flash", "gemini-2.5-flash"]
      );

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini Translation Engine");
      }

      const result = JSON.parse(responseText.trim());
      
      // Store in cache
      cache.set(cacheKey, result);

      // Simple cache eviction if too large
      if (cache.size > 1000) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }

      return res.json({ ...result, cached: false });
    } catch (error: any) {
      console.error("Translation API error:", error);
      return res.status(500).json({
        error: error?.message || "An unexpected error occurred during translation"
      });
    }
  });

  // Serve static files and handle routing in production, or mount Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Helper function to handle fallback models and exponential backoff timing for high reliability
async function generateContentWithRetry(ai: any, options: any, modelsToTry: string[] = ["gemini-3.5-flash", "gemini-2.5-flash"]) {
  let lastError: any = null;
  
  for (const modelName of modelsToTry) {
    let delay = 1000; // start with 1 second delay
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Translation] Attempting model "${modelName}" (Attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          ...options,
          model: modelName,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errString = String(err?.message || err || "").toLowerCase();
        const isTransient = errString.includes("503") || 
                            errString.includes("unavailable") || 
                            errString.includes("high demand") || 
                            errString.includes("spikes in demand") ||
                            errString.includes("rate limit") ||
                            errString.includes("resource exhausted") ||
                            errString.includes("429");
                            
        if (isTransient && attempt < maxRetries) {
          console.warn(`[Translation] Transient error detected: ${err?.message || err}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5; // exponential backoff multiplier
        } else {
          console.error(`[Translation] Failed with model "${modelName}" on attempt ${attempt}. Error:`, err?.message || err);
          break; // move on to the next model or stop
        }
      }
    }
  }
  
  throw lastError || new Error("Failed to translate text after trying multiple backup models and retry attempts due to API demand.");
}

// Lazy initialization of Gemini to prevent startup crash if API key is missing
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please add your Gemini API Key in the Settings > Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

startServer();
