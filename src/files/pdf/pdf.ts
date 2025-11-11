import PDFDocument from 'pdfkit';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { OUTPUT_DIR } from '../config.js';
import { printInfo } from '../../cli/console.js';
import MarkdownIt from 'markdown-it';

/**
 * Generates a PDF file from markdown content.
 *
 * @param markdownContent - The markdown content to convert to PDF
 * @param outputFilename - The name of the output PDF file
 */
export function generatePdfFromMarkdown(markdownContent: string, outputFilename: string): void {
  const md = new MarkdownIt();
  const htmlContent = md.render(markdownContent);

  // Create PDF document
  const doc = new PDFDocument({
    autoFirstPage: true,
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    }
  });

  const finalFilename = join(OUTPUT_DIR, outputFilename);
  const targetDir = dirname(finalFilename);

  // Create target directory if it doesn't exist
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Create write stream
  const stream = createWriteStream(finalFilename);
  doc.pipe(stream);

  // Parse the markdown content and add to PDF
  // Split by lines and process
  const lines = markdownContent.split('\n');

  for (const line of lines) {
    if (!line.trim()) {
      // Empty line - add spacing
      doc.moveDown(0.5);
      continue;
    }

    if (line.startsWith('# ')) {
      // Main heading
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(line.substring(2), { align: 'left' })
        .moveDown(1);
    } else if (line.startsWith('## ')) {
      // Subheading
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(line.substring(3), { align: 'left' })
        .moveDown(0.5);
    } else if (line.startsWith('### ')) {
      // Sub-subheading
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(line.substring(4), { align: 'left' })
        .moveDown(0.5);
    } else {
      // Regular text
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(line, { align: 'left' })
        .moveDown(0.3);
    }
  }

  // Finalize PDF
  doc.end();

  // Wait for the stream to finish
  stream.on('finish', () => {
    printInfo(`PDF file: ${finalFilename} generated successfully.`);
  });

  stream.on('error', (error) => {
    throw new Error(`Failed to write PDF: ${error}`);
  });
}
