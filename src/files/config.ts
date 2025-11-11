import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

// Application configuration
export const LOG_DIR = join(homedir(), '.azor');
export const OUTPUT_DIR = join(LOG_DIR, 'output');
export const WAL_FILE = join(LOG_DIR, 'azor-wal.json');

// Create directories if they don't exist
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}
