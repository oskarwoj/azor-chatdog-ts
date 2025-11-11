import type { ChatHistory } from '../types.js';
import { printInfo, printError } from '../cli/console.js';
import { generatePdfFromMarkdown } from '../files/pdf/pdf.js';

/**
 * Exports the session history to a PDF file.
 *
 * @param history - List of messages in the format {"role": "user|model", "parts": [{"text": "..."}]}
 * @param sessionId - The ID of the session
 * @param assistantName - The name of the assistant to display
 */
export function exportSessionToPdf(
  history: ChatHistory,
  sessionId: string,
  assistantName: string
): void {
  if (!history || history.length === 0) {
    printInfo('Session history is empty. No PDF will be generated.');
    return;
  }

  let markdownContent = `# Chat Session: ${sessionId}\n\n`;

  for (const message of history) {
    const role = message.role || '';
    const displayRole = role === 'user' ? 'User' : assistantName;

    let text = '';
    if (message.parts && message.parts.length > 0) {
      text = message.parts[0].text || '';
    }

    markdownContent += `## ${displayRole}\n\n`;
    markdownContent += `${text}\n\n`;
  }

  const outputFilename = `${sessionId}.pdf`;

  try {
    generatePdfFromMarkdown(markdownContent, outputFilename);
  } catch (error) {
    printError(`Failed to generate PDF: ${error}`);
  }
}
