/**
 * Session management singleton export
 */

import { SessionManager } from './sessionManager.js';

// Create singleton instance
const sessionManager = new SessionManager();

/**
 * Returns the singleton SessionManager instance
 */
export function getSessionManager(): SessionManager {
  return sessionManager;
}

// Also export the classes for direct use if needed
export { ChatSession } from './chatSession.js';
export { SessionManager } from './sessionManager.js';
