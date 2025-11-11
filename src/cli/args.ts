import { Command } from 'commander';

/**
 * Parses CLI arguments in search of --session-id.
 */
export function getSessionIdFromCLI(): string | null {
  const program = new Command();

  program
    .description('Interaktywny pies asystent! 🐶')
    .option('--session-id <id>', 'ID sesji do wczytania i kontynuowania (np. a1b2c3d4-log.json -> a1b2c3d4)')
    .parse(process.argv);

  const options = program.opts();
  return options.sessionId || null;
}
