import { getSessionManager } from './session/index.js';
import { printError, printInfo, displayHelp } from './cli/console.js';
import { listSessionsCommand } from './commands/sessionList.js';
import { displayFullSession } from './commands/sessionDisplay.js';
import { exportSessionToPdf } from './commands/sessionToPdf.js';
import { removeSessionCommand } from './commands/sessionRemove.js';
import { displayHistorySummary } from './commands/sessionSummary.js';
import { renameSessionCommand } from './commands/sessionRename.js';
import { listAssistants } from './assistant/assistants.js';

const VALID_SLASH_COMMANDS = ['/exit', '/quit', '/switch', '/help', '/session', '/pdf', '/assistant'];

/**
 * Handles slash commands. Returns True if the program should exit.
 */
export async function handleCommand(userInput: string): Promise<boolean> {
  const parts = userInput.split(/\s+/);
  const command = parts[0].toLowerCase();

  const manager = getSessionManager();

  // Check if the main command is valid
  if (!VALID_SLASH_COMMANDS.includes(command)) {
    printError(`Błąd: Nieznana komenda: ${command}. Użyj /help.`);
    const current = manager.getCurrentSession();
    displayHelp(current.getSessionId());
    return false;
  }

  // Help command
  if (command === '/help') {
    const current = manager.getCurrentSession();
    displayHelp(current.getSessionId());
  }

  // Exit commands
  if (command === '/exit' || command === '/quit') {
    printInfo('\nZakończenie czatu. Uruchamianie procedury finalnego zapisu...');
    return true;
  }

  // Switch command
  else if (command === '/switch') {
    if (parts.length === 2) {
      const newId = parts[1];
      const current = manager.getCurrentSession();
      if (newId === current.getSessionId()) {
        printInfo('Jesteś już w tej sesji.');
      } else {
        const [newSession, saveAttempted, previousSessionId, loadSuccessful, loadError, hasHistory] =
          await manager.switchToSession(newId);

        // Handle console output for save attempt
        if (saveAttempted) {
          printInfo(`\nZapisuję bieżącą sesję: ${previousSessionId}...`);
        }

        // Handle load result
        if (!loadSuccessful) {
          printError(`Nie można wczytać sesji o ID: ${newId}. ${loadError}`);
        } else if (newSession) {
          // Successfully switched
          printInfo(`\n--- Przełączono na sesję: ${newSession.getSessionId()} ---`);
          displayHelp(newSession.getSessionId());

          // Display history summary if session has content
          if (hasHistory) {
            displayHistorySummary(await newSession.getHistory(), newSession.assistantName);
          }
        }
      }
    } else {
      printError('Błąd: Użycie: /switch <SESSION-ID>');
    }
  }

  // Session subcommands
  else if (command === '/session') {
    if (parts.length < 2) {
      printError('Błąd: Komenda /session wymaga podkomendy (list, display, pop, clear, new, rename, remove).');
    } else {
      await handleSessionSubcommand(parts.slice(1), manager);
    }
  }

  // PDF export
  else if (command === '/pdf') {
    const current = manager.getCurrentSession();
    await exportSessionToPdf(await current.getHistory(), current.getSessionId(), current.assistantName);
  }

  // Assistant management
  else if (command === '/assistant') {
    if (parts.length < 2) {
      printError('Błąd: Komenda /assistant wymaga podkomendy (list, switch).');
    } else {
      await handleAssistantSubcommand(parts.slice(1), manager);
    }
  }

  return false;
}

/**
 * Handles /session subcommands.
 */
async function handleSessionSubcommand(parts: string[], manager: ReturnType<typeof getSessionManager>): Promise<void> {
  const subcommand = parts[0].toLowerCase();
  const current = manager.getCurrentSession();

  if (subcommand === 'list') {
    listSessionsCommand();
  } else if (subcommand === 'display') {
    displayFullSession(await current.getHistory(), current.getSessionId(), current.assistantName);
  } else if (subcommand === 'pop') {
    const success = await current.popLastExchange();
    if (success) {
      printInfo(`Usunięto ostatnią parę wpisów (TY i ${current.assistantName}).`);
      displayHistorySummary(await current.getHistory(), current.assistantName);
    } else {
      printError('Błąd: Historia jest pusta lub niekompletna (wymaga co najmniej jednej pary).');
    }
  } else if (subcommand === 'clear') {
    await current.clearHistory();
    printInfo('Historia bieżącej sesji została wyczyszczona.');
  } else if (subcommand === 'new') {
    const [newSession, saveAttempted, previousSessionId, saveError] = await manager.createNewSession(true);

    // Handle console output for save attempt
    if (saveAttempted) {
      printInfo(`\nZapisuję bieżącą sesję: ${previousSessionId} przed rozpoczęciem nowej...`);
      if (saveError) {
        printError(`Błąd podczas zapisu: ${saveError}`);
      }
    }

    // Display new session info
    printInfo(`\n--- Rozpoczęto nową sesję: ${newSession.getSessionId()} ---`);
    displayHelp(newSession.getSessionId());
  } else if (subcommand === 'remove') {
    await removeSessionCommand(manager);
  } else if (subcommand === 'rename') {
    const newTitle = parts.slice(1).join(' ');
    await renameSessionCommand(manager, newTitle);
  } else {
    printError(`Błąd: Nieznana podkomenda dla /session: ${subcommand}. Użyj /help.`);
  }
}

/**
 * Handles /assistant subcommands.
 */
async function handleAssistantSubcommand(parts: string[], manager: ReturnType<typeof getSessionManager>): Promise<void> {
  const subcommand = parts[0].toLowerCase();
  const current = manager.getCurrentSession();

  if (subcommand === 'list') {
    // Display available assistants
    printInfo('\n=== Dostępni asystenci ===');
    const assistants = listAssistants();
    assistants.forEach(assistant => {
      const currentMarker = assistant.id === current.assistantId ? ' (AKTUALNY)' : '';
      printInfo(`\n${assistant.name}${currentMarker}`);
      printInfo(`  ID: ${assistant.id}`);
      printInfo(`  Opis: ${assistant.description}`);
    });
    printInfo('\nUżycie: /assistant switch <ID>');
  } else if (subcommand === 'switch') {
    if (parts.length < 2) {
      printError('Błąd: Użycie: /assistant switch <ID>');
      printInfo('Aby zobaczyć listę dostępnych asystentów, użyj: /assistant list');
    } else {
      const assistantId = parts[1].toLowerCase();

      // Check if already using this assistant
      if (assistantId === current.assistantId) {
        printInfo(`Już używasz asystenta: ${current.assistantName}`);
        return;
      }

      try {
        await manager.switchAssistantInCurrentSession(assistantId);
        printInfo(`\n✓ Przełączono na asystenta: ${current.assistantName}`);
        printInfo('Historia konwersacji została zachowana.');
      } catch (error) {
        if (error instanceof Error) {
          printError(`Błąd: ${error.message}`);
        } else {
          printError('Błąd podczas przełączania asystenta.');
        }
        printInfo('Aby zobaczyć listę dostępnych asystentów, użyj: /assistant list');
      }
    }
  } else {
    printError(`Błąd: Nieznana podkomenda dla /assistant: ${subcommand}. Użyj /help.`);
  }
}
