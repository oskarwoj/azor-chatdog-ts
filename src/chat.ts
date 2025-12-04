import { getSessionIdFromCLI } from './cli/args.js';
import { getSessionManager } from './session/index.js';
import { handleCommand } from './commandHandler.js';
import { printAssistant, printInfo, printError, printWarning } from './cli/console.js';
import { getUserInput } from './cli/prompt.js';
import { printWelcome } from './commands/welcome.js';
import { generateTitleFromPrompt } from './utils/titleGenerator.js';
import type { LLMResponse } from './types.js';

/** Maximum number of clarification rounds to prevent infinite loops */
const MAX_CLARIFICATION_ROUNDS = 5;

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

      // Check if this is the first message (before sending)
      const isFirstMessage = session.isEmpty();

      // Send message and handle clarification loop
      let response: LLMResponse;
      let currentInput = userInput;
      let clarificationRounds = 0;

      while (true) {
        // Send message (handles WAL logging internally)
        response = await session.sendMessage(currentInput);

        // Check if clarification is needed
        if (response.clarificationNeeded) {
          clarificationRounds++;

          if (clarificationRounds > MAX_CLARIFICATION_ROUNDS) {
            printWarning(
              `\nOsiągnięto maksymalną liczbę próśb o wyjaśnienie (${MAX_CLARIFICATION_ROUNDS}). Przerywam.`,
            );
            break;
          }

          // Display the clarification question
          printAssistant(
            `\n${session.assistantName} prosi o wyjaśnienie: ${response.clarificationNeeded.question}`,
          );

          // Get user's clarification
          const clarification = await getUserInput('Twoja odpowiedź: ');

          if (!clarification) {
            printInfo('Anulowano wyjaśnienie.');
            break;
          }

          // Continue with the clarification as the next input
          currentInput = clarification;
          continue;
        }

        // Got a regular response, exit the loop
        break;
      }

      // If we got a real response (not just clarification loop exit)
      if (response.text) {
        // Auto-generate title after first successful response
        if (isFirstMessage) {
          const llmClient = session.getLLMClient();
          if (llmClient) {
            const title = await generateTitleFromPrompt(userInput, llmClient);
            session.setTitle(title);
            printInfo(`✓ Wygenerowano tytuł sesji: "${title}"`);
          }
        }

        // Get token information
        const [totalTokens, remainingTokens, maxTokens] = await session.getTokenInfo();

        // Display response
        printAssistant(`\n${session.assistantName}: ${response.text}`);
        printInfo(`Tokens: ${totalTokens} (Pozostało: ${remainingTokens} / ${maxTokens})`);
      }

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
