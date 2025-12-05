/**
 * Tool definitions for LLM function calling.
 * These definitions tell the LLM what tools are available.
 * Supports both Gemini and Llama (node-llama-cpp) formats.
 */

import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';
import type { ChatSessionModelFunctions } from 'node-llama-cpp';
import { printError, printInfo } from '../cli/console.js';
import { mcpClient } from '../mcp/client.js';
import { getErrorMessage } from '../utils/errorUtils.js';

/**
 * Tool definition for listing all chat threads.
 */
export const listThreadsTool: FunctionDeclaration = {
	name: 'list_threads',
	description:
		'Lists all chat session threads stored in the ~/.azor/ directory. Returns a list of filenames with their last modified timestamps (updated_at in ISO format). Use this to see what threads exist and when they were last active.',
	parameters: {
		type: SchemaType.OBJECT,
		properties: {},
		required: [],
	},
};

/**
 * Tool definition for deleting a specific thread.
 */
export const deleteThreadTool: FunctionDeclaration = {
	name: 'delete_thread',
	description:
		'Deletes a specific chat session thread file from the ~/.azor/ directory. Requires the exact filename (e.g., "abc123-log.json"). Returns success status and a message.',
	parameters: {
		type: SchemaType.OBJECT,
		properties: {
			filename: {
				type: SchemaType.STRING,
				description:
					'The exact filename of the thread to delete (e.g., "session_123-log.json")',
			},
		},
		required: ['filename'],
	},
};

/**
 * Tool definition for getting thread data (metadata and messages).
 */
export const getThreadDataTool: FunctionDeclaration = {
	name: 'get_thread_data',
	description:
		'Reads and returns both the metadata and the content (messages) of a specific chat thread from the ~/.azor/ directory. Requires the exact filename (e.g., "abc123-log.json"). Returns metadata (session_id, model, system_role, assistant_id, title) and messages array.',
	parameters: {
		type: SchemaType.OBJECT,
		properties: {
			filename: {
				type: SchemaType.STRING,
				description:
					'The exact filename of the thread to read (e.g., "session_123-log.json")',
			},
		},
		required: ['filename'],
	},
};

/**
 * Tool definition for requesting clarification from the user.
 * This is a special tool that interrupts the conversation flow to get user input.
 */
export const requestClarificationTool: FunctionDeclaration = {
	name: 'request_clarification',
	description:
		'Request clarification from the user when the query is vague, ambiguous, or missing information needed to provide an accurate response. Use this instead of guessing or providing generic answers. The conversation will pause until the user provides the requested clarification.',
	parameters: {
		type: SchemaType.OBJECT,
		properties: {
			question: {
				type: SchemaType.STRING,
				description:
					'The specific clarifying question to ask the user. Be clear and concise about what information is needed.',
			},
		},
		required: ['question'],
	},
};

/**
 * All available tools for AZOR.
 */
export const azorTools: FunctionDeclaration[] = [
	listThreadsTool,
	deleteThreadTool,
	getThreadDataTool,
	requestClarificationTool,
];

/**
 * Tool configuration for Gemini model.
 */
export const toolConfig = {
	functionDeclarations: azorTools,
};

/**
 * Converts Gemini SchemaType to GBNF JSON Schema type string.
 */
function geminiTypeToGbnfType(
	schemaType: SchemaType,
): 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' {
	switch (schemaType) {
		case SchemaType.STRING:
			return 'string';
		case SchemaType.NUMBER:
			return 'number';
		case SchemaType.INTEGER:
			return 'integer';
		case SchemaType.BOOLEAN:
			return 'boolean';
		case SchemaType.OBJECT:
			return 'object';
		case SchemaType.ARRAY:
			return 'array';
		default:
			return 'string';
	}
}

/**
 * Converts Gemini FunctionDeclaration parameters to GBNF JSON Schema format.
 */
function convertParametersToGbnfSchema(
	parameters: FunctionDeclaration['parameters'],
): Record<string, unknown> | undefined {
	if (!parameters) {
		return undefined;
	}

	const gbnfSchema: Record<string, unknown> = {
		type: geminiTypeToGbnfType(parameters.type),
	};

	if (parameters.properties) {
		const properties: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(parameters.properties)) {
			properties[key] = {
				type: geminiTypeToGbnfType(value.type as SchemaType),
				description: value.description,
			};
		}
		gbnfSchema.properties = properties;
	}

	if (parameters.required && parameters.required.length > 0) {
		gbnfSchema.required = parameters.required;
	}

	return gbnfSchema;
}

/**
 * Creates a tool handler function that executes the tool via MCP client.
 * @param toolName - The name of the tool to execute
 * @returns Handler function for the tool
 */
function createToolHandler(
	toolName: string,
): (params: Record<string, unknown>) => Promise<unknown> {
	return async (params: Record<string, unknown>) => {
		printInfo(`🔧 Wykonuję narzędzie: ${toolName}`);
		try {
			const result = await mcpClient.executeTool(toolName, params);
			printInfo(`✓ Narzędzie ${toolName} wykonane pomyślnie`);
			return result;
		} catch (error) {
			const errorMessage = getErrorMessage(error);
			printError(`✗ Błąd narzędzia ${toolName}: ${errorMessage}`);
			return { error: errorMessage };
		}
	};
}

/**
 * Converts Gemini FunctionDeclaration array to node-llama-cpp ChatSessionModelFunctions format.
 * This allows using the same tool definitions for both Gemini and Llama models.
 *
 * @param declarations - Array of Gemini FunctionDeclaration objects
 * @returns ChatSessionModelFunctions object for node-llama-cpp
 */
export function convertToLlamaTools(
	declarations: FunctionDeclaration[],
): ChatSessionModelFunctions {
	const llamaTools: Record<
		string,
		{
			description?: string;
			params?: Record<string, unknown>;
			handler: (params: Record<string, unknown>) => Promise<unknown>;
		}
	> = {};

	for (const decl of declarations) {
		llamaTools[decl.name] = {
			description: decl.description,
			params: convertParametersToGbnfSchema(decl.parameters),
			handler: createToolHandler(decl.name),
		};
	}

	return llamaTools as ChatSessionModelFunctions;
}

/**
 * Pre-converted tool configuration for Llama models.
 */
export const llamaToolConfig = convertToLlamaTools(azorTools);

/**
 * Ollama tool definition format
 */
export interface OllamaTool {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: {
			type: 'object';
			required?: string[];
			properties: Record<string, { type: string; description?: string }>;
		};
	};
}

/**
 * Converts Gemini FunctionDeclaration array to Ollama tool format.
 * This allows using the same tool definitions for Gemini, Llama, and Ollama models.
 *
 * @param declarations - Array of Gemini FunctionDeclaration objects
 * @returns Array of OllamaTool objects for Ollama API
 */
export function convertToOllamaTools(
	declarations: FunctionDeclaration[],
): OllamaTool[] {
	return declarations.map((decl) => ({
		type: 'function' as const,
		function: {
			name: decl.name,
			description: decl.description || '',
			parameters: {
				type: 'object' as const,
				required: decl.parameters?.required || [],
				properties: Object.entries(decl.parameters?.properties || {}).reduce(
					(acc, [key, value]) => {
						acc[key] = {
							type: geminiTypeToGbnfType(value.type as SchemaType),
							description: value.description,
						};
						return acc;
					},
					{} as Record<string, { type: string; description?: string }>,
				),
			},
		},
	}));
}

/**
 * Pre-converted tool configuration for Ollama models.
 */
export const ollamaToolConfig = convertToOllamaTools(azorTools);
