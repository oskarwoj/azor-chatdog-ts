/**
 * Message format conversion utilities
 * Provides conversions between universal ChatHistory format and provider-specific formats.
 */

import type { Content } from '@google/generative-ai';
import type { ChatHistory, Message } from '../types.js';

/**
 * Converts universal ChatHistory format to Gemini Content format.
 * @param history - The conversation history in universal format
 * @returns Array of Gemini Content objects
 */
export function chatHistoryToGeminiContent(history: ChatHistory): Content[] {
  const geminiHistory: Content[] = [];

  for (const entry of history) {
    const text = entry.parts[0]?.text || '';
    if (text) {
      geminiHistory.push({
        role: entry.role,
        parts: [{ text }]
      });
    }
  }

  return geminiHistory;
}

/**
 * Converts Gemini Content format to universal ChatHistory format.
 * @param contents - Array of Gemini Content objects
 * @returns Conversation history in universal format
 */
export function geminiContentToChatHistory(contents: Content[]): ChatHistory {
  const universalHistory: ChatHistory = [];

  for (const content of contents) {
    let textPart = '';
    if (content.parts && content.parts.length > 0) {
      for (const part of content.parts) {
        if ('text' in part && part.text) {
          textPart = part.text;
          break;
        }
      }
    }

    if (textPart) {
      const universalContent: Message = {
        role: content.role as 'user' | 'model',
        parts: [{ text: textPart }]
      };
      universalHistory.push(universalContent);
    }
  }

  return universalHistory;
}
