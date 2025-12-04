/**
 * Google Gemini LLM Client Implementation
 * Encapsulates all Google Gemini AI interactions with function calling support.
 */

import {
	ChatSession,
	FunctionCall,
	FunctionResponsePart,
	GenerativeModel,
	GoogleGenerativeAI,
} from '@google/generative-ai';
import { config } from 'dotenv';
import { printError, printInfo } from '../cli/console.js';
import { mcpClient } from '../mcp/client.js';
import { toolConfig } from '../tools/definitions.js';
import type { ChatHistory, LLMResponse } from '../types.js';
import {
	chatHistoryToGeminiContent,
	geminiContentToChatHistory,
} from '../utils/messageConverter.js';
import { GeminiConfigSchema } from './geminiValidation.js';

/** Name of the clarification tool for detection */
const CLARIFICATION_TOOL_NAME = 'request_clarification';

/**
 * Wrapper for Gemini chat session that provides universal dictionary-based history format.
 * Supports function calling with automatic tool execution.
 */
export class GeminiChatSessionWrapper {
	private geminiSession: ChatSession;
	private toolsEnabled: boolean;

	constructor(geminiSession: ChatSession, toolsEnabled: boolean = false) {
		this.geminiSession = geminiSession;
		this.toolsEnabled = toolsEnabled;
	}

	/**
	 * Forwards message to Gemini session.
	 * Handles function calling loop if tools are enabled.
	 * Returns early with clarificationNeeded if the model requests clarification.
	 */
	async sendMessage(text: string): Promise<LLMResponse> {
		let result = await this.geminiSession.sendMessage(text);
		let response = result.response;

		// Function calling loop - keep executing until no more function calls
		if (this.toolsEnabled) {
			while (true) {
				const functionCalls = response.functionCalls();

				if (!functionCalls || functionCalls.length === 0) {
					break;
				}

				// Check for clarification request - handle it specially
				const clarificationCall = functionCalls.find(
					(call) => call.name === CLARIFICATION_TOOL_NAME,
				);

				if (clarificationCall) {
					const question = (clarificationCall.args as { question?: string })
						?.question;
					if (question) {
						// Return early with clarification request
						// The calling code will handle prompting the user
						return {
							text: '',
							tokensUsed: response.usageMetadata?.totalTokenCount,
							clarificationNeeded: { question },
						};
					}
				}

				// Filter out clarification calls and execute remaining function calls
				const otherCalls = functionCalls.filter(
					(call) => call.name !== CLARIFICATION_TOOL_NAME,
				);

				if (otherCalls.length === 0) {
					break;
				}

				// Execute all other function calls and collect responses
				const functionResponses = await this.executeFunctionCalls(otherCalls);

				// Send function responses back to the model
				result = await this.geminiSession.sendMessage(functionResponses);
				response = result.response;
			}
		}

		return {
			text: response.text(),
			tokensUsed: response.usageMetadata?.totalTokenCount,
		};
	}

	/**
	 * Executes function calls via MCP client and returns responses.
	 */
	private async executeFunctionCalls(
		functionCalls: FunctionCall[],
	): Promise<FunctionResponsePart[]> {
		const responses: FunctionResponsePart[] = [];

		for (const call of functionCalls) {
			printInfo(`🔧 Wykonuję narzędzie: ${call.name}`);

			try {
				const toolResult = await mcpClient.executeTool(
					call.name,
					call.args as Record<string, unknown>,
				);

				responses.push({
					functionResponse: {
						name: call.name,
						response: toolResult as object,
					},
				});

				printInfo(`✓ Narzędzie ${call.name} wykonane pomyślnie`);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				printError(`✗ Błąd narzędzia ${call.name}: ${errorMessage}`);

				responses.push({
					functionResponse: {
						name: call.name,
						response: { error: errorMessage },
					},
				});
			}
		}

		return responses;
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
	 * Optionally enables tool/function calling capabilities.
	 */
	createChatSession(
		systemInstruction: string,
		history?: ChatHistory,
		_thinkingBudget: number = 0,
		enableTools: boolean = true,
	): GeminiChatSessionWrapper {
		if (!this.model) {
			throw new Error('LLM client not initialized');
		}

		// Convert universal dict format to Gemini Content objects
		const geminiHistory = history ? chatHistoryToGeminiContent(history) : [];

		// Create generative model with system instruction and optional tools
		const modelConfig: {
			model: string;
			systemInstruction: string;
			tools?: Array<{
				functionDeclarations: typeof toolConfig.functionDeclarations;
			}>;
		} = {
			model: this.modelName,
			systemInstruction: systemInstruction,
		};

		if (enableTools) {
			modelConfig.tools = [toolConfig];
		}

		const modelWithConfig = this.client.getGenerativeModel(modelConfig);

		const geminiSession = modelWithConfig.startChat({
			history: geminiHistory,
		});

		return new GeminiChatSessionWrapper(geminiSession, enableTools);
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
