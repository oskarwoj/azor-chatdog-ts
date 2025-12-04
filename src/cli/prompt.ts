/**
 * Module for handling user input prompt.
 * Simplified version using @inquirer/prompts for TypeScript.
 */

import { input, search } from '@inquirer/prompts';
import chalk from 'chalk';

/**
 * Session choice type for search prompt.
 */
export interface SessionChoice {
	id: string;
	title?: string;
	messagesCount?: number;
	lastActivity?: string;
}

/**
 * Get user input with basic prompt features.
 *
 * @param promptText - The prompt text to display (default: "TY: ")
 * @returns The user's input, stripped of leading/trailing whitespace
 */
export async function getUserInput(
	promptText: string = 'TY: ',
): Promise<string> {
	try {
		const answer = await input({
			message: promptText,
			transformer: (value) => {
				// Highlight slash commands
				if (value.startsWith('/')) {
					return chalk.magenta(value);
				}
				return value;
			},
		});

		return answer.trim();
	} catch (error) {
		// Handle Ctrl+C (ExitPromptError) or Ctrl+D
		// Re-throw the error so it can be handled upstream
		if (error && typeof error === 'object') {
			// Check if it's an ExitPromptError (from @inquirer/prompts)
			const errorName = error.constructor?.name || (error as any).name;
			if (
				errorName === 'ExitPromptError' ||
				(errorName === 'Error' && 'message' in error)
			) {
				throw error;
			}
		}
		throw new Error('Input interrupted');
	}
}

/**
 * Interactive session search with autocomplete.
 * Allows users to search and select from available sessions by ID or title.
 *
 * @param sessions - List of available sessions
 * @param currentSessionId - ID of the current session (to exclude from list)
 * @returns Selected session ID, or null if cancelled
 */
export async function searchSession(
	sessions: SessionChoice[],
	currentSessionId?: string,
): Promise<string | null> {
	// Filter out current session
	const availableSessions = sessions.filter((s) => s.id !== currentSessionId);

	if (availableSessions.length === 0) {
		return null;
	}

	try {
		const selectedId = await search<string>({
			message: 'Wybierz sesję (wpisz by filtrować po ID lub tytule):',
			source: async (term) => {
				const searchTerm = (term || '').toLowerCase().trim();

				// Filter sessions based on search term
				const filtered = availableSessions.filter((session) => {
					if (!searchTerm) return true;
					const matchesId = session.id.toLowerCase().includes(searchTerm);
					const matchesTitle = session.title
						?.toLowerCase()
						.includes(searchTerm);
					return matchesId || matchesTitle;
				});

				// Sort: prioritize title matches, then by last activity
				return filtered.map((session) => {
					const shortId = session.id.substring(0, 8);
					const displayName = session.title
						? `${session.title} (${shortId}...)`
						: session.id;

					const description = [
						session.messagesCount !== undefined
							? `Wiadomości: ${session.messagesCount}`
							: null,
						session.lastActivity
							? `Ostatnia aktywność: ${session.lastActivity}`
							: null,
					]
						.filter(Boolean)
						.join(' | ');

					return {
						name: displayName,
						value: session.id,
						description: description || undefined,
					};
				});
			},
			pageSize: 10,
			theme: {
				style: {
					highlight: (text: string) => chalk.cyan(text),
					description: (text: string) => chalk.dim(text),
				},
			},
		});

		return selectedId;
	} catch (error) {
		// Handle Ctrl+C or escape - return null to indicate cancellation
		if (error && typeof error === 'object') {
			const errorName = error.constructor?.name || (error as any).name;
			if (errorName === 'ExitPromptError') {
				return null;
			}
		}
		throw error;
	}
}
