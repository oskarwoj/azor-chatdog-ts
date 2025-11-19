/**
 * Console output utilities for the chatbot.
 * Centralizes chalk usage for consistent terminal output.
 */
import chalk from 'chalk';
import { LOG_DIR } from '../files/config.js';

/**
 * Print an error message in red color.
 */
export function printError(message: string): void {
  console.log(chalk.red(message));
}

/**
 * Print an assistant message in cyan color.
 */
export function printAssistant(message: string): void {
  console.log(chalk.cyan(message));
}

/**
 * Print a user message in blue color.
 */
export function printUser(message: string): void {
  console.log(chalk.blue(message));
}

/**
 * Print an informational message.
 */
export function printInfo(message: string): void {
  console.log(message);
}

/**
 * Print a help message in yellow color.
 */
export function printHelp(message: string): void {
  console.log(chalk.yellow(message));
}

/**
 * Print a warning message in yellow color.
 */
export function printWarning(message: string): void {
  console.log(chalk.yellow(message));
}

/**
 * Displays a short help message.
 */
export function displayHelp(sessionId: string): void {
  printInfo(`Aktualna sesja (ID): ${sessionId}`);
  printInfo(`Pliki sesji są zapisywane na bieżąco w: ${LOG_DIR}`);
  printHelp('Dostępne komendy (slash commands):');
  printHelp('  /switch <ID>      - Przełącza na istniejącą sesję.');
  printHelp('  /help             - Wyświetla tę pomoc.');
  printHelp('  /exit, /quit      - Zakończenie czatu.');
  printHelp('\n  /session list     - Wyświetla listę dostępnych sesji.');
  printHelp('  /session display  - Wyświetla całą historię sesji.');
  printHelp('  /session pop      - Usuwa ostatnią parę wpisów (TY i asystent).');
  printHelp('  /session clear    - Czyści historię bieżącej sesji.');
  printHelp('  /session new      - Rozpoczyna nową sesję.');
  printHelp('\n  /pdf              - Eksportuje sesję do PDF.');
  printHelp('  /audio [--lang=KOD] - Odczytuje ostatnią odpowiedź asystenta (domyślnie: pl-PL).');
  printHelp('\n  /assistant list   - Wyświetla listę dostępnych asystentów.');
  printHelp('  /assistant switch <ID> - Przełącza na innego asystenta.');
}

/**
 * Displays instructions for continuing the session.
 */
export function displayFinalInstructions(sessionId: string): void {
  printInfo('\n--- Instrukcja Kontynuacji Sesji ---');
  printInfo(`Aby kontynuować tę sesję (ID: ${sessionId}) później, użyj komendy:`);
  console.log(chalk.white.bold(`\n    azor --session-id=${sessionId}\n`));
  console.log('--------------------------------------\n');
}
