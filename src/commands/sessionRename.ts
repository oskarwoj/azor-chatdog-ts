/**
 * Session rename command implementation
 */

import type { SessionManager } from '../session/sessionManager.js';
import { printError, printInfo } from '../cli/console.js';

/**
 * Renames the current session title.
 * Usage: /session rename <new title>
 */
export async function renameSessionCommand(
  manager: SessionManager,
  newTitle: string
): Promise<void> {
  if (!newTitle || !newTitle.trim()) {
    printError('Błąd: Podaj nowy tytuł sesji. Użycie: /session rename <nowy tytuł>');
    return;
  }

  const session = manager.getCurrentSession();
  const trimmedTitle = newTitle.trim();

  session.setTitle(trimmedTitle);

  const [success, error] = await session.saveToFile();

  if (!success && error) {
    printError(`Błąd podczas zapisywania tytułu: ${error}`);
    return;
  }

  printInfo(`✓ Zmieniono tytuł sesji na: "${trimmedTitle}"`);
}
