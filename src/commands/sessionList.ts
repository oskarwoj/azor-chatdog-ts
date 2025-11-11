import { listSessions } from '../files/sessionFiles.js';
import { printHelp, printError } from '../cli/console.js';

/**
 * Displays a formatted list of available sessions.
 */
export function listSessionsCommand(): void {
  const sessions = listSessions();

  if (sessions.length > 0) {
    printHelp('\n--- Dostępne zapisane sesje (ID) ---');

    for (const session of sessions) {
      if (session.error) {
        printError(`- ID: ${session.id} (${session.error})`);
      } else {
        printHelp(
          `- ID: ${session.id} (Wiadomości: ${session.messages_count}, Ost. aktywność: ${session.last_activity})`
        );
      }
    }

    printHelp('------------------------------------');
  } else {
    printHelp('\nBrak zapisanych sesji.');
  }
}
