import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } from 'docx';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'templates', 'bulk-questions-template.docx');

const bold = (text) => new TextRun({ text, bold: true });
const plain = (text) => new TextRun({ text });

// A small solid-colour placeholder — stands in for a real diagram/equation
// image just to demonstrate that an embedded picture gets extracted and
// attached to the nearest question. Replace with an actual diagram/equation.
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({ text: 'Angular Physics — Bulk Question Upload Template', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({
          children: [
            plain(
              'Use this exact layout to bulk-upload questions into a test. Each question starts a new line with "Q1.", "Q2.", etc. Upload this .docx (or your own file following the same format) from the test editor’s "Bulk Upload Questions" section.'
            ),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({ text: 'Format rules', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [bold('Q<number>.'), plain('  starts each question. An optional type tag follows: '), bold('[mcq-single]'), plain(', '), bold('[mcq-multiple]'), plain(', or '), bold('[numerical]'), plain('. If omitted, the type is guessed from the answer/options.')] }),
        new Paragraph({ children: [bold('[CC:<code>]'), plain('  optional Concept Code tag, written next to the type tag in either order (e.g. "Q1. [CC:PHY-ELEC-045] [mcq-single] ..."). Maps this one question to a specific chapter/topic from the mentor-maintained Concept Code list, overriding the batch-level chapter/topic you pick on the upload form. Leave it out and the question just uses the batch defaults.')], spacing: { after: 100 } }),
        new Paragraph({ children: [plain('A question can carry more than one Concept Code — either comma-separated in one tag ('), bold('[CC:PHY-ELEC-045,PHY-MAG-012]'), plain('), or as repeated tags ('), bold('[CC:PHY-ELEC-045] [CC:PHY-MAG-012]'), plain('). Chapter/topic come from the first recognized code. Concept codes don’t set an exam type — that’s still up to the Exam Type(s) column or the upload form’s batch default.')], spacing: { after: 100 } }),
        new Paragraph({ children: [bold('A) B) C) D)'), plain('  list the options, one per line (MCQ types only).')] }),
        new Paragraph({ children: [bold('Answer:'), plain('  the correct option letter(s) for MCQs (e.g. "A" or "A, C" for multiple-answer), or the correct number for numerical questions.')] }),
        new Paragraph({ children: [bold('Marks:'), plain('  points for a correct answer. Defaults to 4 if omitted.')] }),
        new Paragraph({ children: [bold('Negative:'), plain('  points deducted for a wrong answer. Defaults to 1 if omitted.')] }),
        new Paragraph({ children: [bold('Tolerance:'), plain('  allowed +/- error for numerical answers. Defaults to 0 if omitted.')], spacing: { after: 200 } }),

        new Paragraph({ text: 'Diagrams, equations, and special symbols', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({
          children: [
            plain(
              'Every question and every option is rendered as a faithful picture of exactly what you typed in Word — the same text, fonts, Greek letters, superscripts/subscripts, MathType equations, Word’s own built-in Equation Editor, and any inserted diagrams. You don’t need to do anything special: just write the question normally, with real equations and images where they belong, and upload the file. There’s no more "unsupported format" case — whatever displays correctly in Word will display correctly on the portal.'
            ),
          ],
        }),
        new Paragraph({
          children: [
            plain(
              'The "Answer:", "Marks:", "Negative:", and "Tolerance:" lines are the only parts read as plain text (they drive grading), so keep those exactly as shown below — letters and numbers only.'
            ),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({ text: 'Example questions (copy this pattern)', heading: HeadingLevel.HEADING_2 }),

        new Paragraph({ children: [bold('Q1. [CC:PHY-MECH-012] [mcq-single] A ball is dropped from rest. What is its acceleration near Earth’s surface?')], spacing: { before: 200 } }),
        new Paragraph({ text: 'A) 0 m/s^2' }),
        new Paragraph({ text: 'B) 9.8 m/s^2' }),
        new Paragraph({ text: 'C) 4.9 m/s^2' }),
        new Paragraph({ text: 'D) 19.6 m/s^2' }),
        new Paragraph({ text: 'Answer: B' }),
        new Paragraph({ text: 'Marks: 4' }),
        new Paragraph({ text: 'Negative: 1', spacing: { after: 200 } }),

        new Paragraph({ children: [bold('Q2. [mcq-multiple] Which of the following are vector quantities?')] }),
        new Paragraph({ text: 'A) Speed' }),
        new Paragraph({ text: 'B) Velocity' }),
        new Paragraph({ text: 'C) Displacement' }),
        new Paragraph({ text: 'D) Distance' }),
        new Paragraph({ text: 'Answer: B, C' }),
        new Paragraph({ text: 'Marks: 4' }),
        new Paragraph({ text: 'Negative: 1', spacing: { after: 200 } }),

        new Paragraph({ children: [bold('Q3. [numerical] A ball falls freely from rest for 2 seconds. Find the distance fallen in metres. (g = 10 m/s^2)')] }),
        new Paragraph({ text: 'Answer: 20' }),
        new Paragraph({ text: 'Tolerance: 0.5' }),
        new Paragraph({ text: 'Marks: 4' }),
        new Paragraph({ text: 'Negative: 0', spacing: { after: 200 } }),

        new Paragraph({ children: [bold('Q4. [mcq-single] The picture below is a placeholder — this demonstrates that an inserted image is automatically attached to the question it appears in. Replace it with a real diagram or MathType equation.')] }),
        new Paragraph({
          children: [new ImageRun({ data: PLACEHOLDER_PNG, transformation: { width: 120, height: 60 }, type: 'png' })],
        }),
        new Paragraph({ text: 'A) True' }),
        new Paragraph({ text: 'B) False' }),
        new Paragraph({ text: 'Answer: A' }),
        new Paragraph({ text: 'Marks: 4' }),
        new Paragraph({ text: 'Negative: 1', spacing: { after: 200 } }),

        new Paragraph({
          children: [plain('Delete these example questions and replace them with your own before uploading, or leave them in to try the bulk-upload feature.')],
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUTPUT_PATH, buffer);
console.log(`[generate:template] Wrote ${buffer.length} bytes to ${OUTPUT_PATH}`);
