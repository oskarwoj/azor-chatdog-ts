import type { ChatHistory } from '../types.js';
import { printInfo, printUser, printAssistant } from '../cli/console.js';

/**
 * Displays history summary: count of omitted messages and the last 2 messages.
 *
 * @param history - List of messages in the format {"role": "user|model", "parts": [{"text": "..."}]}
 * @param assistantName - Name of the assistant to display
 */
export function displayHistorySummary(history: ChatHistory, assistantName: string): void {
  const totalCount = history.length;

  if (totalCount === 0) {
    return;
  }

  // Display summary
  if (totalCount > 2) {
    printInfo('\n--- Wątek sesji wznowiony ---');
    const omittedCount = totalCount - 2;
    printInfo(`(Pominięto ${omittedCount} wcześniejszych wiadomości)`);
  } else {
    printInfo('\n--- Wątek sesji ---');
  }

  // Display last 2 messages
  const lastTwo = history.slice(-2);

  for (const content of lastTwo) {
    // Handle universal dictionary format
    const role = content.role || '';
    const displayRole = role === 'user' ? 'TY' : assistantName;

    // Extract text from parts
    let text = '';
    if (content.parts && content.parts.length > 0) {
      text = content.parts[0].text || '';
    }

    if (role === 'user') {
      printUser(`  ${displayRole}: ${text.substring(0, 80)}...`);
    } else if (role === 'model') {
      printAssistant(`  ${displayRole}: ${text.substring(0, 80)}...`);
    }
  }

  printInfo('----------------------------');
}
