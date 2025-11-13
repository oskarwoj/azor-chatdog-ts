/**
 * Title generation utilities for chat sessions.
 * Generates short, descriptive titles from user prompts using LLM with keyword fallback.
 */

import type { GeminiLLMClient } from '../llm/geminiClient.js';
import type { LlamaClient } from '../llm/llamaClient.js';
import type { OllamaClient } from '../llm/ollamaClient.js';
import { printWarning } from '../cli/console.js';

/**
 * Generates a short title by extracting keywords from the prompt.
 * This is the fallback method when LLM generation fails.
 *
 * @param prompt - The user's first message
 * @returns A truncated title (max 50 chars)
 */
function generateTitleFromKeywords(prompt: string): string {
  const maxLength = 50;
  const cleanedPrompt = prompt.trim().replace(/\s+/g, ' ');

  if (cleanedPrompt.length <= maxLength) {
    return cleanedPrompt;
  }

  // Truncate at word boundary
  const truncated = cleanedPrompt.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }

  return truncated + '...';
}

/**
 * Generates a title using the LLM by sending a meta-prompt.
 *
 * @param prompt - The user's first message
 * @param llmClient - The LLM client instance
 * @returns Promise<string | null> - Generated title or null if failed
 */
async function generateTitleWithLLM(
  prompt: string,
  llmClient: GeminiLLMClient | LlamaClient | OllamaClient
): Promise<string | null> {
  try {
    // Create a temporary chat session for title generation
    const metaPrompt = `Stwórz krótki, opisowy tytuł (3-6 słów) dla konwersacji rozpoczynającej się od tego zapytania: "${prompt}". Odpowiedz TYLKO tytułem, bez dodatkowych wyjaśnień, cudzysłowów ani znaków interpunkcyjnych na końcu.`;

    const tempSession = await llmClient.createChatSession(
      'Jesteś asystentem tworzącym tytuły dla konwersacji.',
      [],
      0
    );

    const response = await tempSession.sendMessage(metaPrompt);

    // Clean up the response (remove quotes, extra whitespace, etc.)
    let title = response.text.trim();
    title = title.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    title = title.replace(/\.$/, ''); // Remove trailing period

    // Validate title length (should be reasonable)
    if (title.length > 0 && title.length <= 100) {
      return title;
    }

    return null;
  } catch (error) {
    printWarning(`Nie udało się wygenerować tytułu za pomocą LLM: ${error}`);
    return null;
  }
}

/**
 * Generates a descriptive title from the user's first prompt.
 * First attempts to use LLM generation, then falls back to keyword extraction.
 *
 * @param prompt - The user's first message
 * @param llmClient - The LLM client instance
 * @returns Promise<string> - Generated title (always returns a valid title)
 */
export async function generateTitleFromPrompt(
  prompt: string,
  llmClient: GeminiLLMClient | LlamaClient | OllamaClient
): Promise<string> {
  // Try LLM generation first
  const llmTitle = await generateTitleWithLLM(prompt, llmClient);

  if (llmTitle) {
    return llmTitle;
  }

  // Fall back to keyword extraction
  return generateTitleFromKeywords(prompt);
}
