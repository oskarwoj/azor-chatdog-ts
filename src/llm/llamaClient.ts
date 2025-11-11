/**
 * Local LLaMA LLM Client Implementation
 * Encapsulates all local LLaMA model interactions using node-llama-cpp.
 */

import { existsSync } from 'fs';
import { config } from 'dotenv';
import { printError, printInfo } from '../cli/console.js';
import { LlamaConfigSchema } from './llamaValidation.js';
import type { ChatHistory, LLMResponse, Message } from '../types.js';
import { getLlama, Llama, LlamaModel, LlamaChatSession as NativeLlamaChatSession } from 'node-llama-cpp';

/**
 * Wrapper class that provides a chat session interface compatible with Gemini's interface.
 */
export class LlamaChatSession {
  private llamaSession: NativeLlamaChatSession;
  private _history: ChatHistory;
  private systemInstruction: string;

  constructor(llamaSession: NativeLlamaChatSession, systemInstruction: string, history: ChatHistory = []) {
    this.llamaSession = llamaSession;
    this.systemInstruction = systemInstruction;
    this._history = history;
  }

  /**
   * Sends a message to the LLaMA model and returns a response object.
   */
  async sendMessage(text: string): Promise<LLMResponse> {
    // Add user message to history
    const userMessage: Message = { role: 'user', parts: [{ text }] };
    this._history.push(userMessage);

    try {
      // Generate response using LLaMA
      const response = await this.llamaSession.prompt(text);

      const responseText = response.trim();

      // Add assistant response to history
      const assistantMessage: Message = { role: 'model', parts: [{ text: responseText }] };
      this._history.push(assistantMessage);

      return {
        text: responseText,
        tokensUsed: undefined // node-llama-cpp doesn't provide token count in response
      };
    } catch (error) {
      printError(`Błąd podczas generowania odpowiedzi LLaMA: ${error}`);
      // Return error response
      const errorText = 'Przepraszam, wystąpił błąd podczas generowania odpowiedzi.';
      const assistantMessage: Message = { role: 'model', parts: [{ text: errorText }] };
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
 * Encapsulates all local LLaMA model interactions.
 */
export class LlamaClient {
  private modelName: string;
  private modelPath: string;
  private nGpuLayers: number;
  private nCtx: number;
  private llamaModel: LlamaModel | null = null;
  private llama: Llama | null = null;

  constructor(modelName: string, modelPath: string, nGpuLayers: number = 1, nCtx: number = 2048) {
    if (!modelPath) {
      throw new Error('Model path cannot be empty');
    }

    if (!existsSync(modelPath)) {
      throw new Error(`Model file not found: ${modelPath}`);
    }

    this.modelName = modelName;
    this.modelPath = modelPath;
    this.nGpuLayers = nGpuLayers;
    this.nCtx = nCtx;
  }

  /**
   * Returns a message indicating that LLaMA client is being prepared.
   */
  static preparingForUseMessage(): string {
    return '🦙 Przygotowywanie klienta llama.cpp...';
  }

  /**
   * Factory method that creates a LlamaClient instance from environment variables.
   */
  static fromEnvironment(): LlamaClient {
    config();

    // Validation with Zod
    const configData = LlamaConfigSchema.parse({
      engine: 'LLAMA_CPP',
      modelName: process.env.LLAMA_MODEL_NAME || 'llama-3.1-8b-instruct',
      llamaModelPath: process.env.LLAMA_MODEL_PATH || '',
      llamaGpuLayers: parseInt(process.env.LLAMA_GPU_LAYERS || '1', 10),
      llamaContextSize: parseInt(process.env.LLAMA_CONTEXT_SIZE || '2048', 10)
    });

    printInfo(`Ładowanie modelu LLaMA z: ${configData.llamaModelPath}`);

    return new LlamaClient(
      configData.modelName,
      configData.llamaModelPath,
      configData.llamaGpuLayers,
      configData.llamaContextSize
    );
  }

  /**
   * Initializes the LLaMA model.
   */
  async initializeModel(): Promise<void> {
    try {
      printInfo(`Inicjalizacja modelu LLaMA: ${this.modelName}`);
      printInfo(`Ścieżka: ${this.modelPath}`);
      printInfo(`Warstwy GPU: ${this.nGpuLayers}, Kontekst: ${this.nCtx}`);

      this.llama = await getLlama();
      this.llamaModel = await this.llama.loadModel({
        modelPath: this.modelPath,
        gpuLayers: this.nGpuLayers
      });
    } catch (error) {
      printError(`Błąd inicjalizacji modelu LLaMA: ${error}`);
      throw new Error(`Failed to initialize LLaMA model: ${error}`);
    }
  }

  /**
   * Creates a new chat session with the specified configuration.
   */
  async createChatSession(
    systemInstruction: string,
    history: ChatHistory = [],
    thinkingBudget: number = 0
  ): Promise<LlamaChatSession> {
    if (!this.llamaModel) {
      throw new Error('LLaMA model not initialized. Call initializeModel() first.');
    }

    // Create context
    const context = await this.llamaModel.createContext({
      contextSize: this.nCtx
    });

    // Create chat session
    const session = new NativeLlamaChatSession({
      contextSequence: context.getSequence(),
      systemPrompt: systemInstruction
    });

    return new LlamaChatSession(session, systemInstruction, history);
  }

  /**
   * Counts tokens for the given conversation history.
   */
  async countHistoryTokens(history: ChatHistory): Promise<number> {
    if (!history || history.length === 0) {
      return 0;
    }

    try {
      if (!this.llamaModel) {
        throw new Error('Model not initialized');
      }

      // Build text from history
      const textParts = history.map(msg => msg.parts[0]?.text || '');
      const fullText = textParts.join(' ');

      // Use LLaMA's tokenizer to count tokens
      const tokens = this.llamaModel.tokenize(fullText);
      return tokens.length;
    } catch (error) {
      printError(`Błąd podczas liczenia tokenów: ${error}`);
      // Fallback: rough estimation (4 chars per token average)
      const totalChars = history.reduce((sum, msg) => sum + (msg.parts[0]?.text.length || 0), 0);
      return Math.floor(totalChars / 4);
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
    return this.llamaModel !== null;
  }

  /**
   * Returns a ready-to-use message with model info and parameters.
   */
  readyForUseMessage(): string {
    return `✅ Klient llama.cpp gotowy do użycia (model lokalny: ${this.modelName}, Warstwy GPU: ${this.nGpuLayers}, Kontekst: ${this.nCtx})`;
  }
}
