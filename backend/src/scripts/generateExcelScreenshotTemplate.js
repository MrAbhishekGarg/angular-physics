import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'templates');
const EXCEL_OUTPUT_PATH = path.join(TEMPLATES_DIR, 'screenshot-questions-template.xlsx');

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Questions');
sheet.columns = [
  { header: 'Question Number', key: 'number', width: 16 },
  { header: 'Stem', key: 'stem', width: 30 },
  { header: 'Option A', key: 'optionA', width: 24 },
  { header: 'Option B', key: 'optionB', width: 24 },
  { header: 'Option C', key: 'optionC', width: 24 },
  { header: 'Option D', key: 'optionD', width: 24 },
  { header: 'Answer', key: 'answer', width: 12 },
  { header: 'Marks', key: 'marks', width: 8 },
  { header: 'Negative', key: 'negative', width: 10 },
  { header: 'Tolerance', key: 'tolerance', width: 10 },
  { header: 'Chapter', key: 'chapter', width: 20 },
  { header: 'Topic', key: 'topic', width: 20 },
  { header: 'Concept Code(s)', key: 'conceptCodes', width: 20 },
  { header: 'Exam Type(s)', key: 'examTypes', width: 24 },
  { header: 'Subject', key: 'subject', width: 14 },
  { header: 'Author', key: 'author', width: 20 },
  { header: 'Tag(s)', key: 'tags', width: 20 },
  { header: 'PYQ', key: 'pyq', width: 8 },
  { header: 'PYQ Year', key: 'pyqYear', width: 10 },
  { header: 'Difficulty', key: 'difficulty', width: 12 },
];
sheet.getRow(1).font = { bold: true };
sheet.getRow(1).height = 20;

// A few tall, empty example rows — real content is pasted screenshots, not
// typed text, so there's nothing to demonstrate beyond the metadata columns.
sheet.addRows([
  { number: 1, answer: 'B', marks: 4, negative: 1, difficulty: 'easy' },
  { number: 2, answer: 20, marks: 4, negative: 0, tolerance: 0.5, difficulty: 'medium' },
  { number: 3, answer: 'A, C', marks: 4, negative: 1, difficulty: 'medium' },
]);
for (let r = 2; r <= 4; r += 1) sheet.getRow(r).height = 60;

const notesSheet = workbook.addWorksheet('Instructions');
notesSheet.getColumn(1).width = 100;
notesSheet.addRow(['One row per question — paste a screenshot directly into the Stem/Option cells (Ctrl+V after copying).']).font = { bold: true };
notesSheet.addRow(['Stem: the question text/diagram/equation, screenshotted and pasted into this cell.']);
notesSheet.addRow(['Option A-D: each option, screenshotted and pasted into its own cell. Leave all four blank for a numerical question.']);
notesSheet.addRow(['Keep each question\'s row tall enough that its pasted images don\'t visually overlap into the next row — a pasted image is matched to whichever row/column it\'s anchored nearest to, so a misaligned paste can land in the wrong question.']);
notesSheet.addRow(['Answer: option letter(s) for MCQs (e.g. "A" or "B, C"), or the numeric value for numerical questions. Required.']);
notesSheet.addRow(['Marks/Negative/Tolerance: default to 4/1/0 when left blank.']);
notesSheet.addRow(['Concept Code(s): comma-separated — chapter/topic come from the first recognized code, winning over the Chapter/Topic columns and the upload form\'s batch defaults.']);
notesSheet.addRow(['Exam Type(s): comma-separated (e.g. "jee-main, neet"). Write "none" to explicitly leave unmapped; leave blank to fall back to the upload form\'s default. Valid values: jee-main, jee-advanced, neet, olympiad, foundation, crash-course.']);
notesSheet.addRow(['Tag(s): comma-separated free-text labels (e.g. "Tricky, Revision").']);
notesSheet.addRow(['PYQ: yes/no (or true/false). PYQ Year only matters when PYQ is yes.']);
notesSheet.addRow(['Subject/Chapter/Topic/Author/Difficulty left blank fall back to whatever you set on the upload form for the whole batch.']);

await workbook.xlsx.writeFile(EXCEL_OUTPUT_PATH);
console.log(`Wrote ${EXCEL_OUTPUT_PATH}`);
