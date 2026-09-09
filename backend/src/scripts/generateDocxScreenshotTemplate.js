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
              'This document holds nothing but pasted screenshots — no typed question text, no answers, no marks. ' +
                'Everything is matched purely by position: a "Q<number>." line marks a new question, and an ' +
                '"A)"/"B)"/"C)"/"D)" line marks an option. Paste that item\'s screenshot on the very next line ' +
                '(pasting on the same line right after the marker also works). Answers, marks, chapter, etc. all ' +
                'come from the paired Excel mapping sheet, matched by the same question numbers.'
            ),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({ text: 'Format', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [bold('Q<number>.'), plain(' on its own line, then the stem/diagram screenshot on the next line.')] }),
        new Paragraph({ children: [bold('A) B) C) D)'), plain(' each on their own line, each followed by that option\'s screenshot. Leave them out entirely for a numerical question — just the stem screenshot.')], spacing: { after: 200 } }),

        new Paragraph({ text: 'Fill in below (delete this text first)', heading: HeadingLevel.HEADING_2 }),

        new Paragraph({ children: [bold('Q1.')], spacing: { before: 200 } }),
        new Paragraph({ text: '[paste the stem/diagram screenshot here]' }),
        new Paragraph({ children: [bold('A)')] }),
        new Paragraph({ text: '[paste option A here]' }),
        new Paragraph({ children: [bold('B)')] }),
        new Paragraph({ text: '[paste option B here]' }),
        new Paragraph({ children: [bold('C)')] }),
        new Paragraph({ text: '[paste option C here]' }),
        new Paragraph({ children: [bold('D)')] }),
        new Paragraph({ text: '[paste option D here]', spacing: { after: 200 } }),

        new Paragraph({ children: [bold('Q2.')] }),
        new Paragraph({ text: '[paste the next question\'s stem/diagram screenshot here — repeat the A)/B)/C)/D) pattern above, or omit them entirely for a numerical question]' }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUTPUT_PATH, buffer);
console.log(`Wrote ${buffer.length} bytes to ${OUTPUT_PATH}`);
