#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	unlinkSync,
} from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { LOG_DIR } from '../files/config.js';
import { getErrorMessage } from '../utils/errorUtils.js';

const server = new McpServer({
	name: 'azor-mcp',
	version: '1.0.0',
});

/**
 * Result type for filename validation
 */
interface ValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validates a filename for security and format.
 * Returns validation result with error message if invalid.
 */
function validateFilename(
	filename: string,
	operation: string,
): ValidationResult {
	if (!filename || filename.trim() === '') {
		return {
			valid: false,
			error: 'Invalid filename: filename cannot be empty.',
		};
	}

	if (!filename.endsWith('.json')) {
		return {
			valid: false,
			error: `Invalid filename: only .json files can be ${operation}.`,
		};
	}

	// Security check: ensure the filename doesn't contain path traversal
	if (
		filename.includes('..') ||
		filename.includes('/') ||
		filename.includes('\\')
	) {
		return {
			valid: false,
			error: 'Invalid filename: path traversal is not allowed.',
		};
	}

	return { valid: true };
}

/**
 * Creates a structured MCP response with both text and structured content.
 */
function createResponse<T extends object>(output: T) {
	return {
		content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
		structuredContent: output,
	};
}

/**
 * Tool: list_threads
 * Scans ~/.azor/ directory for .json files and returns their filenames with modification timestamps.
 */
server.registerTool(
	'list_threads',
	{
		title: 'List Threads',
		description:
			'Scans the ~/.azor/ directory for .json files and returns a list with filenames and last modified timestamps.',
		inputSchema: {},
		outputSchema: {
			threads: z.array(
				z.object({
					filename: z.string(),
					updated_at: z.string(),
				}),
			),
		},
	},
	async () => {
		if (!existsSync(LOG_DIR)) {
			return createResponse({ threads: [] });
		}

		const files = readdirSync(LOG_DIR);
		const jsonFiles = files.filter((f) => f.endsWith('.json'));

		const threads = jsonFiles.map((filename) => {
			const filePath = join(LOG_DIR, filename);
			const stats = statSync(filePath);
			return {
				filename,
				updated_at: stats.mtime.toISOString(),
			};
		});

		return createResponse({ threads });
	},
);

/**
 * Tool: delete_thread
 * Deletes a specified file from ~/.azor/ directory.
 */
server.registerTool(
	'delete_thread',
	{
		title: 'Delete Thread',
		description: 'Deletes the specified JSON file from the ~/.azor/ directory.',
		inputSchema: {
			filename: z
				.string()
				.min(1, 'Filename cannot be empty')
				.describe(
					'The filename of the thread to delete (e.g., "session_123-log.json")',
				),
		},
		outputSchema: {
			success: z.boolean(),
			message: z.string(),
		},
	},
	async ({ filename }) => {
		// Validate filename
		const validation = validateFilename(filename, 'deleted');
		if (!validation.valid) {
			return createResponse({ success: false, message: validation.error });
		}

		const filePath = join(LOG_DIR, filename);

		if (!existsSync(filePath)) {
			return createResponse({
				success: false,
				message: `File "${filename}" not found in ${LOG_DIR}.`,
			});
		}

		try {
			unlinkSync(filePath);
			return createResponse({
				success: true,
				message: `Successfully deleted "${filename}".`,
			});
		} catch (error) {
			return createResponse({
				success: false,
				message: `Failed to delete "${filename}": ${getErrorMessage(error)}`,
			});
		}
	},
);

/**
 * Tool: get_thread_data
 * Reads and returns both metadata and content of a specific thread.
 */
server.registerTool(
	'get_thread_data',
	{
		title: 'Get Thread Data',
		description:
			'Reads and returns both the metadata and the content (messages) of a specific thread from the ~/.azor/ directory.',
		inputSchema: {
			filename: z
				.string()
				.default('')
				.describe(
					'The filename of the thread to read (e.g., "session_123-log.json")',
				),
		},
		outputSchema: {
			success: z.boolean(),
			message: z.string().optional(),
			metadata: z
				.object({
					session_id: z.string(),
					model: z.string(),
					system_role: z.string(),
					assistant_id: z.string().optional(),
					title: z.string().optional(),
				})
				.optional(),
			messages: z
				.array(
					z.object({
						role: z.enum(['user', 'model']),
						text: z.string(),
						timestamp: z.string(),
					}),
				)
				.optional(),
		},
	},
	async ({ filename }) => {
		// Validate filename
		const validation = validateFilename(filename, 'read');
		if (!validation.valid) {
			return createResponse({ success: false, message: validation.error });
		}

		const filePath = join(LOG_DIR, filename);

		if (!existsSync(filePath)) {
			return createResponse({
				success: false,
				message: `File "${filename}" not found in ${LOG_DIR}.`,
			});
		}

		try {
			const fileContent = readFileSync(filePath, 'utf-8');
			const threadData = JSON.parse(fileContent);

			return createResponse({
				success: true,
				metadata: {
					session_id: threadData.session_id,
					model: threadData.model,
					system_role: threadData.system_role,
					...(threadData.assistant_id && {
						assistant_id: threadData.assistant_id,
					}),
					...(threadData.title && { title: threadData.title }),
				},
				messages: threadData.history || [],
			});
		} catch (error) {
			return createResponse({
				success: false,
				message: `Failed to read "${filename}": ${getErrorMessage(error)}`,
			});
		}
	},
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
