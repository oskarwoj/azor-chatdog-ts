/**
 * Core type definitions for the chatbot application
 */

// Message types
export interface MessagePart {
  text: string;
}

export interface Message {
  role: 'user' | 'model';
  parts: MessagePart[];
  timestamp?: string;
}

export type ChatHistory = Message[];

// Session types
export interface SessionMetadata {
  session_id: string;
  model: string;
  system_role: string;
  history: ChatHistory;
  title?: string; // Optional human-readable title for the session
}

// Token info
export interface TokenInfo {
  used: number;
  limit: number;
  percentage: number;
}

// LLM Response
export interface LLMResponse {
  text: string;
  tokensUsed?: number;
}

// Assistant configuration
export interface AssistantConfig {
  name: string;
  role: string;
  model: string;
}

// Command types
export type CommandResult = 'continue' | 'exit' | 'switch';
