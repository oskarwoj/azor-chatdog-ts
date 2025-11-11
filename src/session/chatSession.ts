import { randomUUID } from 'crypto';
import { loadSessionHistory, saveSessionHistory } from '../files/sessionFiles.js';
import { appendToWAL } from '../files/wal.js';
import { GeminiLLMClient, GeminiChatSessionWrapper } from '../llm/geminiClient.js';
import { LlamaClient, LlamaChatSession } from '../llm/llamaClient.js';
import { OllamaClient, OllamaChatSession } from '../llm/ollamaClient.js';
import { Assistant } from '../assistant/assistant.js';
import { printInfo, printWarning } from '../cli/console.js';
import type { ChatHistory, LLMResponse } from '../types.js';

// Engine to Client Class mapping
interface LLMClientClass {
  preparingForUseMessage(): string;
  fromEnvironment(): any;
}

type LLMClientType = typeof GeminiLLMClient | typeof LlamaClient | typeof OllamaClient;
type ChatSessionType = GeminiChatSessionWrapper | LlamaChatSession | OllamaChatSession;

const ENGINE_MAPPING: Record<string, LLMClientType> = {
  LLAMA_CPP: LlamaClient,
  GEMINI: GeminiLLMClient,
  OLLAMA: OllamaClient
};

/**
 * Manages everything related to a single chat session.
 * Encapsulates session ID, conversation history, assistant, and LLM chat session.
 */
export class ChatSession {
  private assistant: Assistant;
  private sessionId: string;
  private _history: ChatHistory;
  private _llmClient: GeminiLLMClient | LlamaClient | OllamaClient | null = null;
  private _llmChatSession: ChatSessionType | null = null;
  private _maxContextTokens: number = 32768;

  constructor(assistant: Assistant, sessionId?: string, history?: ChatHistory) {
    this.assistant = assistant;
    this.sessionId = sessionId || randomUUID();
    this._history = history || [];
  }

  /**
   * Initialize the LLM session asynchronously.
   * Must be called after construction.
   */
  async initialize(): Promise<void> {
    await this._initializeLLMSession();
  }

  /**
   * Creates or recreates the LLM chat session with current history.
   */
  private async _initializeLLMSession(): Promise<void> {
    // Validate ENGINE variable
    const engine = (process.env.ENGINE || 'GEMINI').toUpperCase();
    if (!(engine in ENGINE_MAPPING)) {
      const validEngines = Object.keys(ENGINE_MAPPING).join(', ');
      throw new Error(`ENGINE musi być jedną z wartości: ${validEngines}, otrzymano: ${engine}`);
    }

    // Initialize LLM client if not already created
    if (this._llmClient === null) {
      const SelectedClientClass = ENGINE_MAPPING[engine] || GeminiLLMClient;
      printInfo((SelectedClientClass as LLMClientClass).preparingForUseMessage());

      if (SelectedClientClass === LlamaClient) {
        const client = LlamaClient.fromEnvironment();
        await client.initializeModel();
        this._llmClient = client;
      } else if (SelectedClientClass === OllamaClient) {
        const client = OllamaClient.fromEnvironment();
        await client.initializeModel();
        this._llmClient = client;
      } else {
        this._llmClient = (SelectedClientClass as typeof GeminiLLMClient).fromEnvironment();
      }

      printInfo(this._llmClient.readyForUseMessage());
    }

    this._llmChatSession = await this._llmClient.createChatSession(
      this.assistant.systemPrompt,
      this._history,
      0
    );
  }

  /**
   * Loads a session from disk.
   */
  static async loadFromFile(assistant: Assistant, sessionId: string): Promise<[ChatSession | null, string | null]> {
    const [history, error] = loadSessionHistory(sessionId);

    if (error) {
      return [null, error];
    }

    const session = new ChatSession(assistant, sessionId, history);
    await session.initialize();
    return [session, null];
  }

  /**
   * Saves this session to disk.
   * Only saves if history has at least one complete exchange.
   */
  async saveToFile(): Promise<[boolean, string | null]> {
    // Sync history from LLM session before saving
    if (this._llmChatSession) {
      this._history = await this._llmChatSession.getHistory();
    }

    if (!this._llmClient) {
      return [false, 'LLM client not initialized'];
    }

    return saveSessionHistory(
      this.sessionId,
      this._history,
      this.assistant.systemPrompt,
      this._llmClient.getModelName()
    );
  }

  /**
   * Sends a message to the LLM and returns the response.
   * Updates internal history automatically and logs to WAL.
   */
  async sendMessage(text: string): Promise<LLMResponse> {
    if (!this._llmChatSession) {
      throw new Error('LLM session not initialized');
    }

    if (!this._llmClient) {
      throw new Error('LLM client not initialized');
    }

    const response = await this._llmChatSession.sendMessage(text);

    // Sync history after message
    this._history = await this._llmChatSession.getHistory();

    // Log to WAL
    const totalTokens = await this.countTokens();
    const [success, error] = appendToWAL(
      this.sessionId,
      text,
      response.text,
      totalTokens,
      this._llmClient.getModelName()
    );

    if (!success && error) {
      // We don't want to fail the entire message sending because of WAL issues
      // Just log the error as a warning
      printWarning(`WAL logging failed: ${error}`);
    }

    return response;
  }

  /**
   * Returns the current conversation history.
   */
  async getHistory(): Promise<ChatHistory> {
    // Always sync from LLM session to ensure consistency
    if (this._llmChatSession) {
      this._history = await this._llmChatSession.getHistory();
    }
    return this._history;
  }

  /**
   * Clears all conversation history and reinitializes the LLM session.
   */
  async clearHistory(): Promise<void> {
    this._history = [];
    await this._initializeLLMSession();
    await this.saveToFile();
  }

  /**
   * Removes the last user-assistant exchange from history.
   */
  async popLastExchange(): Promise<boolean> {
    const currentHistory = await this.getHistory();

    if (currentHistory.length < 2) {
      return false;
    }

    // Remove last 2 entries (user + assistant)
    this._history = currentHistory.slice(0, -2);

    // Reinitialize LLM session with modified history
    await this._initializeLLMSession();

    await this.saveToFile();

    return true;
  }

  /**
   * Counts total tokens in the conversation history.
   */
  async countTokens(): Promise<number> {
    if (!this._llmClient) {
      return 0;
    }
    return await this._llmClient.countHistoryTokens(this._history);
  }

  /**
   * Checks if session has any complete exchanges.
   */
  isEmpty(): boolean {
    return this._history.length < 2;
  }

  /**
   * Calculates remaining tokens based on context limit.
   */
  async getRemainingTokens(): Promise<number> {
    const total = await this.countTokens();
    return this._maxContextTokens - total;
  }

  /**
   * Gets comprehensive token information for this session.
   */
  async getTokenInfo(): Promise<[number, number, number]> {
    const totalTokens = await this.countTokens();
    const remainingTokens = this._maxContextTokens - totalTokens;
    const maxTokens = this._maxContextTokens;
    return [totalTokens, remainingTokens, maxTokens];
  }

  /**
   * Gets the display name of the assistant.
   */
  get assistantName(): string {
    return this.assistant.name;
  }

  /**
   * Gets the session ID.
   */
  getSessionId(): string {
    return this.sessionId;
  }
}
