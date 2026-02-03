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
          content: `Detect the language of this text and respond with ONLY the ISO language code. Use 2-letter ISO 639-1 codes when available (es, ar, zh), or 3-letter ISO 639-3 codes for languages without a 2-letter code (hmn for Hmong, kar for Karen). Do not include quotes, punctuation, or explanations. Examples: en for English, es for Spanish, so for Somali, ar for Arabic, hmn for Hmong. Text: "${text}"`
        }
      ]
    });

    const response = message.content[0];
    if (response.type === 'text') {
      // Clean the response: trim, lowercase, remove quotes and common punctuation
      const languageCode = response.text
        .trim()
        .toLowerCase()
        .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
        .replace(/[.,;:!?]/g, '');    // Remove punctuation

      console.log(`Language detection raw response: "${response.text}" -> cleaned: "${languageCode}"`);

      // Validate it's a proper 2 or 3-letter code
      if (languageCode.match(/^[a-z]{2,3}$/)) {
        return languageCode;
      }

      // Log warning if validation failed
      console.warn(`Language detection returned invalid code: "${response.text}" (cleaned: "${languageCode}"), defaulting to 'en'`);
      return 'en';
    }

    console.warn('Language detection response was not text type, defaulting to en');
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
