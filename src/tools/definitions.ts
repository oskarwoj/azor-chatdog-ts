/**
 * Tool definitions for Gemini function calling.
 * These definitions tell the LLM what tools are available.
 */

import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

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
 * All available tools for AZOR.
 */
export const azorTools: FunctionDeclaration[] = [
	listThreadsTool,
	deleteThreadTool,
	getThreadDataTool,
];

/**
 * Tool configuration for Gemini model.
 */
export const toolConfig = {
	functionDeclarations: azorTools,
};
