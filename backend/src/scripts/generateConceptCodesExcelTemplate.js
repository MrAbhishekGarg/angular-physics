import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'templates', 'bulk-concept-codes-template.xlsx');

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Concept Codes');

sheet.columns = [
  { header: 'Code', key: 'code', width: 20 },
  { header: 'Label', key: 'label', width: 40 },
  { header: 'Chapter', key: 'chapter', width: 24 },
  { header: 'Topic', key: 'topic', width: 24 },
];
sheet.getRow(1).font = { bold: true };

sheet.addRows([
  { code: 'PHY-ELEC-045', label: "Current Electricity — Ohm's Law", chapter: 'Current Electricity', topic: "Ohm's Law" },
  { code: 'PHY-MECH-012', label: 'Newtonian Mechanics — Laws of Motion', chapter: 'Laws of Motion', topic: 'Friction' },
  { code: 'PHY-OPT-007', label: 'Ray Optics — Lens Formula', chapter: 'Ray Optics', topic: 'Lenses' },
]);

// A separate tab, not a row in the data sheet — the parser only reads the
// FIRST worksheet, so notes here can't accidentally get parsed as a data
// row (and a merged cell's value bleeds into every cell of that merge in
// ExcelJS, which would otherwise make one note row look like three
// malformed data rows to the parser).
const notesSheet = workbook.addWorksheet('Instructions');
notesSheet.getColumn(1).width = 100;
notesSheet.addRow(['Fill in the "Concept Codes" tab — one row per code.']).font = { bold: true };
notesSheet.addRow(['Chapter and Topic are optional.']);
notesSheet.addRow([
  'Exam type isn\'t set here — a code can be reused across questions from different exams, so exam type is still set per-question (batch default, Excel row, or docx tag) when the question itself is uploaded.',
]);
notesSheet.addRow([
  'Re-uploading a sheet updates existing codes instead of duplicating them — matched by Code, so edit and re-upload freely.',
]);

await workbook.xlsx.writeFile(OUTPUT_PATH);
console.log(`Wrote ${OUTPUT_PATH}`);
