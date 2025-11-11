# Gemini Project: Azor ChatDog (TypeScript)

This document provides a comprehensive overview of the `azor-chatdog-ts` project, designed to be used as a context for interacting with the Gemini AI.

## Project Overview

`azor-chatdog-ts` is an interactive AI chat assistant that runs in the terminal. It's a TypeScript port of an original Python project. The assistant is named "Azor" and is designed to be a friendly and capable AI companion.

The project supports multiple Large Language Model (LLM) backends, including Google Gemini and local LLaMA models. It features session management, persistent chat history, token usage tracking, and the ability to export chat sessions to PDF.

### Core Technologies

*   **Language:** TypeScript
*   **Runtime:** Node.js
*   **LLM Integration:**
    *   `@google/generative-ai` for Google Gemini
    *   `node-llama-cpp` for local LLaMA models
*   **CLI:** `@inquirer/prompts` for interactive prompts and `commander` for argument parsing.
*   **Styling:** `chalk` for colored terminal output.
*   **Data Validation:** `zod` for schema validation.
*   **PDF Generation:** `pdfkit`

### Architecture

The application is structured into several key components:

1.  **Entry Point (`src/index.ts`):** Initializes the application and starts the main chat loop.
2.  **Main Loop (`src/chat.ts`):** Handles user input, either processing it as a command or sending it to the AI.
3.  **Command Handler (`src/commandHandler.ts`):** Routes user commands (e.g., `/help`, `/session`) to the appropriate functions.
4.  **Session Management (`src/session/`):**
    *   `SessionManager`: Manages all chat sessions (creating, loading, switching).
    *   `ChatSession`: Represents a single conversation, handling the interaction with the LLM client and persisting the history.
5.  **LLM Clients (`src/llm/`):** Contains the logic for communicating with the different supported LLMs (Gemini, LLaMA).
6.  **File System (`src/files/`):** Manages configuration, session history files, and the Write-Ahead Log (WAL) for data integrity.

## Building and Running

### Prerequisites

*   Node.js (v20+)
*   An NPM package manager (`npm` or `yarn`)
*   A `.env` file configured with the necessary API keys and settings (based on `.env.example`).

### Key Commands

*   **Install Dependencies:**
    ```bash
    npm install
    ```
*   **Run in Development Mode:**
    This command uses `tsx` to run the TypeScript source directly without a separate build step.
    ```bash
    npm run dev
    ```
*   **Build for Production:**
    This command transpiles the TypeScript code into JavaScript in the `dist/` directory.
    ```bash
    npm run build
    ```
*   **Run in Production:**
    This command executes the compiled JavaScript code.
    ```bash
    npm start
    ```
*   **Type Checking:**
    This command checks the project for any TypeScript errors without generating JavaScript files.
    ```bash
    npx tsc --noEmit
    ```

## Development Conventions

*   **Modular Structure:** The codebase is organized into distinct modules based on functionality (e.g., `cli`, `commands`, `files`, `llm`, `session`). This promotes separation of concerns and maintainability.
*   **Type Safety:** The project uses TypeScript with strict typing to ensure code quality and reduce runtime errors.
*   **ESM Modules:** The project uses modern ECMAScript modules.
*   **Configuration:** Application configuration is managed through environment variables loaded from a `.env` file, which is a standard practice for Node.js applications.
*   **State Management:** Session state is managed explicitly through the `SessionManager` and `ChatSession` classes, with history persisted to the file system in JSON format.
*   **User Interaction:** The application provides a rich command-line interface with a clear set of commands for users to interact with the assistant and manage their sessions.
