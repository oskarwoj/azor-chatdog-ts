/**
 * Ollama LLM Client Implementation
 * Encapsulates all Ollama API interactions via REST endpoint.
 */

import { config } from 'dotenv';
import { printError, printInfo } from '../cli/console.js';
import { mcpClient } from '../mcp/client.js';
import { ollamaToolConfig, type OllamaTool } from '../tools/definitions.js';
import type { ChatHistory, LLMResponse, Message } from '../types.js';
import { getErrorMessage } from '../utils/errorUtils.js';
import { OllamaConfigSchema } from './ollamaValidation.js';

/** Name of the clarification tool for detection */
const CLARIFICATION_TOOL_NAME = 'request_clarification';

/**
 * Error thrown when the model doesn't support tool calling
 */
class ToolsNotSupportedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ToolsNotSupportedError';
	}
}

/**
 * Ollama tool call returned by the model
 */
interface OllamaToolCall {
	function: {
		name: string;
		arguments: Record<string, unknown>;
	};
}

/**
 * Ollama message format for API requests
 */
interface OllamaMessage {
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
	tool_calls?: OllamaToolCall[];
	tool_name?: string;
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
		tool_calls?: OllamaToolCall[];
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
 * Supports function calling with automatic tool execution.
 */
export class OllamaChatSession {
	private baseUrl: string;
	private modelName: string;
	private timeout: number;
	private _history: ChatHistory;
	private systemInstruction: string;
	private samplingParams: SamplingParams;
	private toolsEnabled: boolean;
	private toolsSupported: boolean = true; // Will be set to false if model doesn't support tools
	private tools: OllamaTool[];
	private _ollamaMessages: OllamaMessage[] = [];

	constructor(
		baseUrl: string,
		modelName: string,
		timeout: number,
		systemInstruction: string,
		samplingParams: SamplingParams,
		history: ChatHistory = [],
		toolsEnabled: boolean = false,
		tools: OllamaTool[] = [],
	) {
		this.baseUrl = baseUrl;
		this.modelName = modelName;
		this.timeout = timeout;
		this.systemInstruction = systemInstruction;
		this.samplingParams = samplingParams;
		this._history = history;
		this.toolsEnabled = toolsEnabled;
		this.tools = tools;
	}

	/**
	 * Initializes Ollama messages array with system instruction.
	 */
	private initializeOllamaMessages(): void {
		this._ollamaMessages = [];
		if (this.systemInstruction) {
			this._ollamaMessages.push({
				role: 'system',
				content: this.systemInstruction,
			});
		}
		// Convert existing history to Ollama format
		for (const msg of this._history) {
			this._ollamaMessages.push({
				role: msg.role === 'model' ? 'assistant' : 'user',
				content: msg.parts[0]?.text || '',
			});
		}
	}

	/**
	 * Makes a chat API request to Ollama.
	 * @param includeTools - Whether to include tools in the request (respects toolsSupported flag)
	 */
	private async makeOllamaRequest(
		messages: OllamaMessage[],
		includeTools: boolean = true,
	): Promise<OllamaChatResponse> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		const requestBody: {
			model: string;
			messages: OllamaMessage[];
			stream: boolean;
			options: {
				temperature: number;
				top_p: number;
				top_k: number;
			};
			tools?: OllamaTool[];
		} = {
			model: this.modelName,
			messages: messages,
			stream: false,
			options: {
				temperature: this.samplingParams.temperature,
				top_p: this.samplingParams.top_p,
				top_k: this.samplingParams.top_k,
			},
		};

		// Include tools if enabled, supported, and requested
		if (
			includeTools &&
			this.toolsEnabled &&
			this.toolsSupported &&
			this.tools.length > 0
		) {
			requestBody.tools = this.tools;
		}

		const response = await fetch(`${this.baseUrl}/api/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorText = await response.text();
			// Check if the error is due to model not supporting tools
			if (
				errorText.includes('does not support tools') ||
				errorText.includes('does not support functions')
			) {
				throw new ToolsNotSupportedError(errorText);
			}
			throw new Error(
				`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`,
			);
		}

		return (await response.json()) as OllamaChatResponse;
	}

	/**
	 * Executes tool calls and returns tool result messages.
	 */
	private async executeToolCalls(
		toolCalls: OllamaToolCall[],
	): Promise<{ messages: OllamaMessage[]; clarificationQuestion?: string }> {
		const toolMessages: OllamaMessage[] = [];
		let clarificationQuestion: string | undefined;

		for (const call of toolCalls) {
			const toolName = call.function.name;
			const toolArgs = call.function.arguments;

			// Check for clarification request - handle it specially
			if (toolName === CLARIFICATION_TOOL_NAME) {
				const question = (toolArgs as { question?: string })?.question;
				if (question) {
					clarificationQuestion = question;
					// Add a placeholder tool response
					toolMessages.push({
						role: 'tool',
						tool_name: toolName,
						content: JSON.stringify({
							status: 'clarification_requested',
							message: 'Waiting for user clarification',
						}),
					});
				}
				continue;
			}

			printInfo(`🔧 Wykonuję narzędzie: ${toolName}`);

			try {
				const result = await mcpClient.executeTool(toolName, toolArgs);
				toolMessages.push({
					role: 'tool',
					tool_name: toolName,
					content: JSON.stringify(result),
				});
				printInfo(`✓ Narzędzie ${toolName} wykonane pomyślnie`);
			} catch (error) {
				const errorMessage = getErrorMessage(error);
				printError(`✗ Błąd narzędzia ${toolName}: ${errorMessage}`);
				toolMessages.push({
					role: 'tool',
					tool_name: toolName,
					content: JSON.stringify({ error: errorMessage }),
				});
			}
		}

		return { messages: toolMessages, clarificationQuestion };
	}

	/**
	 * Sends a message to the Ollama model and returns a response object.
	 * Handles function calling loop if tools are enabled.
	 * Returns early with clarificationNeeded if the model requests clarification.
	 */
	async sendMessage(text: string): Promise<LLMResponse> {
		// Add user message to history
		const userMessage: Message = { role: 'user', parts: [{ text }] };
		this._history.push(userMessage);

		// Initialize Ollama messages if needed
		if (this._ollamaMessages.length === 0) {
			this.initializeOllamaMessages();
		}

		// Add user message to Ollama messages
		this._ollamaMessages.push({
			role: 'user',
			content: text,
		});

		let totalTokensUsed = 0;

		try {
			// Function calling loop
			while (true) {
				let data: OllamaChatResponse;

				try {
					data = await this.makeOllamaRequest(this._ollamaMessages);
				} catch (error) {
					// If model doesn't support tools, disable them and retry
					if (error instanceof ToolsNotSupportedError) {
						printInfo(
							`⚠️ Model ${this.modelName} nie wspiera narzędzi - wyłączam function calling`,
						);
						this.toolsSupported = false;
						data = await this.makeOllamaRequest(this._ollamaMessages, false);
					} else {
						throw error;
					}
				}

				totalTokensUsed +=
					(data.prompt_eval_count || 0) + (data.eval_count || 0);

				const toolCalls = data.message.tool_calls;

				// If tools are enabled, supported, and model returned tool calls
				if (
					this.toolsEnabled &&
					this.toolsSupported &&
					toolCalls &&
					toolCalls.length > 0
				) {
					// Add assistant message with tool calls to Ollama messages
					this._ollamaMessages.push({
						role: 'assistant',
						content: data.message.content || '',
						tool_calls: toolCalls,
					});

					// Execute tool calls
					const { messages: toolMessages, clarificationQuestion } =
						await this.executeToolCalls(toolCalls);

					// Add tool result messages
					this._ollamaMessages.push(...toolMessages);

					// If clarification was requested, return early
					if (clarificationQuestion) {
						return {
							text: '',
							tokensUsed: totalTokensUsed > 0 ? totalTokensUsed : undefined,
							clarificationNeeded: { question: clarificationQuestion },
						};
					}

					// Continue the loop to get the next response
					continue;
				}

				// No more tool calls - we have the final response
				const responseText = data.message.content;

				// Add assistant response to Ollama messages
				this._ollamaMessages.push({
					role: 'assistant',
					content: responseText,
				});

				// Add assistant response to history
				const assistantMessage: Message = {
					role: 'model',
					parts: [{ text: responseText }],
				};
				this._history.push(assistantMessage);

				return {
					text: responseText,
					tokensUsed: totalTokensUsed > 0 ? totalTokensUsed : undefined,
				};
			}
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
	async getHistory(): Promise<ChatHistory> {
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
	 * Optionally enables tool/function calling capabilities.
	 */
	async createChatSession(
		systemInstruction: string,
		history: ChatHistory = [],
		_thinkingBudget: number = 0,
		enableTools: boolean = true,
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
			enableTools,
			enableTools ? ollamaToolConfig : [],
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
