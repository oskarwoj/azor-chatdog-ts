import { createAssistant } from '../assistant/assistants.js';
import {
	displayFinalInstructions,
	displayHelp,
	printError,
	printInfo,
} from '../cli/console.js';
import { removeSessionFile } from '../files/sessionFiles.js';
import { mcpClient } from '../mcp/client.js';
import { ChatSession } from './chatSession.js';

/**
 * Orchestrates session lifecycle and manages the current active session.
 * Provides high-level operations for session management.
 */
export class SessionManager {
	private _currentSession: ChatSession | null = null;

	/**
	 * Returns the current active session.
	 */
	getCurrentSession(): ChatSession {
		if (!this._currentSession) {
			throw new Error(
				'No active session. Call createNewSession() or switchToSession() first.',
			);
		}
		return this._currentSession;
	}

	/**
	 * Returns True if there's an active session.
	 */
	hasActiveSession(): boolean {
		return this._currentSession !== null;
	}

	/**
	 * Creates a new session, optionally saving the current one.
	 *
	 * @returns [new_session, save_attempted, previous_session_id, save_error]
	 */
	async createNewSession(
		saveCurrent: boolean = true,
	): Promise<[ChatSession, boolean, string | null, string | null]> {
		let saveAttempted = false;
		let previousSessionId: string | null = null;
		let saveError: string | null = null;

		// Save current session if requested
		if (saveCurrent && this._currentSession) {
			saveAttempted = true;
			previousSessionId = this._currentSession.getSessionId();
			const [success, error] = await this._currentSession.saveToFile();
			if (!success) {
				saveError = error;
			}
		}

		// Create new session
		const assistant = createAssistant('azor');
		const newSession = new ChatSession(assistant);
		await newSession.initialize();
		this._currentSession = newSession;

		return [newSession, saveAttempted, previousSessionId, saveError];
	}

	/**
	 * Switches to an existing session by ID.
	 * Saves current session before switching.
	 *
	 * @returns [new_session, save_attempted, previous_session_id, load_successful, load_error, has_history]
	 */
	async switchToSession(
		sessionId: string,
	): Promise<
		[
			ChatSession | null,
			boolean,
			string | null,
			boolean,
			string | null,
			boolean,
		]
	> {
		let saveAttempted = false;
		let previousSessionId: string | null = null;

		// Save current session
		if (this._currentSession) {
			saveAttempted = true;
			previousSessionId = this._currentSession.getSessionId();
			const [success, error] = await this._currentSession.saveToFile();
			if (!success && error) {
				printError(
					`Warning: Failed to save current session before switching: ${error}`,
				);
			}
		}

		// Load new session
		const assistant = createAssistant('azor');
		const [newSession, error] = await ChatSession.loadFromFile(
			assistant,
			sessionId,
		);

		if (error) {
			// Failed to load - don't change current session
			return [null, saveAttempted, previousSessionId, false, error, false];
		}

		if (!newSession) {
			return [
				null,
				saveAttempted,
				previousSessionId,
				false,
				'Failed to load session',
				false,
			];
		}

		// Successfully loaded - update current session
		this._currentSession = newSession;
		const hasHistory = !newSession.isEmpty();

		return [
			newSession,
			saveAttempted,
			previousSessionId,
			true,
			null,
			hasHistory,
		];
	}

	/**
	 * Removes the current session file and immediately creates a new, empty session.
	 *
	 * @returns [new_session, removed_session_id, remove_successful, remove_error]
	 */
	async removeCurrentSessionAndCreateNew(): Promise<
		[ChatSession, string, boolean, string | null]
	> {
		if (!this._currentSession) {
			throw new Error('No session is active to remove.');
		}

		const removedSessionId = this._currentSession.getSessionId();

		// Remove the session file
		const [removeSuccess, removeError] = removeSessionFile(removedSessionId);

		// Create a new session regardless of whether the file was successfully removed
		const assistant = createAssistant('azor');
		const newSession = new ChatSession(assistant);
		await newSession.initialize();
		this._currentSession = newSession;

		return [newSession, removedSessionId, removeSuccess, removeError];
	}

	/**
	 * Switches the current session to a different assistant.
	 * Preserves the conversation history with the new assistant's personality.
	 *
	 * @param assistantId - ID of the assistant to switch to
	 */
	async switchAssistantInCurrentSession(assistantId: string): Promise<void> {
		if (!this._currentSession) {
			throw new Error('No session is active. Cannot switch assistant.');
		}

		const newAssistant = createAssistant(assistantId);
		await this._currentSession.switchAssistant(newAssistant);
	}

	/**
	 * Initializes a session based on CLI arguments.
	 * Either loads an existing session or creates a new one.
	 */
	async initializeFromCLI(cliSessionId: string | null): Promise<ChatSession> {
		if (cliSessionId) {
			const assistant = createAssistant('azor');
			const [session, error] = await ChatSession.loadFromFile(
				assistant,
				cliSessionId,
			);

			if (error || !session) {
				printError(error || 'Failed to load session');
				// Fallback to new session
				const newSession = new ChatSession(assistant);
				await newSession.initialize();
				this._currentSession = newSession;
				printInfo(`Rozpoczęto nową sesję z ID: ${newSession.getSessionId()}`);
			} else {
				this._currentSession = session;
			}

			const currentSession = this._currentSession;
			displayHelp(currentSession.getSessionId());
			if (!currentSession.isEmpty()) {
				const { displayHistorySummary } = await import(
					'../commands/sessionSummary.js'
				);
				displayHistorySummary(
					await currentSession.getHistory(),
					currentSession.assistantName,
				);
			}
		} else {
			console.log('Rozpoczynanie nowej sesji.');
			const assistant = createAssistant('azor');
			const session = new ChatSession(assistant);
			await session.initialize();
			this._currentSession = session;
			displayHelp(session.getSessionId());
		}

		return this._currentSession;
	}

	/**
	 * Cleanup method to be called on program exit.
	 * Saves the current session if it has content and disconnects MCP client.
	 */
	async cleanupAndSave(): Promise<void> {
		// Disconnect MCP client
		try {
			await mcpClient.disconnect();
		} catch {
			// Ignore MCP disconnect errors on cleanup
		}

		if (!this._currentSession) {
			return;
		}

		const session = this._currentSession;

		if (session.isEmpty()) {
			printInfo('\nSesja jest pusta/niekompletna. Pominięto finalny zapis.');
		} else {
			printInfo(`\nFinalny zapis historii sesji: ${session.getSessionId()}`);
			await session.saveToFile();
			displayFinalInstructions(session.getSessionId());
		}
	}
}
