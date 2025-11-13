import { listSessions } from '../files/sessionFiles.js';
import { printHelp, printError } from '../cli/console.js';

/**
 * Displays a formatted list of available sessions.
 */
export function listSessionsCommand(): void {
  const sessions = listSessions();

  if (sessions.length > 0) {
    printHelp('\n--- Dostępne zapisane sesje ---');

    for (const session of sessions) {
      if (session.error) {
        printError(`- ID: ${session.id} (${session.error})`);
      } else {
        // Display title with short ID if title exists, otherwise show full ID
        const shortId = session.id.substring(0, 8);
        let displayText: string;

        if (session.title) {
          displayText = `- ${session.title} (ID: ${shortId}...)`;
        } else {
          displayText = `- ID: ${session.id}`;
        }

        displayText += ` (Wiadomości: ${session.messages_count}, Ost. aktywność: ${session.last_activity})`;
        printHelp(displayText);
      }
    }

    printHelp('----------------------------------');
  } else {
    printHelp('\nBrak zapisanych sesji.');
  }
}
