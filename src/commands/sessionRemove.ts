import { printInfo, printWarning, displayHelp } from '../cli/console.js';
import type { SessionManager } from '../session/sessionManager.js';

/**
 * Handles the logic for removing the current session and starting a new one.
 *
 * @param manager - The session manager instance
 */
export async function removeSessionCommand(manager: SessionManager): Promise<void> {
  const [newSession, removedSessionId, success, error] =
    await manager.removeCurrentSessionAndCreateNew();

  if (success) {
    printInfo(`Pomyślnie usunięto plik sesji dla ID: ${removedSessionId}`);
  } else {
    // Even if the file removal failed (e.g., file not found), a new session is created.
    printWarning(`Nie można usunąć pliku sesji dla ID: ${removedSessionId}. Powód: ${error}`);
  }

  printInfo(`\n--- Rozpoczęto nową, anonimową sesję: ${newSession.getSessionId()} ---`);
  displayHelp(newSession.getSessionId());
}
