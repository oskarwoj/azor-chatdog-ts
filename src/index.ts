#!/usr/bin/env node

import { initChat, mainLoop } from './chat.js';

/**
 * Main entry point for the Azor ChatDog application
 */
async function main(): Promise<void> {
  await initChat();
  await mainLoop();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
