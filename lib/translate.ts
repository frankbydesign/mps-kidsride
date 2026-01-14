import Anthropic from '@anthropic-ai/sdk';

/**
 * Get or create Anthropic client instance
 */
function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
  });
}

/**
 * Detect the language of a text message
 */
export async function detectLanguage(text: string): Promise<string> {
  try {
    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `Detect the language of this text and respond with ONLY the ISO 639-1 language code (e.g., "en" for English, "es" for Spanish, "so" for Somali, "ar" for Arabic). Text: "${text}"`
        }
      ]
    });

    const response = message.content[0];
    if (response.type === 'text') {
      const languageCode = response.text.trim().toLowerCase();
      // Return the detected language code, default to 'en' if unclear
      return languageCode.match(/^[a-z]{2}$/) ? languageCode : 'en';
    }

    return 'en';
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en'; // Default to English on error
  }
}

/**
 * Translate text between languages
 */
export async function translateMessage(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  try {
    // Skip translation if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    const languageNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      so: 'Somali',
      ar: 'Arabic',
      fr: 'French',
      de: 'German',
      zh: 'Chinese',
      hi: 'Hindi',
      pt: 'Portuguese',
      ru: 'Russian',
      ja: 'Japanese',
      ko: 'Korean',
      vi: 'Vietnamese',
      th: 'Thai',
      tr: 'Turkish',
      pl: 'Polish',
      it: 'Italian',
      nl: 'Dutch',
      sv: 'Swedish',
      da: 'Danish',
      no: 'Norwegian',
      fi: 'Finnish'
    };

    const sourceName = languageNames[sourceLanguage] || sourceLanguage;
    const targetName = languageNames[targetLanguage] || targetLanguage;

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Translate this text from ${sourceName} to ${targetName}. Respond with ONLY the translated text, no explanations or additional context. Text to translate: "${text}"`
        }
      ]
    });

    const response = message.content[0];
    if (response.type === 'text') {
      return response.text.trim();
    }

    return text; // Return original if translation fails
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

/**
 * Detect language and translate in one call (optimization for common use case)
 */
export async function detectAndTranslate(
  text: string,
  targetLanguage: string = 'en'
): Promise<{ detectedLanguage: string; translatedText: string }> {
  const detectedLanguage = await detectLanguage(text);

  if (detectedLanguage === targetLanguage) {
    return {
      detectedLanguage,
      translatedText: text
    };
  }

  const translatedText = await translateMessage(text, detectedLanguage, targetLanguage);

  return {
    detectedLanguage,
    translatedText
  };
}
