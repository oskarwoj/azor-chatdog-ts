# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Azor ChatDog is an interactive AI chat assistant in TypeScript with persistent session management, Write-Ahead Logging (WAL), and support for multiple LLM backends (Google Gemini and local LLaMA). This is a TypeScript port of a Python project with full type safety.

## Development Commands

### Essential Commands

- `npm run dev` - Run in development mode with tsx (hot reload)
- `npm run build` - Compile TypeScript to JavaScript (outputs to `dist/`)
- `npm start` - Run the compiled application from `dist/`
- `npm run dev -- --session-id=<SESSION_ID>` - Start with specific session

### Type Checking

- `npx tsc --noEmit` - Run type checking without building

## Architecture

### Core Components

**Session Management (Singleton Pattern)**

- `src/session/index.ts` exports singleton `getSessionManager()`
- `SessionManager` (`sessionManager.ts`) manages multiple sessions, handles switching, and persistence
- `ChatSession` (`chatSession.ts`) represents a single conversation with its own LLM client instance, history, and assistant configuration
- Each session lazy-initializes its LLM client when needed (not all sessions loaded at once)

**LLM Abstraction**

- `src/llm/` contains pluggable LLM backend implementations
- `ENGINE_MAPPING` in `chatSession.ts:19` maps engine strings to client classes
- Clients expose: `fromEnvironment()`, `createChatSession()`, `countHistoryTokens()`, `getModelName()`
- Chat session wrappers (`GeminiChatSessionWrapper`, `LlamaChatSession`) normalize the interface with `sendMessage()` and `getHistory()`
- Universal message format defined in `types.ts` - all LLMs convert to/from this format

**Write-Ahead Log (WAL)**

- `src/files/wal.ts` tracks every prompt/response transaction in `~/.azor/azor-wal.json`
- Logged automatically after each message in `chatSession.ts:139-153`
- WAL failures are non-fatal (logged as warnings) to prevent blocking chat
- Format: `{timestamp, session_id, model, prompt, response, tokens_used}`

**Message Flow**

1. User input → `chat.ts:mainLoop()` checks for slash commands
2. Regular messages → `session.sendMessage()` in `chatSession.ts:125`
3. LLM client wrapper processes message and updates history
4. Response logged to WAL, session saved to disk
5. History always synced from LLM session before operations (`getHistory()` calls)

**File Storage**

- Sessions: `~/.azor/<session-id>-log.json` (format defined in `SessionMetadata` type)
- WAL: `~/.azor/azor-wal.json`
- PDF exports: `~/.azor/output/`
- Paths configured in `src/files/config.ts`

### Type System

All core types in `src/types.ts`:

- `Message` - Universal message format with `role`, `parts[]`, optional `timestamp`
- `ChatHistory` - Array of messages
- `SessionMetadata` - Persisted session structure
- `LLMResponse` - Standard response format from any LLM backend

### Command System

- Commands parsed in `src/commandHandler.ts`
- Valid commands list: `VALID_SLASH_COMMANDS` at line 9
- Subcommands handled by dedicated functions (e.g., `handleSessionSubcommand`)
- Each command module in `src/commands/` handles specific functionality (PDF export, session listing, etc.)

## Adding New LLM Backends

1. Create client in `src/llm/<name>Client.ts` with:
   - Static `fromEnvironment()` and `preparingForUseMessage()` methods
   - `createChatSession()` returning a wrapper with `sendMessage()` and `getHistory()`
   - `countHistoryTokens()`, `getModelName()`, `isAvailable()`, `readyForUseMessage()`
2. Create validation schema in `src/llm/<name>Validation.ts` using Zod
3. Add to `ENGINE_MAPPING` in `chatSession.ts:19`
4. Convert to/from universal message format (see `src/utils/messageConverter.ts` for Gemini example)

## Session Lifecycle

1. **Initialization**: `chat.ts:initChat()` → `SessionManager.initializeFromCLI()`
2. **Loading**: `ChatSession.loadFromFile()` reads JSON, creates session, calls `initialize()` to setup LLM
3. **Message Handling**: `sendMessage()` → LLM wrapper → sync history → WAL log → save to file
4. **Switching**: `SessionManager.switchToSession()` saves current, loads/creates new
5. **Cleanup**: SIGINT/SIGTERM handlers call `manager.cleanupAndSave()` to flush all sessions

## Configuration

Environment variables loaded via dotenv:

- `ENGINE` - LLM backend (GEMINI or LLAMA_CPP)
- Gemini: `GEMINI_API_KEY`, `MODEL_NAME`
- LLaMA: `LLAMA_MODEL_NAME`, `LLAMA_MODEL_PATH`, `LLAMA_GPU_LAYERS`, `LLAMA_CONTEXT_SIZE`

Validation happens in respective `*Validation.ts` files using Zod schemas.

## Module System

- Uses ES modules with Node16 module resolution
- All imports require `.js` extension (even for `.ts` files) per TypeScript ESM conventions
- `"type": "module"` in `package.json`

## Important Implementation Details

- **Token Tracking**: Token counts are tracked per session with max context of 32768 tokens (hardcoded in `chatSession.ts:34`)
- **History Synchronization**: Always call `getHistory()` before operations to ensure consistency with LLM session state
- **Error Handling**: WAL logging failures don't block message flow; session save failures are reported but don't crash
- **Polish UI**: Console messages are in Polish (consider this when modifying user-facing strings)
- **Async Initialization**: `ChatSession.initialize()` must be called after constructor (async factory pattern)

# Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

## File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
gemini command:

### Examples:

Single file analysis:
gemini -p "@src/main.py Explain this file's purpose and structure"

Multiple files:
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

Entire directory:
gemini -p "@src/ Summarize the architecture of this codebase"

Multiple directories:
gemini -p "@src/ @tests/ Analyze test coverage for the source code"

Current directory and subdirectories:
gemini -p "@./ Give me an overview of this entire project"

# Or use --all_files flag:

gemini --all_files -p "Analyze the project structure and dependencies"

Implementation Verification Examples

Check if a feature is implemented:
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

Verify authentication implementation:
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

Check for specific patterns:
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

Verify error handling:
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

Check for rate limiting:
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

Verify caching strategy:
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

Check for specific security measures:
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

Verify test coverage for features:
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

When to Use Gemini CLI

Use gemini -p when:

- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

Important Notes

- Paths in @ syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for --yolo flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results
