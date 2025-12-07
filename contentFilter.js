import axios from 'axios';

// Local swear word lists for English and Hindi
const englishSwearWords = [
  'damn', 'dammit', 'crap', 'ass', 'asshole', 'bastard', 'bitch', 'bitches',
  'bullshit', 'hell', 'piss', 'shit', 'shitty', 'fuck', 'fucking', 'fucker',
  'motherfucker', 'dick', 'dickhead', 'pussy', 'cock', 'whore', 'slut',
  'twat', 'cunt', 'arsehole', 'arse', 'bollocks', 'bugger', 'sod'
];

const hindiSwearWords = [
  'बकवास', 'गंदा', 'गाली', 'साला', 'बहनचोद', 'सुअर', 'कमीना', 'नीच',
  'भोसड़ी', 'हरामी', 'मादरचोद', 'चूतिया', 'लंड', 'लुंड', 'बाल', 'गांड',
  'अंग्रेजी', 'धिक्कार', 'पापी', 'दानव', 'चिंतन', 'शैतान', 'गंदी', 'घटिया'
];

// Combined list with regex patterns for case-insensitive matching
const censoredWords = [
  ...englishSwearWords,
  ...hindiSwearWords
];

/**
 * Censor inappropriate words in text - handles spaces, special chars, numbers
 * @param {string} text - The text to filter
 * @returns {string} - Filtered text with censored words replaced with ******
 */
export function censorText(text) {
  let censoredText = text;

  // Censor each word (case-insensitive for English)
  censoredWords.forEach((word) => {
    // Create flexible regex that matches word with optional spaces/special chars between letters
    // e.g., "s h i t" matches "shit", "s.h.i.t", "s-h-i-t", etc.
    const letters = word.split('').join('[\\s\\-_\\.\\*]*');
    const regex = new RegExp(letters, 'gi');
    censoredText = censoredText.replace(regex, '***');
  });

  return censoredText;
}

/**
 * Use Gemini API to detect and flag inappropriate content
 * @param {string} text - The text to analyze
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<{isInappropriate: boolean, reason: string, censoredText: string}>}
 */
export async function detectInappropriateContent(text, apiKey) {
  try {
    // First apply local censorship
    let censoredText = censorText(text);

    // Use Gemini API for deeper content analysis (always prioritize this)
    if (apiKey) {
      const prompt = `You are a content moderation AI. Analyze the following text for inappropriate, offensive, or abusive content.

Consider:
- Swear words or profanity in ANY language (English or Hindi), even if split with spaces, special characters, or numbers (e.g., "a s s", "a$$", "4ss", "शित")
- Hate speech
- Harassment or bullying language
- Offensive slurs or derogatory terms
- Vulgar or sexually explicit content
- Intentional misspellings or obfuscations of curse words

Text to analyze: "${text}"

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "isInappropriate": true/false,
  "reason": "brief explanation or 'none'",
  "swearWordsFound": ["list", "of", "detected", "swear", "words"]
}`;

      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              topK: 1,
              topP: 1,
              maxOutputTokens: 500
            }
          },
          {
            timeout: 10000 // 10 second timeout
          }
        );

        // Parse Gemini response
        const responseText = response.data.candidates[0].content.parts[0].text;
        
        // Clean the response (remove markdown code blocks if present)
        const cleanedResponse = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        const analysis = JSON.parse(cleanedResponse);

        if (analysis.isInappropriate) {
          // Apply local censorship as primary method
          let finalText = censorText(text);

          // If no local words were censored but Gemini flagged it, 
          // try to identify and censor using the detected words from Gemini
          if (finalText === text && analysis.swearWordsFound && Array.isArray(analysis.swearWordsFound)) {
            analysis.swearWordsFound.forEach((word) => {
              // Replace word with *** (case-insensitive)
              const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              finalText = finalText.replace(regex, '***');
            });
          }

          console.log(`[CONTENT FILTER] Flagged: "${text}" → "${finalText}"`);

          return {
            isInappropriate: true,
            reason: analysis.reason || 'Contains inappropriate content',
            censoredText: finalText
          };
        }

        return {
          isInappropriate: false,
          reason: 'none',
          censoredText: text
        };
      } catch (apiError) {
        console.error('Gemini API error:', apiError.message);
        // Fallback to local censorship if API fails
        return {
          isInappropriate: false,
          reason: 'API error - local filter applied',
          censoredText: censoredText !== text ? censoredText : text
        };
      }
    }

    // If no API key, use local censorship only
    if (censoredText !== text) {
      return {
        isInappropriate: true,
        reason: 'Contains censored swear words',
        censoredText
      };
    }

    return {
      isInappropriate: false,
      reason: 'Passed local filter',
      censoredText
    };
  } catch (error) {
    console.error('Error in content analysis:', error.message);
    // Fallback: use local censorship on unexpected error
    return {
      isInappropriate: false,
      reason: 'Error occurred - local filter applied',
      censoredText: censorText(text)
    };
  }
}

/**
 * Check if text contains swear words without API
 * @param {string} text - The text to check
 * @returns {boolean} - True if swear words found
 */
export function containsSwearWords(text) {
  const lowerText = text.toLowerCase();
  return censoredWords.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`);
    return regex.test(lowerText);
  });
}

export default {
  censorText,
  detectInappropriateContent,
  containsSwearWords
};
