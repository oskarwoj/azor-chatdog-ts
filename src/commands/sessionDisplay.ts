import type { ChatHistory } from '../types.js';
import { printInfo, printUser, printAssistant } from '../cli/console.js';

/**
 * Displays the full session history.
 *
 * @param history - List of messages in the format {"role": "user|model", "parts": [{"text": "..."}]}
 * @param sessionId - Session ID
 * @param assistantName - Name of the assistant to display
 */
export function displayFullSession(
  history: ChatHistory,
  sessionId: string,
  assistantName: string
): void {
  if (!history || history.length === 0) {
    printInfo('Historia sesji jest pusta.');
    return;
  }

  printInfo(`\n--- PEŁNA HISTORIA SESJI (${sessionId}, ${history.length} wpisów) ---`);

  for (let i = 0; i < history.length; i++) {
    const content = history[i];

    // Handle universal dictionary format
    const role = content.role || '';
    const displayRole = role === 'user' ? 'TY' : assistantName;

    // Extract text from parts
    let text = '';
    if (content.parts && content.parts.length > 0) {
      text = content.parts[0].text || '';
    }

    // Display with appropriate function
    if (role === 'user') {
      printUser(`\n[${i + 1}] ${displayRole}:`);
      printUser(`${text}`);
    } else {
      printAssistant(`\n[${i + 1}] ${displayRole}:`);
      printAssistant(`${text}`);
    }
  }

  printInfo('--------------------------------------------------------');
}
