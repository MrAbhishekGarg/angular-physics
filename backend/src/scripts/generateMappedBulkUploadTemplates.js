import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import ExcelJS from 'exceljs';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'templates');
const DOCX_OUTPUT_PATH = path.join(TEMPLATES_DIR, 'mapped-questions-template.docx');
const EXCEL_OUTPUT_PATH = path.join(TEMPLATES_DIR, 'mapped-questions-mapping-template.xlsx');

const bold = (text) => new TextRun({ text, bold: true });
const plain = (text) => new TextRun({ text });

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({ text: 'Angular Physics — Word + Excel Mapped Upload (Questions)', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({
          children: [
            plain(
              'Type questions and options here — nothing else. No "Answer:", "Marks:", or "[CC:...]" tags needed; all of that goes in the paired Excel mapping sheet instead, matched to a question by its number below (Q1, Q2, ...). Upload both files together from the Question Bank’s "Bulk Upload — Word + Excel Mapping" section.'
            ),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({ text: 'Format rules', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [bold('Q<number>.'), plain('  starts each question — the number is what the Excel sheet matches against, so number them exactly as you want them referenced (gaps and reordering are fine as long as the Excel sheet uses the same numbers).')] }),
        new Paragraph({ children: [bold('A) B) C) D)'), plain('  list the options, one per line. Leave them out entirely for a numerical question.')], spacing: { after: 200 } }),

        new Paragraph({ text: 'Example questions (copy this pattern)', heading: HeadingLevel.HEADING_2 }),

        new Paragraph({ children: [bold('Q1. A ball is dropped from rest. What is its acceleration near Earth’s surface?')], spacing: { before: 200 } }),
        new Paragraph({ text: 'A) 0 m/s^2' }),
        new Paragraph({ text: 'B) 9.8 m/s^2' }),
        new Paragraph({ text: 'C) 4.9 m/s^2' }),
        new Paragraph({ text: 'D) 19.6 m/s^2', spacing: { after: 200 } }),

        new Paragraph({ children: [bold('Q2. Which of the following are vector quantities?')] }),
        new Paragraph({ text: 'A) Speed' }),
        new Paragraph({ text: 'B) Velocity' }),
        new Paragraph({ text: 'C) Displacement' }),
        new Paragraph({ text: 'D) Distance', spacing: { after: 200 } }),

        new Paragraph({ children: [bold('Q3. A ball falls freely from rest for 2 seconds. Find the distance fallen in metres. (g = 10 m/s^2)')], spacing: { after: 200 } }),

        new Paragraph({
          children: [plain('Delete these example questions and replace them with your own — just keep matching numbers in both files.')],
        }),
      ],
    },
  ],
});

const docxBuffer = await Packer.toBuffer(doc);
writeFileSync(DOCX_OUTPUT_PATH, docxBuffer);
console.log(`Wrote ${docxBuffer.length} bytes to ${DOCX_OUTPUT_PATH}`);

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Mapping');
sheet.columns = [
  { header: 'Question Number', key: 'number', width: 16 },
  { header: 'Type', key: 'type', width: 14 },
  { header: 'Concept Code(s)', key: 'conceptCodes', width: 20 },
  { header: 'Exam Type(s)', key: 'examTypes', width: 24 },
  { header: 'Subject', key: 'subject', width: 14 },
  { header: 'Chapter', key: 'chapter', width: 20 },
  { header: 'Topic', key: 'topic', width: 20 },
  { header: 'Answer', key: 'answer', width: 12 },
  { header: 'Marks', key: 'marks', width: 8 },
  { header: 'Negative', key: 'negative', width: 10 },
  { header: 'Tolerance', key: 'tolerance', width: 10 },
  { header: 'Author', key: 'author', width: 20 },
  { header: 'Tag(s)', key: 'tags', width: 20 },
  { header: 'PYQ', key: 'pyq', width: 8 },
  { header: 'PYQ Year', key: 'pyqYear', width: 10 },
  { header: 'Difficulty', key: 'difficulty', width: 12 },
];
sheet.getRow(1).font = { bold: true };

sheet.addRows([
  { number: 1, type: 'mcq-single', conceptCodes: 'PHY-MECH-012, PHY-KIN-003', examTypes: 'jee-main, neet', subject: 'Physics', chapter: '', topic: '', answer: 'B', marks: 4, negative: 1, tolerance: '', author: 'Abhishek Garg', tags: 'Must Do', pyq: '', pyqYear: '', difficulty: 'easy' },
  { number: 2, type: 'mcq-multiple', conceptCodes: '', examTypes: 'jee-advanced', subject: 'Physics', chapter: 'Kinematics', topic: 'Vectors', answer: 'B, C', marks: 4, negative: 1, tolerance: '', author: 'NCERT', tags: 'Tricky, Revision', pyq: 'yes', pyqYear: 2023, difficulty: 'medium' },
  { number: 3, type: 'numerical', conceptCodes: '', examTypes: 'none', subject: 'Physics', chapter: 'Kinematics', topic: 'Free Fall', answer: 20, marks: 4, negative: 0, tolerance: 0.5, author: '', tags: '', pyq: '', pyqYear: '', difficulty: 'medium' },
]);

const notesSheet = workbook.addWorksheet('Instructions');
notesSheet.getColumn(1).width = 100;
notesSheet.addRow(['One row per question — Question Number must match the "Q<number>." in the paired Word doc.']).font = { bold: true };
notesSheet.addRow(['Type: mcq-single, mcq-multiple, or numerical. Leave blank to infer from the doc (numerical if no options, else mcq-single).']);
notesSheet.addRow(['Concept Code(s): comma-separated — a question can carry more than one (e.g. "PHY-MECH-012, PHY-KIN-003") when it genuinely spans linked concepts. Chapter/topic come from the first recognized code, winning over the Chapter/Topic columns and the upload form’s batch defaults. Concept codes don’t carry an exam type — that’s still set independently via the Exam Type(s) column or the upload form’s batch default.']);
notesSheet.addRow(['Exam Type(s): comma-separated — a question can belong to several exams (e.g. "jee-main, neet"), exactly one, or none. Write "none" to explicitly leave it unmapped even if the upload form has a default exam type set; leave the cell blank to fall back to that default. Valid values: jee-main, jee-advanced, neet, olympiad, foundation, crash-course.']);
notesSheet.addRow(['Answer: option letter(s) for MCQs (e.g. "A" or "B, C"), or the numeric value for numerical questions. Required — a question with no answer here (and none typed inline in the doc) is skipped.']);
notesSheet.addRow(['Marks/Negative/Tolerance: default to 4/1/0 when left blank.']);
notesSheet.addRow(['Tag(s): comma-separated free-text labels (e.g. "Tricky, Revision") — anything you want to filter a paper by beyond chapter/topic/author.']);
notesSheet.addRow(['PYQ: yes/no (or true/false). PYQ Year only matters when PYQ is yes.']);
notesSheet.addRow(['Subject/Chapter/Topic/Author/Difficulty left blank fall back to whatever you set on the upload form for the whole batch.']);

await workbook.xlsx.writeFile(EXCEL_OUTPUT_PATH);
console.log(`Wrote ${EXCEL_OUTPUT_PATH}`);
