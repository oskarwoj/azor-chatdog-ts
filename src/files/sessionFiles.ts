import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { LOG_DIR } from './config.js';
import type { ChatHistory, SessionMetadata, Message } from '../types.js';

/**
 * Type for serialized message format in JSON files.
 * This format flattens the message structure for storage.
 */
interface SerializedMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

/**
 * Type for session metadata as stored in JSON files.
 */
interface StoredSessionMetadata {
  session_id: string;
  model: string;
  system_role: string;
  history: SerializedMessage[];
}

/**
 * Loads session history from a JSON file in universal format.
 *
 * @returns [conversation_history, error_message]
 */
export function loadSessionHistory(sessionId: string): [ChatHistory, string | null] {
  const logFilename = join(LOG_DIR, `${sessionId}-log.json`);

  if (!existsSync(logFilename)) {
    return [[], `Session log file '${logFilename}' does not exist. Starting new session.`];
  }

  try {
    const fileContent = readFileSync(logFilename, 'utf-8');
    const logData = JSON.parse(fileContent) as StoredSessionMetadata;

    // Convert JSON data to universal format
    const history: ChatHistory = logData.history.map(entry => ({
      role: entry.role,
      parts: [{ text: entry.text }],
      timestamp: entry.timestamp
    }));

    return [history, null];
  } catch (error) {
    if (error instanceof SyntaxError) {
      return [[], `Cannot decode log file '${logFilename}'. Starting new session.`];
    }
    return [[], `Error reading session file: ${error}`];
  }
}

/**
 * Saves the current session history to a JSON file.
 * Only saves if the history contains at least one complete turn (User + Model).
 *
 * @returns [success, error_message]
 */
export function saveSessionHistory(
  sessionId: string,
  history: ChatHistory,
  systemPrompt: string,
  modelName: string
): [boolean, string | null] {
  if (history.length < 2) {
    // Prevents saving empty/incomplete session
    return [true, null];
  }

  const logFilename = join(LOG_DIR, `${sessionId}-log.json`);

  const jsonHistory: SerializedMessage[] = history.map(content => ({
    role: content.role,
    timestamp: content.timestamp || new Date().toISOString(),
    text: content.parts[0]?.text || ''
  }));

  const logData: StoredSessionMetadata = {
    session_id: sessionId,
    model: modelName,
    system_role: systemPrompt,
    history: jsonHistory
  };

  try {
    writeFileSync(logFilename, JSON.stringify(logData, null, 4), 'utf-8');
    return [true, null];
  } catch (error) {
    return [false, `Error writing to file ${logFilename}: ${error}`];
  }
}

/**
 * Returns a list of available sessions with their metadata.
 */
export function listSessions(): Array<{
  id: string;
  messages_count?: number;
  last_activity?: string;
  error?: string;
}> {
  const files = readdirSync(LOG_DIR);
  const sessionIds = files
    .filter(f => f.endsWith('-log.json') && f !== 'azor-wal.json')
    .map(f => f.replace('-log.json', ''))
    .sort();

  const sessionsData = sessionIds.map(sid => {
    const logPath = join(LOG_DIR, `${sid}-log.json`);
    try {
      const fileContent = readFileSync(logPath, 'utf-8');
      const logData = JSON.parse(fileContent) as StoredSessionMetadata;
      const historyLen = logData.history?.length || 0;
      const lastMsgTimeStr = logData.history[historyLen - 1]?.timestamp || 'Brak daty';

      let timeStr = 'Brak aktywności';
      if (lastMsgTimeStr !== 'Brak daty') {
        try {
          const dt = new Date(lastMsgTimeStr);
          timeStr = dt.toLocaleString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          // Keep default timeStr
        }
      }

      return {
        id: sid,
        messages_count: historyLen,
        last_activity: timeStr,
        error: undefined
      };
    } catch {
      return {
        id: sid,
        error: 'BŁĄD ODCZYTU PLIKU'
      };
    }
  });

  return sessionsData;
}

/**
 * Removes a session log file from the filesystem.
 *
 * @returns [success, error_message]
 */
export function removeSessionFile(sessionId: string): [boolean, string | null] {
  const logFilename = join(LOG_DIR, `${sessionId}-log.json`);

  if (!existsSync(logFilename)) {
    return [false, `Session file for ID '${sessionId}' not found.`];
  }

  try {
    unlinkSync(logFilename);
    return [true, null];
  } catch (error) {
    return [false, `Error removing session file '${logFilename}': ${error}`];
  }
}
