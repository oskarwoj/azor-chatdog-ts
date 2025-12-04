#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { LOG_DIR } from '../files/config.js';

const server = new McpServer({
	name: 'azor-mcp',
	version: '1.0.0',
});

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
			const output = { threads: [] };
			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
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

		const output = { threads };
		return {
			content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
			structuredContent: output,
		};
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
		// Validate filename is not empty and is a JSON file
		if (!filename || filename.trim() === '') {
			const output = {
				success: false,
				message: 'Invalid filename: filename cannot be empty.',
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		}

		if (!filename.endsWith('.json')) {
			const output = {
				success: false,
				message: 'Invalid filename: only .json files can be deleted.',
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		}

		// Security check: ensure the filename doesn't contain path traversal
		if (
			filename.includes('..') ||
			filename.includes('/') ||
			filename.includes('\\')
		) {
			const output = {
				success: false,
				message: 'Invalid filename: path traversal is not allowed.',
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		}

		const filePath = join(LOG_DIR, filename);

		if (!existsSync(filePath)) {
			const output = {
				success: false,
				message: `File "${filename}" not found in ${LOG_DIR}.`,
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		}

		try {
			unlinkSync(filePath);
			const output = {
				success: true,
				message: `Successfully deleted "${filename}".`,
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const output = {
				success: false,
				message: `Failed to delete "${filename}": ${errorMessage}`,
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		}
	},
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
