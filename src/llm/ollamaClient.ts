/**
 * Ollama LLM Client Implementation
 * Encapsulates all Ollama API interactions via REST endpoint.
 */

import { config } from 'dotenv';
import { printError, printInfo } from '../cli/console.js';
import type { ChatHistory, LLMResponse, Message } from '../types.js';
import { OllamaConfigSchema } from './ollamaValidation.js';

/**
 * Ollama message format for API requests
 */
interface OllamaMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

/**
 * Ollama API chat response
 */
interface OllamaChatResponse {
	model: string;
	created_at: string;
	message: {
		role: string;
		content: string;
	};
	done: boolean;
	total_duration?: number;
	load_duration?: number;
	prompt_eval_count?: number;
	eval_count?: number;
}

/**
 * Sampling parameters for model generation
 */
interface SamplingParams {
	temperature: number;
	top_p: number;
	top_k: number;
}

/**
 * Wrapper class that provides a chat session interface compatible with Gemini's interface.
 */
export class OllamaChatSession {
	private baseUrl: string;
	private modelName: string;
	private timeout: number;
	private _history: ChatHistory;
	private systemInstruction: string;
	private samplingParams: SamplingParams;

	constructor(
		baseUrl: string,
		modelName: string,
		timeout: number,
		systemInstruction: string,
		samplingParams: SamplingParams,
		history: ChatHistory = [],
	) {
		this.baseUrl = baseUrl;
		this.modelName = modelName;
		this.timeout = timeout;
		this.systemInstruction = systemInstruction;
		this.samplingParams = samplingParams;
		this._history = history;
	}

	/**
	 * Converts internal ChatHistory format to Ollama message format.
	 */
	private convertToOllamaMessages(): OllamaMessage[] {
		const messages: OllamaMessage[] = [];

		// Add system message first
		if (this.systemInstruction) {
			messages.push({
				role: 'system',
				content: this.systemInstruction,
			});
		}

		// Convert history
		for (const msg of this._history) {
			messages.push({
				role: msg.role === 'model' ? 'assistant' : 'user',
				content: msg.parts[0]?.text || '',
			});
		}

		return messages;
	}

	/**
	 * Sends a message to the Ollama model and returns a response object.
	 */
	async sendMessage(text: string): Promise<LLMResponse> {
		// Add user message to history
		const userMessage: Message = { role: 'user', parts: [{ text }] };
		this._history.push(userMessage);

		try {
			// Prepare messages for Ollama API
			const messages = this.convertToOllamaMessages();

			// Make API request to Ollama
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await fetch(`${this.baseUrl}/api/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.modelName,
					messages: messages,
					stream: false,
					options: {
						temperature: this.samplingParams.temperature,
						top_p: this.samplingParams.top_p,
						top_k: this.samplingParams.top_k,
					},
				}),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`,
				);
			}

			const data = (await response.json()) as OllamaChatResponse;
			const responseText = data.message.content;

			// Add assistant response to history
			const assistantMessage: Message = {
				role: 'model',
				parts: [{ text: responseText }],
			};
			this._history.push(assistantMessage);

			// Calculate approximate token count (prompt_eval_count + eval_count)
			const tokensUsed = (data.prompt_eval_count || 0) + (data.eval_count || 0);

			return {
				text: responseText,
				tokensUsed: tokensUsed > 0 ? tokensUsed : undefined,
			};
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				printError('Timeout podczas połączenia z Ollama');
			} else {
				printError(`Błąd podczas generowania odpowiedzi Ollama: ${error}`);
			}

			// Return error response
			const errorText =
				'Przepraszam, wystąpił błąd podczas generowania odpowiedzi.';
			const assistantMessage: Message = {
				role: 'model',
				parts: [{ text: errorText }],
			};
			this._history.push(assistantMessage);
			return { text: errorText };
		}
	}

	/**
	 * Returns the current conversation history.
	 */
	getHistory(): ChatHistory {
		return this._history;
	}
}

/**
 * Encapsulates all Ollama API interactions.
 */
export class OllamaClient {
	private modelName: string;
	private baseUrl: string;
	private timeout: number;
	private samplingParams: SamplingParams;
	private isConnected: boolean = false;

	constructor(
		modelName: string,
		baseUrl: string = 'http://localhost:11434',
		timeout: number = 30000,
		samplingParams: SamplingParams = {
			temperature: 0.8,
			top_p: 0.9,
			top_k: 40,
		},
	) {
		if (!baseUrl) {
			throw new Error('Base URL cannot be empty');
		}

		this.modelName = modelName;
		this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
		this.timeout = timeout;
		this.samplingParams = samplingParams;
	}

	/**
	 * Returns a message indicating that Ollama client is being prepared.
	 */
	static preparingForUseMessage(): string {
		return '🦙 Przygotowywanie klienta Ollama...';
	}

	/**
	 * Factory method that creates an OllamaClient instance from environment variables.
	 */
	static fromEnvironment(): OllamaClient {
		config();

		// Validation with Zod
		const configData = OllamaConfigSchema.parse({
			engine: 'OLLAMA',
			modelName: process.env.OLLAMA_MODEL_NAME || 'llama3.2',
			ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
			ollamaTimeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10),
			ollamaTemperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.8'),
			ollamaTopP: parseFloat(process.env.OLLAMA_TOP_P || '0.9'),
			ollamaTopK: parseInt(process.env.OLLAMA_TOP_K || '40', 10),
		});

		printInfo(`Łączenie z serwerem Ollama: ${configData.ollamaBaseUrl}`);
		printInfo(`Model: ${configData.modelName}`);
		printInfo(
			`Parametry: Temperature=${configData.ollamaTemperature}, Top-P=${configData.ollamaTopP}, Top-K=${configData.ollamaTopK}`,
		);

		return new OllamaClient(
			configData.modelName,
			configData.ollamaBaseUrl,
			configData.ollamaTimeout,
			{
				temperature: configData.ollamaTemperature,
				top_p: configData.ollamaTopP,
				top_k: configData.ollamaTopK,
			},
		);
	}

	/**
	 * Checks if Ollama server is available.
	 */
	async checkConnection(): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			const response = await fetch(`${this.baseUrl}/api/tags`, {
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				this.isConnected = true;
				return true;
			}

			return false;
		} catch (error) {
			printError(`Nie można połączyć się z serwerem Ollama: ${error}`);
			return false;
		}
	}

	/**
	 * Initializes the Ollama client by checking connection.
	 */
	async initializeModel(): Promise<void> {
		printInfo(`Sprawdzanie połączenia z serwerem Ollama...`);
		const connected = await this.checkConnection();

		if (!connected) {
			throw new Error(
				`Nie można połączyć się z serwerem Ollama pod adresem ${this.baseUrl}. ` +
					'Upewnij się, że Ollama jest uruchomiona (ollama serve) i dostępna.',
			);
		}

		printInfo(`Połączenie z Ollama ustanowione pomyślnie`);
	}

	/**
	 * Creates a new chat session with the specified configuration.
	 */
	async createChatSession(
		systemInstruction: string,
		history: ChatHistory = [],
		_thinkingBudget: number = 0,
	): Promise<OllamaChatSession> {
		if (!this.isConnected) {
			await this.checkConnection();
		}

		return new OllamaChatSession(
			this.baseUrl,
			this.modelName,
			this.timeout,
			systemInstruction,
			this.samplingParams,
			history,
		);
	}

	/**
	 * Counts tokens for the given conversation history.
	 * Note: Ollama doesn't provide a direct token counting API,
	 * so we use a rough estimation.
	 */
	async countHistoryTokens(history: ChatHistory): Promise<number> {
		if (!history || history.length === 0) {
			return 0;
		}

		try {
			// Rough estimation: average 4 characters per token
			// This is a common approximation for English text
			const totalChars = history.reduce((sum, msg) => {
				return sum + (msg.parts[0]?.text.length || 0);
			}, 0);

			return Math.floor(totalChars / 4);
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
		return this.isConnected;
	}

	/**
	 * Returns a ready-to-use message with model info and parameters.
	 */
	readyForUseMessage(): string {
		return `✅ Klient Ollama gotowy do użycia (Model: ${this.modelName}, URL: ${this.baseUrl}, T=${this.samplingParams.temperature}, TopP=${this.samplingParams.top_p}, TopK=${this.samplingParams.top_k})`;
	}
}
