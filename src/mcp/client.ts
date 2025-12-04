/**
 * MCP Client for AZOR
 * Spawns the MCP server as a subprocess and provides tool execution.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Determines the server command and path based on the runtime environment.
 * In development (tsx), we run the TypeScript file directly.
 * In production (node), we run the compiled JavaScript file.
 */
function getServerConfig(): { command: string; args: string[] } {
	// Check if we're in development by looking for the .ts file
	const tsServerPath = join(__dirname, 'server.ts');
	const jsServerPath = join(__dirname, 'server.js');

	if (existsSync(tsServerPath) && __filename.endsWith('.ts')) {
		// Development mode - use tsx to run TypeScript directly
		return {
			command: 'npx',
			args: ['tsx', tsServerPath],
		};
	}

	// Production mode - use node to run compiled JavaScript
	return {
		command: 'node',
		args: [jsServerPath],
	};
}

export interface ThreadInfo {
	filename: string;
	updated_at: string;
}

export interface ListThreadsResult {
	threads: ThreadInfo[];
}

export interface DeleteThreadResult {
	success: boolean;
	message: string;
}

interface TextContent {
	type: 'text';
	text: string;
}

interface ToolResultContent {
	type: string;
	text?: string;
}

/**
 * MCP Client singleton that manages connection to the AZOR MCP server.
 */
class MCPClient {
	private client: Client | null = null;
	private transport: StdioClientTransport | null = null;
	private connected = false;

	/**
	 * Connects to the MCP server by spawning it as a subprocess.
	 */
	async connect(): Promise<void> {
		if (this.connected) {
			return;
		}

		this.client = new Client({
			name: 'azor-client',
			version: '1.0.0',
		});

		// Determine the server command based on runtime environment
		const serverConfig = getServerConfig();

		this.transport = new StdioClientTransport(serverConfig);

		await this.client.connect(this.transport);
		this.connected = true;
	}

	/**
	 * Disconnects from the MCP server.
	 */
	async disconnect(): Promise<void> {
		if (this.client && this.connected) {
			await this.client.close();
			this.connected = false;
			this.client = null;
			this.transport = null;
		}
	}

	/**
	 * Ensures the client is connected before executing operations.
	 */
	private async ensureConnected(): Promise<Client> {
		if (!this.connected || !this.client) {
			await this.connect();
		}
		return this.client!;
	}

	/**
	 * Lists all threads from ~/.azor/ directory.
	 */
	async listThreads(): Promise<ListThreadsResult> {
		const client = await this.ensureConnected();
		const result = await client.callTool({
			name: 'list_threads',
			arguments: {},
		});

		const content = result.content as ToolResultContent[];
		const textContent = content.find(
			(c): c is TextContent => c.type === 'text',
		);
		if (textContent) {
			return JSON.parse(textContent.text) as ListThreadsResult;
		}

		return { threads: [] };
	}

	/**
	 * Deletes a specific thread file.
	 */
	async deleteThread(filename: string): Promise<DeleteThreadResult> {
		const client = await this.ensureConnected();
		const result = await client.callTool({
			name: 'delete_thread',
			arguments: { filename },
		});

		const content = result.content as ToolResultContent[];
		const textContent = content.find(
			(c): c is TextContent => c.type === 'text',
		);
		if (textContent) {
			return JSON.parse(textContent.text) as DeleteThreadResult;
		}

		return { success: false, message: 'Unknown error' };
	}

	/**
	 * Executes a tool by name with given arguments.
	 * Used by the LLM function calling integration.
	 */
	async executeTool(
		name: string,
		args: Record<string, unknown>,
	): Promise<unknown> {
		switch (name) {
			case 'list_threads':
				return await this.listThreads();
			case 'delete_thread':
				return await this.deleteThread(args.filename as string);
			default:
				throw new Error(`Unknown tool: ${name}`);
		}
	}
}

// Export singleton instance
export const mcpClient = new MCPClient();
