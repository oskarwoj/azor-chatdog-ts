import type { ChatHistory } from '../types.js';
import { printInfo, printError } from '../cli/console.js';
import say from 'say';

/**
 * Maps language codes to voice names for macOS say command.
 * Add more mappings as needed.
 */
const LANGUAGE_VOICE_MAP: Record<string, string | null> = {
  'pl-PL': 'Zosia', // Polish voice on macOS
  'en-US': 'Samantha', // US English voice on macOS
  'en-GB': 'Daniel', // UK English voice on macOS
  'es-ES': 'Monica', // Spanish voice on macOS
  'fr-FR': 'Thomas', // French voice on macOS
  'de-DE': 'Anna', // German voice on macOS
};

/**
 * Generates audio from the last assistant message using text-to-speech.
 * @param history - The chat history
 * @param sessionId - The current session ID (unused but kept for consistency)
 * @param assistantName - The assistant name (unused but kept for consistency)
 * @param language - Optional language/voice code (e.g., 'pl-PL', 'en-US', or direct voice name like 'Zosia')
 */
export async function generateAudioFromLastMessage(
  history: ChatHistory,
  sessionId: string,
  assistantName: string,
  language: string = 'pl-PL'
): Promise<void> {
  if (!history || history.length === 0) {
    printInfo('Historia sesji jest pusta. Brak wiadomości do odczytania.');
    return;
  }

  // Find last assistant message
  const lastAssistantMessage = history
    .slice()
    .reverse()
    .find((msg) => msg.role === 'model');

  if (!lastAssistantMessage) {
    printError('Nie znaleziono wiadomości asystenta do odczytania.');
    return;
  }

  const text = lastAssistantMessage.parts[0].text;

  if (!text || text.trim().length === 0) {
    printError('Ostatnia wiadomość asystenta jest pusta.');
    return;
  }

  // Map language code to voice name, or use the input as voice name directly
  const voice = LANGUAGE_VOICE_MAP[language] || language;

  try {
    printInfo(`Odtwarzanie audio${voice !== language ? ` (${language} -> ${voice})` : ` (głos: ${voice})`}...`);

    // Use say.speak() to play the text
    // Signature: say.speak(text, voice, speed, callback)
    await new Promise<void>((resolve, reject) => {
      say.speak(text, voice || undefined, undefined, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    printInfo('Audio zakończone.');
  } catch (error) {
    printError(`Nie udało się odtworzyć audio: ${error}`);
  }
}
