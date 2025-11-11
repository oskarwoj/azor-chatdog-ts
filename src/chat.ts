import { getSessionIdFromCLI } from './cli/args.js';
import { getSessionManager } from './session/index.js';
import { handleCommand } from './commandHandler.js';
import { printAssistant, printInfo, printError } from './cli/console.js';
import { getUserInput } from './cli/prompt.js';
import { printWelcome } from './commands/welcome.js';

/**
 * Initializes a new session or loads an existing one.
 */
export async function initChat(): Promise<void> {
  printWelcome();
  const manager = getSessionManager();

  // Initialize session based on CLI args
  const cliSessionId = getSessionIdFromCLI();
  await manager.initializeFromCLI(cliSessionId);

  // Register cleanup handlers
  process.on('SIGINT', async () => {
    printInfo('\nPrzerwano przez użytkownika (Ctrl+C). Uruchamianie procedury finalnego zapisu...');
    try {
      await manager.cleanupAndSave();
    } catch (error) {
      printError(`Error during cleanup: ${error}`);
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    try {
      await manager.cleanupAndSave();
    } catch (error) {
      printError(`Error during cleanup: ${error}`);
    }
    process.exit(0);
  });
}

/**
 * Main loop of the interactive chat.
 */
export async function mainLoop(): Promise<void> {
  const manager = getSessionManager();

  while (true) {
    try {
      const userInput = await getUserInput();

      if (!userInput) {
        continue;
      }

      if (userInput.startsWith('/')) {
        const shouldExit = await handleCommand(userInput);
        if (shouldExit) {
          break;
        }
        continue;
      }

      // Conversation with the model
      const session = manager.getCurrentSession();

      // Send message (handles WAL logging internally)
      const response = await session.sendMessage(userInput);

      // Get token information
      const [totalTokens, remainingTokens, maxTokens] = await session.getTokenInfo();

      // Display response
      printAssistant(`\n${session.assistantName}: ${response.text}`);
      printInfo(`Tokens: ${totalTokens} (Pozostało: ${remainingTokens} / ${maxTokens})`);

      // Save session
      const [success, error] = await session.saveToFile();
      if (!success && error) {
        printError(`Error saving session: ${error}`);
      }
    } catch (error) {
      if (error && typeof error === 'object') {
        // Handle Ctrl+C (ExitPromptError from @inquirer/prompts)
        const errorName = error.constructor?.name || (error as any).name;
        const errorMessage = 'message' in error ? String(error.message) : '';
        
        if (
          errorName === 'ExitPromptError' ||
          errorMessage.includes('User force closed the prompt') ||
          errorMessage === 'Input interrupted'
        ) {
          printInfo('\nPrzerwano przez użytkownika. Uruchamianie procedury finalnego zapisu...');
          break;
        }
      }
      printError(`\nWystąpił nieoczekiwany błąd: ${error}`);
      console.error(error);
      break;
    }
  }

  // Final cleanup
  await manager.cleanupAndSave();
}
