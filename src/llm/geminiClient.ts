/**
 * Google Gemini LLM Client Implementation
 * Encapsulates all Google Gemini AI interactions.
 */

import {
	ChatSession,
	GenerativeModel,
	GoogleGenerativeAI,
} from '@google/generative-ai';
import { config } from 'dotenv';
import { printError } from '../cli/console.js';
import type { ChatHistory, LLMResponse } from '../types.js';
import {
	chatHistoryToGeminiContent,
	geminiContentToChatHistory,
} from '../utils/messageConverter.js';
import { GeminiConfigSchema } from './geminiValidation.js';

/**
 * Wrapper for Gemini chat session that provides universal dictionary-based history format.
 */
export class GeminiChatSessionWrapper {
	private geminiSession: ChatSession;

	constructor(geminiSession: ChatSession) {
		this.geminiSession = geminiSession;
	}

	/**
	 * Forwards message to Gemini session.
	 */
	async sendMessage(text: string): Promise<LLMResponse> {
		const result = await this.geminiSession.sendMessage(text);
		const response = result.response;
		return {
			text: response.text(),
			tokensUsed: response.usageMetadata?.totalTokenCount,
		};
	}

	/**
	 * Gets conversation history in universal dictionary format.
	 */
	async getHistory(): Promise<ChatHistory> {
		const geminiHistory = await this.geminiSession.getHistory();
		return geminiContentToChatHistory(geminiHistory);
	}
}

/**
 * Encapsulates all Google Gemini AI interactions.
 */
export class GeminiLLMClient {
	private modelName: string;
	private apiKey: string;
	private client: GoogleGenerativeAI;
	private model: GenerativeModel;

	constructor(modelName: string, apiKey: string) {
		if (!apiKey) {
			throw new Error('API key cannot be empty or None');
		}

		this.modelName = modelName;
		this.apiKey = apiKey;
		this.client = this.initializeClient();
		this.model = this.client.getGenerativeModel({ model: this.modelName });
	}

	/**
	 * Returns a message indicating that Gemini client is being prepared.
	 */
	static preparingForUseMessage(): string {
		return '🤖 Przygotowywanie klienta Gemini...';
	}

	/**
	 * Factory method that creates a GeminiLLMClient instance from environment variables.
	 */
	static fromEnvironment(): GeminiLLMClient {
		config();

		// Validation with Zod
		const configData = GeminiConfigSchema.parse({
			engine: 'GEMINI',
			modelName: process.env.MODEL_NAME || 'gemini-2.0-flash',
			geminiApiKey: process.env.GEMINI_API_KEY || '',
		});

		return new GeminiLLMClient(configData.modelName, configData.geminiApiKey);
	}

	/**
	 * Initializes the Google GenAI client.
	 */
	private initializeClient(): GoogleGenerativeAI {
		try {
			return new GoogleGenerativeAI(this.apiKey);
		} catch (error) {
			printError(`Błąd inicjalizacji klienta Gemini: ${error}`);
			process.exit(1);
		}
	}

	/**
	 * Creates a new chat session with the specified configuration.
	 */
	createChatSession(
		systemInstruction: string,
		history?: ChatHistory,
		_thinkingBudget: number = 0,
	): GeminiChatSessionWrapper {
		if (!this.model) {
			throw new Error('LLM client not initialized');
		}

		// Convert universal dict format to Gemini Content objects
		const geminiHistory = history ? chatHistoryToGeminiContent(history) : [];

		// Create generative model with system instruction
		const modelWithConfig = this.client.getGenerativeModel({
			model: this.modelName,
			systemInstruction: systemInstruction,
		});

		const geminiSession = modelWithConfig.startChat({
			history: geminiHistory,
		});

		return new GeminiChatSessionWrapper(geminiSession);
	}

	/**
	 * Counts tokens for the given conversation history.
	 */
	async countHistoryTokens(history: ChatHistory): Promise<number> {
		if (!history || history.length === 0) {
			return 0;
		}

		try {
			// Convert universal dict format to Gemini Content objects
			const geminiHistory = chatHistoryToGeminiContent(history);

			const result = await this.model.countTokens({ contents: geminiHistory });
			return result.totalTokens;
		} catch (error) {
			printError(`Błąd podczas liczenia tokenów: ${error}`);
			return 0;
		}
	}

	/**
	 * Returns the currently configured model name.
	 */
	getModelName(): string {
		return this.modelName;
	}

	/**
	 * Checks if the LLM service is available and properly configured.
	 */
	isAvailable(): boolean {
		return this.client !== null && !!this.apiKey;
	}

	/**
	 * Returns a ready-to-use message with model info and masked API key.
	 */
	readyForUseMessage(): string {
		// Mask API key - show first 4 and last 4 characters
		let maskedKey: string;
		if (this.apiKey.length <= 8) {
			maskedKey = '****';
		} else {
			maskedKey = `${this.apiKey.slice(0, 4)}...${this.apiKey.slice(-4)}`;
		}

		return `✅ Klient Gemini gotowy do użycia (Model: ${this.modelName}, Key: ${maskedKey})`;
	}
}
