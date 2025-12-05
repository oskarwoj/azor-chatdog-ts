import { printAssistant, printInfo, printUser } from '../cli/console.js';
import type { ChatHistory } from '../types.js';

/**
 * Displays history summary: count of omitted messages and the last 2 messages.
 *
 * @param history - List of messages in the format {"role": "user|model", "parts": [{"text": "..."}]}
 * @param assistantName - Name of the assistant to display
 */
export function displayHistorySummary(
	history: ChatHistory,
	assistantName: string,
): void {
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
	const maxLength = 80;

	for (const content of lastTwo) {
		// Handle universal dictionary format
		const role = content.role || '';
		const displayRole = role === 'user' ? 'TY' : assistantName;

		// Extract text from parts
		let text = '';
		if (content.parts && content.parts.length > 0) {
			text = content.parts[0].text || '';
		}

		// Only add ellipsis if text was actually truncated
		const displayText =
			text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

		if (role === 'user') {
			printUser(`  ${displayRole}: ${displayText}`);
		} else if (role === 'model') {
			printAssistant(`  ${displayRole}: ${displayText}`);
		}
	}

	printInfo('----------------------------');
}
