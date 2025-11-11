/**
 * Module for handling user input prompt.
 * Simplified version using @inquirer/prompts for TypeScript.
 */

import { input } from '@inquirer/prompts';
import chalk from 'chalk';

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
