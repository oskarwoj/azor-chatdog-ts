import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { WAL_FILE } from './config.js';

interface WALEntry {
  timestamp: string;
  session_id: string;
  model: string;
  prompt: string;
  response: string;
  tokens_used: number;
}

/**
 * Appends a transaction to the WAL (Write-Ahead Log) file.
 *
 * @returns [success, error_message]
 */
export function appendToWAL(
  sessionId: string,
  prompt: string,
  responseText: string,
  totalTokens: number,
  modelName: string
): [boolean, string | null] {
  const walEntry: WALEntry = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    model: modelName,
    prompt,
    response: responseText,
    tokens_used: totalTokens
  };

  try {
    let data: WALEntry[] = [];

    if (existsSync(WAL_FILE) && statSync(WAL_FILE).size > 0) {
      try {
        const fileContent = readFileSync(WAL_FILE, 'utf-8');
        data = JSON.parse(fileContent);
      } catch (error) {
        if (error instanceof SyntaxError) {
          // Actually reset the corrupted file
          data = [];
          writeFileSync(WAL_FILE, JSON.stringify(data, null, 4), 'utf-8');
          // Continue with empty data instead of failing
        } else {
          throw error;
        }
      }
    }

    data.push(walEntry);

    writeFileSync(WAL_FILE, JSON.stringify(data, null, 4), 'utf-8');
    return [true, null];
  } catch (error) {
    return [false, `Error writing to WAL file (${WAL_FILE}): ${error}`];
  }
}
