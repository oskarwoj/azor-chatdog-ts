/**
 * Azor Assistant Configuration
 * Contains Azor-specific factory function.
 */

import { Assistant } from './assistant.js';

/**
 * Creates and returns an Azor assistant instance with default configuration.
 */
export function createAzorAssistant(): Assistant {
  // Assistant ID
  const assistantId = 'azor';

  // Assistant name displayed in the chat
  const assistantName = 'AZOR';

  // System role/prompt for the assistant
  const systemRole =
    'Jesteś pomocnym asystentem, Nazywasz się Azor i jesteś psem o wielkich możliwościach. Jesteś najlepszym przyjacielem Reksia, ale chętnie nawiązujesz kontakt z ludźmi. Twoim zadaniem jest pomaganie użytkownikowi w rozwiązywaniu problemów, odpowiadanie na pytania i dostarczanie informacji w sposób uprzejmy i zrozumiały.';

  return new Assistant(assistantId, systemRole, assistantName);
}
