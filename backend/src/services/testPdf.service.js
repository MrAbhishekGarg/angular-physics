import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';
import { UPLOADS_ROOT } from '../middleware/upload.js';

const BRAND = 'Angular Physics';
const TAGLINE = 'Mentored by Abhishek Kumar Garg';
const MARGIN_TOP = 150;
const MARGIN_SIDE = 40;
const ANSWER_COLOR = '#0d9488';
const TABLE_BORDER_COLOR = '#e5e7eb';
const CELL_PADDING = 8;
const LETTER_COL_WIDTH = 16;
const QUESTION_IMAGE_MAX = { width: 300, height: 160 };
const OPTION_IMAGE_MAX_HEIGHT = 40;
const MIN_OPTION_ROW_HEIGHT = 28;
const NUMBER_COL_WIDTH = 26;

const TRACK_LABELS = {
  'jee-main': 'JEE Main',
  'jee-advanced': 'JEE Advanced',
  neet: 'NEET',
  olympiad: 'Physics Olympiad',
  foundation: 'Foundation',
  'crash-course': 'Crash Course',
};

function totalMarks(test) {
  return test.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
}

// question.imageUrl is a served path like "/uploads/question-images/xyz.png" —
// resolve it back to the file on disk. pdfkit needs a real path/buffer, not a URL.
function resolveImagePath(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return null;
  const absolutePath = path.join(UPLOADS_ROOT, imageUrl.slice('/uploads/'.length));
  return fs.existsSync(absolutePath) ? absolutePath : null;
}

function drawWatermark(doc) {
  const { width, height } = doc.page;
  doc.save();
  doc.rotate(-45, { origin: [width / 2, height / 2] });
  doc.fontSize(64).fillColor('#1e1b4b', 0.06).text(BRAND.toUpperCase(), 0, height / 2 - 40, { width, align: 'center' });
  doc.restore();
}

function drawHeader(doc, test, includeAnswers) {
  doc.fontSize(16).fillColor('#1e1b4b').text(BRAND, MARGIN_SIDE, 30);
  doc.fontSize(9).fillColor('#6b7280').text(TAGLINE, MARGIN_SIDE, 50);
  doc
    .fontSize(9)
    .fillColor('#6b7280')
    .text(new Date().toLocaleDateString('en-IN'), doc.page.width - 190, 30, { width: 150, align: 'right' });

  doc
    .moveTo(MARGIN_SIDE, 68)
    .lineTo(doc.page.width - MARGIN_SIDE, 68)
    .strokeColor('#e5e7eb')
    .stroke();

  doc.fontSize(14).fillColor('#111827').text(test.title, MARGIN_SIDE, 80);
  doc
    .fontSize(9)
    .fillColor('#374151')
    .text(
      `${TRACK_LABELS[test.examType] || test.examType} · Duration: ${test.durationMinutes} min · Max Marks: ${totalMarks(test)}`,
      MARGIN_SIDE,
      100
    );
  if (includeAnswers) {
    doc.fontSize(8).font('Helvetica-Bold').fillColor(ANSWER_COLOR).text('MENTOR COPY — Correct answers are shown in bold.', MARGIN_SIDE, 114);
    doc.font('Helvetica');
  } else {
    doc.fontSize(8).fillColor('#dc2626').text('Negative marking applies as indicated per question. No answers are printed on this paper.', MARGIN_SIDE, 114);
  }

  doc
    .moveTo(MARGIN_SIDE, 132)
    .lineTo(doc.page.width - MARGIN_SIDE, 132)
    .strokeColor('#e5e7eb')
    .stroke();
}

function drawFooter(doc, pageNumber) {
  // Footer sits below the page's content-margin boundary — pdfkit treats any
  // text() there as overflow and silently starts a new page unless the
  // bottom margin is temporarily cleared for this one draw.
  const originalBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  const y = doc.page.height - 40;
  doc.fontSize(8).fillColor('#9ca3af');
  doc.text(`${BRAND} · ${env.siteUrl}`, MARGIN_SIDE, y, { width: 300, lineBreak: false });
  doc.text(`Page ${pageNumber}`, doc.page.width - 140 - MARGIN_SIDE, y, { width: 100, align: 'right', lineBreak: false });

  doc.page.margins.bottom = originalBottomMargin;
}

/**
 * Renders a printable test paper — with a repeated header/footer and a
 * diagonal brand watermark on every page. By default this is the
 * student-facing blank paper (no answers, matching the same sanitization
 * rule used when a student attempts the test online). Pass
 * `{ includeAnswers: true }` for the mentor-facing copy: correct answers are
 * bolded inline within each question, and a tabular answer key is appended
 * on its own page at the end. Returns the PDFDocument stream; caller pipes
 * it to the HTTP response.
 */
export function generateTestPdf(test, { includeAnswers = false } = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN_TOP, bottom: 60, left: MARGIN_SIDE, right: MARGIN_SIDE },
    bufferPages: true,
  });

  let pageNumber = 1;
  const decoratePage = () => {
    drawWatermark(doc);
    drawHeader(doc, test, includeAnswers);
    doc.x = MARGIN_SIDE;
    doc.y = MARGIN_TOP;
  };

  doc.on('pageAdded', () => {
    pageNumber += 1;
    decoratePage();
  });

  decoratePage();

  if (test.instructions) {
    doc.fontSize(11).fillColor('#1e1b4b').text('Instructions', { paragraphGap: 4 });
    doc.fontSize(9).fillColor('#374151').text(test.instructions, { paragraphGap: 6, align: 'left' });
    doc
      .moveTo(MARGIN_SIDE, doc.y)
      .lineTo(doc.page.width - MARGIN_SIDE, doc.y)
      .strokeColor('#e5e7eb')
      .stroke();
    doc.moveDown(0.7);
  }

  // Scales an image down to fit within a box, never up — returns the
  // rendered {width, height} pdfkit will actually draw at, so callers can
  // measure a row's required height BEFORE drawing anything into it (a
  // bordered table's row/cell heights have to be fixed before any content
  // is drawn, unlike free-flowing text which can just push doc.y down).
  function measureImageDims(imagePath, maxWidth, maxHeight) {
    try {
      const img = doc.openImage(imagePath);
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      return { width: img.width * scale, height: img.height * scale };
    } catch {
      return null;
    }
  }

  function measureOptionCellHeight(option, colWidth) {
    const contentWidth = colWidth - CELL_PADDING * 2 - LETTER_COL_WIDTH;
    const optionImagePath = resolveImagePath(option.imageUrl);
    if (optionImagePath) {
      const dims = measureImageDims(optionImagePath, contentWidth, OPTION_IMAGE_MAX_HEIGHT);
      return Math.max(MIN_OPTION_ROW_HEIGHT, (dims ? dims.height : OPTION_IMAGE_MAX_HEIGHT) + CELL_PADDING * 2);
    }
    doc.fontSize(10).font('Helvetica');
    const textHeight = doc.heightOfString(option.text || '', { width: contentWidth });
    return Math.max(MIN_OPTION_ROW_HEIGHT, textHeight + CELL_PADDING * 2);
  }

  function drawOptionCell(x, y, width, height, oi, option, highlight) {
    const letter = String.fromCharCode(65 + oi);
    const textColor = highlight ? ANSWER_COLOR : '#374151';

    if (highlight) {
      doc.save();
      doc.rect(x, y, width, height).fillOpacity(0.08).fill(ANSWER_COLOR);
      doc.fillOpacity(1);
      doc.restore();
    }

    // The letter is always bold — it's a label, not part of the graded
    // text — while the option's own text/image only turns bold+teal when
    // it's the answer key's correct choice.
    doc.fontSize(10).font('Helvetica-Bold').fillColor(textColor);
    doc.text(`${letter})`, x + CELL_PADDING, y + CELL_PADDING, { width: LETTER_COL_WIDTH, lineBreak: false });

    const contentX = x + CELL_PADDING + LETTER_COL_WIDTH;
    const contentWidth = width - CELL_PADDING * 2 - LETTER_COL_WIDTH;
    const optionImagePath = resolveImagePath(option.imageUrl);
    if (optionImagePath) {
      const dims = measureImageDims(optionImagePath, contentWidth, OPTION_IMAGE_MAX_HEIGHT);
      if (dims) doc.image(optionImagePath, contentX, y + CELL_PADDING, { width: dims.width, height: dims.height });
    } else {
      doc.font(highlight ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(option.text || '', contentX, y + CELL_PADDING, { width: contentWidth });
    }

    if (highlight) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(ANSWER_COLOR).text('Correct', x + width - CELL_PADDING - 44, y + CELL_PADDING, { width: 44, align: 'right', lineBreak: false });
    }
    doc.font('Helvetica').fillColor('#374151');
  }

  // Text questions put "1." and the question text on the same line, with
  // the text column pinned at a fixed x (tableX + padding + NUMBER_COL_WIDTH)
  // for every wrapped line — a hanging indent, so line 2+ lines up under
  // line 1's text instead of drifting back to the box's left edge. An
  // image question keeps the number on its own line above the image,
  // since an inline diagram wouldn't have anything sensible to hang from.
  function measureQuestionRowHeight(q, tableWidth) {
    doc.fontSize(11).font('Helvetica-Bold');
    const numberLineHeight = doc.currentLineHeight(true);
    const imagePath = resolveImagePath(q.imageUrl);
    if (imagePath) {
      const dims = measureImageDims(imagePath, tableWidth - CELL_PADDING * 2 - 20, QUESTION_IMAGE_MAX.height);
      const imgHeight = dims ? dims.height : QUESTION_IMAGE_MAX.height;
      return { inline: false, numberLineHeight, total: numberLineHeight + 4 + imgHeight + CELL_PADDING * 2 };
    }
    doc.fontSize(11).font('Helvetica');
    const textWidth = tableWidth - CELL_PADDING * 2 - NUMBER_COL_WIDTH;
    const textHeight = doc.heightOfString(q.text || '', { width: textWidth });
    return { inline: true, total: Math.max(textHeight, numberLineHeight) + CELL_PADDING * 2 };
  }

  // Every question renders as one bordered table: a header/body row
  // (number, then the question text or image) followed by the options as
  // a real 2-column grid of bordered cells — same structure a printed exam
  // paper uses, and it sidesteps the old free-flow layout where a wide
  // option image or a long line of text had nothing to keep it lined up
  // against its neighbours. Per-question marks aren't printed — total
  // marks for the paper is already in the header.
  function drawQuestion(q, i) {
    const tableX = MARGIN_SIDE;
    const tableWidth = doc.page.width - MARGIN_SIDE * 2;
    const colWidth = tableWidth / 2;
    const bottomBound = doc.page.height - doc.page.margins.bottom;

    const questionRow = measureQuestionRowHeight(q, tableWidth);
    let optionRows = [];
    let bottomRowHeight = 0;
    if (q.type === 'numerical') {
      doc.fontSize(10).font('Helvetica');
      bottomRowHeight = doc.currentLineHeight(true) + CELL_PADDING * 2;
    } else {
      for (let r = 0; r < q.options.length; r += 2) {
        const left = q.options[r];
        const right = q.options[r + 1];
        const leftH = left ? measureOptionCellHeight(left, colWidth) : 0;
        const rightH = right ? measureOptionCellHeight(right, colWidth) : 0;
        optionRows.push({ left, right, height: Math.max(leftH, rightH, MIN_OPTION_ROW_HEIGHT) });
      }
      bottomRowHeight = optionRows.reduce((sum, r) => sum + r.height, 0);
    }
    const totalHeight = questionRow.total + bottomRowHeight;

    if (doc.y + totalHeight > bottomBound) doc.addPage();
    const startY = doc.y;

    doc.save();
    doc.lineWidth(0.8).strokeColor(TABLE_BORDER_COLOR).rect(tableX, startY, tableWidth, totalHeight).stroke();
    doc.restore();

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
    doc.text(`${i + 1}.`, tableX + CELL_PADDING, startY + CELL_PADDING, { width: NUMBER_COL_WIDTH, lineBreak: false });

    const imagePath = resolveImagePath(q.imageUrl);
    if (questionRow.inline) {
      doc.fontSize(11).font('Helvetica').fillColor('#111827');
      doc.text(q.text || '', tableX + CELL_PADDING + NUMBER_COL_WIDTH, startY + CELL_PADDING, {
        width: tableWidth - CELL_PADDING * 2 - NUMBER_COL_WIDTH,
      });
    } else {
      const bodyY = startY + CELL_PADDING + questionRow.numberLineHeight + 4;
      const dims = measureImageDims(imagePath, tableWidth - CELL_PADDING * 2 - 20, QUESTION_IMAGE_MAX.height);
      if (dims) doc.image(imagePath, tableX + CELL_PADDING + 20, bodyY, { width: dims.width, height: dims.height });
    }

    let cursorY = startY + questionRow.total;
    doc.moveTo(tableX, cursorY).lineTo(tableX + tableWidth, cursorY).strokeColor(TABLE_BORDER_COLOR).lineWidth(0.8).stroke();

    if (q.type === 'numerical') {
      if (includeAnswers) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(ANSWER_COLOR).text(`Correct Answer: ${q.correctNumericAnswer}`, tableX + CELL_PADDING, cursorY + CELL_PADDING);
        doc.font('Helvetica');
      } else {
        doc.fontSize(10).fillColor('#374151').text('Answer: ____________________', tableX + CELL_PADDING, cursorY + CELL_PADDING);
      }
    } else {
      const correctSet = new Set(q.correctOptionIndexes || []);
      doc.moveTo(tableX + colWidth, cursorY).lineTo(tableX + colWidth, startY + totalHeight).strokeColor(TABLE_BORDER_COLOR).lineWidth(0.8).stroke();

      optionRows.forEach((row, rIdx) => {
        const rowY = cursorY;
        if (row.left) drawOptionCell(tableX, rowY, colWidth, row.height, rIdx * 2, row.left, includeAnswers && correctSet.has(rIdx * 2));
        if (row.right) drawOptionCell(tableX + colWidth, rowY, colWidth, row.height, rIdx * 2 + 1, row.right, includeAnswers && correctSet.has(rIdx * 2 + 1));
        cursorY += row.height;
        if (rIdx < optionRows.length - 1) {
          doc.moveTo(tableX, cursorY).lineTo(tableX + tableWidth, cursorY).strokeColor(TABLE_BORDER_COLOR).lineWidth(0.8).stroke();
        }
      });
    }

    doc.x = MARGIN_SIDE;
    doc.y = startY + totalHeight + 14;
    doc.font('Helvetica').fillColor('#374151');
  }

  function drawSectionHeader(section) {
    doc.fontSize(12).fillColor('#1e1b4b').text(section.name, { paragraphGap: 3, underline: true });
    if (section.instructions) {
      doc.fontSize(9).fillColor('#374151').text(section.instructions, { paragraphGap: 4, align: 'left' });
    }
    doc.moveDown(0.3);
  }

  if (test.sections && test.sections.length > 0) {
    test.sections.forEach((section) => {
      drawSectionHeader(section);
      for (let i = section.startIndex; i <= section.endIndex; i++) {
        drawQuestion(test.questions[i], i);
      }
    });
  } else {
    test.questions.forEach(drawQuestion);
  }

  if (includeAnswers) {
    drawAnswerKeyTable(doc, test.questions);
  }

  // Footers are drawn last across all buffered pages so drawFooter's page
  // numbering can't be interrupted by pdfkit's mid-stream auto pagination.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    drawFooter(doc, i + 1);
  }

  doc.end();
  return doc;
}

/** "Q# → correct answer" only, no restated question text — a fast-lookup
 * grid for a mentor grading by hand, kept on its own page so it stands
 * apart from the annotated paper above it. */
function drawAnswerKeyTable(doc, questions) {
  doc.addPage();
  doc.fontSize(14).fillColor('#1e1b4b').text('Answer Key', { paragraphGap: 10 });

  const colQNumX = MARGIN_SIDE;
  const colQNumWidth = 70;
  const colAnswerX = MARGIN_SIDE + 70;
  const colAnswerWidth = doc.page.width - MARGIN_SIDE - colAnswerX;
  const rowHeight = 22;
  const bottomBound = doc.page.height - doc.page.margins.bottom;

  function drawRow(qLabel, answerLabel, isHeader) {
    if (doc.y + rowHeight > bottomBound) doc.addPage();
    const y = doc.y;
    doc.fontSize(10).font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fillColor(isHeader ? '#1e1b4b' : '#111827');
    doc.text(qLabel, colQNumX, y, { width: colQNumWidth, lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fillColor(isHeader ? '#1e1b4b' : ANSWER_COLOR)
      .text(answerLabel, colAnswerX, y, { width: colAnswerWidth, lineBreak: false });
    doc.font('Helvetica');
    doc.y = y + rowHeight - 6;
    doc
      .moveTo(MARGIN_SIDE, doc.y)
      .lineTo(doc.page.width - MARGIN_SIDE, doc.y)
      .strokeColor('#e5e7eb')
      .stroke();
    doc.y += 6;
  }

  drawRow('Question', 'Correct Answer', true);
  questions.forEach((q, i) => {
    const answerLabel =
      q.type === 'numerical'
        ? String(q.correctNumericAnswer)
        : (q.correctOptionIndexes || []).map((oi) => String.fromCharCode(65 + oi)).join(', ');
    drawRow(`Q${i + 1}`, answerLabel, false);
  });
}
