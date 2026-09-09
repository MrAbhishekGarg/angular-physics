import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'templates');
const OUTPUT_PATH = path.join(TEMPLATES_DIR, 'docx-screenshot-questions-template.docx');

const bold = (text) => new TextRun({ text, bold: true });
const plain = (text) => new TextRun({ text });

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({ text: 'Angular Physics — Screenshots in a Word Doc', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({
          children: [
            plain(
              'Everything is matched purely by position: a "Q<number>." line marks a new question, and an ' +
                '"A)"/"B)"/"C)"/"D)" line marks an option. For each one, either type its value directly right ' +
                'after the marker (e.g. "A) 1.2 J") if it\'s plain text, or paste a screenshot on the next line ' +
                '(or the same line) if it\'s an equation or diagram — never both unless it genuinely needs both. ' +
                'Whatever you type is stored exactly as typed, never re-parsed, so there\'s no equation/font ' +
                'garbling risk for typed content either. Answers, marks, chapter, etc. all come from the paired ' +
                'Excel mapping sheet, matched by the same question numbers — never from anything typed here.'
            ),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({ text: 'Format', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [bold('Q<number>.'), plain(' starts each question — type the stem directly if it\'s plain text, or paste a screenshot (same line or the next) if it has an equation/diagram.')] }),
        new Paragraph({ children: [bold('A) B) C) D)'), plain(' each mark an option — type or paste, same rule as the stem. Leave them out entirely for a numerical question.')], spacing: { after: 200 } }),

        new Paragraph({ text: 'Example — mostly typed, one option screenshotted', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [bold('Q1.')], spacing: { before: 200 } }),
        new Paragraph({ text: '[paste the stem screenshot here — this question\'s equation doesn\'t type cleanly]' }),
        new Paragraph({ text: 'A) 1.2 J' }),
        new Paragraph({ text: 'B) 1.5 J' }),
        new Paragraph({ text: 'C) 0.8 J' }),
        new Paragraph({ text: 'D) 1.0 J', spacing: { after: 200 } }),

        new Paragraph({ text: 'Example — fully typed, no screenshots needed', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [bold('Q2. A ball is dropped from rest. What is its acceleration near Earth’s surface?')], spacing: { before: 200 } }),
        new Paragraph({ text: 'A) 0' }),
        new Paragraph({ text: 'B) 9.8' }),
        new Paragraph({ text: 'C) 4.9' }),
        new Paragraph({ text: 'D) 19.6', spacing: { after: 200 } }),

        new Paragraph({
          children: [plain('Delete these example questions and replace them with your own — keep the same Q<number>./A)/B)/C)/D) marker pattern.')],
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUTPUT_PATH, buffer);
console.log(`Wrote ${buffer.length} bytes to ${OUTPUT_PATH}`);
