import { loadDocxParagraphs, stripLeadingChars } from './docxStructureParser.js';
import { renderFragmentsToImages, findSoffice } from './docxFragmentRenderer.js';
import { saveQuestionImage } from './questionImageStorage.js';
import { ApiError } from './ApiError.js';

/**
 * Bulk question format (see the downloadable sample .docx for the
 * mentor-facing version of these rules):
 *
 *   Q1. [mcq-single] Question text goes here?
 *   A) Option one
 *   B) Option two
 *   C) Option three
 *   D) Option four
 *   Answer: A
 *   Marks: 4
 *   Negative: 1
 *
 *   Q2. [mcq-multiple] Which of the following are correct?
 *   A) ...
 *   B) ...
 *   Answer: A, C
 *
 *   Q3. [numerical] A ball falls for 2s — distance fallen (g=10)?
 *   Answer: 20
 *   Tolerance: 0.5
 *
 * The [type] tag is optional — if omitted, type is inferred: an "Answer:"
 * line with a bare number and no option lines is numerical; multiple
 * comma-separated answer letters implies mcq-multiple; otherwise mcq-single.
 * Marks/Negative/Tolerance default to 4/1/0 when omitted.
 *
 * A question can also carry a mentor-defined Concept Code right next to
 * (or instead of) the type tag, in either order — e.g.
 * "Q1. [CC:PHY-ELEC-045] [mcq-single] ..." — which maps to a specific
 * chapter/topic (see ConceptCode.js) instead of the whole upload batch
 * sharing one. An unrecognized code falls back to the batch-level defaults
 * and surfaces a warning.
 *
 * Passing `{ requireInlineAnswer: false }` (used by the Word+Excel mapped
 * upload mode — see question.service.js's bulkCreateFromDocxAndExcel)
 * skips the "Answer:" line requirement entirely: a question with no inline
 * answer is still built (with empty correctOptionIndexes/correctNumericAnswer,
 * to be filled in afterward from the mapped Excel sheet) instead of being
 * dropped. Every question — regardless of mode — carries its literal
 * printed number (the digits in "Q<N>.") as `questionNumber` on the
 * returned object, which is what the Excel-mapping step matches rows
 * against; it's an extra field the Question schema doesn't define, so
 * Mongoose silently strips it back out at insert time for the plain
 * docx-only flow.
 *
 * The question stem and every option are ALSO rendered as faithful images
 * straight from their original Word paragraph (fonts, symbols, MathType
 * equations, diagrams — whatever was actually in the document), via
 * docxFragmentRenderer.js. The extracted text above still drives grading
 * (Answer:/Marks:/etc are always plain, unambiguous text — no reason to
 * image-ify those) and serves as a fallback/searchable label if rendering
 * is unavailable.
 */

const QUESTION_START = /^Q(\d+)[.)]/i;
// Case-insensitive — a mentor's source doc may use "a) / b) / c)" as easily
// as "A) / B) / C)"; the actual letter typed doesn't affect grading (the
// option's position in document order is what maps to an Answer: letter or
// an Excel-mapped answer, both of which are already uppercase-normalized
// before comparison), so accepting either case here just avoids silently
// losing every option in a lowercase-lettered document.
// (.*) not (.+) — an option whose content is entirely a Word equation
// object (MathType/OMML, no literal characters) has nothing after the
// letter for <w:t> extraction to see. It must still count as an option
// slot (empty text now, filled in by the rendered image once available)
// or a later option's letter silently shifts down and starts pointing at
// the wrong position — e.g. losing "c)" here would make an Excel/inline
// answer of "d" resolve to the actual 3rd option instead of the 4th.
const OPTION_LINE = /^([A-Za-z])[.)]\s*(.*)$/;
const TYPE_TAG = /^\[(mcq-single|mcq-multiple|numerical)\]\s*/i;
// Accepts one or more codes per tag ("[CC:A,B]") AND repeated tags
// ("[CC:A] [CC:B]") — a question can carry more than one Concept Code when
// it genuinely spans multiple linked concepts.
const CC_TAG = /^\[CC:([\w,-]+)\]\s*/i;
const FIELD_LINE = /^(answer|marks|negative|tolerance):/i;

/**
 * Consumes any leading [type] and/or [CC:code[,code...]] bracket tags, in
 * any order/repetition, from the start of a question's first line. Returns
 * what's left plus whichever tags were found — conceptCodes accumulates
 * across every [CC:...] tag encountered, not just the last one.
 */
function consumeLeadingTags(text) {
  let rest = text;
  let explicitType = null;
  const conceptCodes = [];

  for (;;) {
    const typeMatch = TYPE_TAG.exec(rest);
    const ccMatch = CC_TAG.exec(rest);
    if (typeMatch) {
      explicitType = typeMatch[1].toLowerCase();
      rest = rest.slice(typeMatch[0].length);
    } else if (ccMatch) {
      ccMatch[1]
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean)
        .forEach((c) => conceptCodes.push(c));
      rest = rest.slice(ccMatch[0].length);
    } else {
      break;
    }
  }

  return { rest, explicitType, conceptCodes };
}

/**
 * How many leading characters of the paragraph's raw text are "Q1. [type]
 * [CC:code]" or "A) " syntax that must NOT appear in the rendered image —
 * the UI already shows the question number / option letter itself, and
 * these tags are parser metadata, not question content.
 */
function computeStemPrefixLength(rawText) {
  let consumed = 0;
  let rest = rawText;

  const leadingWs = rest.length - rest.trimStart().length;
  consumed += leadingWs;
  rest = rest.slice(leadingWs);

  const qMatch = QUESTION_START.exec(rest);
  if (!qMatch) return 0;
  consumed += qMatch[0].length;
  rest = rest.slice(qMatch[0].length);

  const wsAfterQ = rest.length - rest.trimStart().length;
  consumed += wsAfterQ;
  rest = rest.slice(wsAfterQ);

  const { rest: afterTags } = consumeLeadingTags(rest);
  consumed += rest.length - afterTags.length;

  return consumed;
}

function computeOptionPrefixLength(rawText) {
  const leadingWs = rawText.length - rawText.trimStart().length;
  const match = OPTION_LINE.exec(rawText.slice(leadingWs));
  if (!match) return 0;
  return leadingWs + (match[0].length - match[2].length);
}

function splitIntoBlocks(paragraphs) {
  const blocks = [];
  let current = null;

  for (const p of paragraphs) {
    const qMatch = QUESTION_START.exec(p.text.trim());
    if (qMatch) {
      if (current) blocks.push(current);
      current = { number: Number(qMatch[1]), paragraphs: [p] };
    } else if (current) {
      current.paragraphs.push(p);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

/**
 * Classifies a block's paragraphs into stem paragraphs (question text,
 * possibly wrapped across more than one Word paragraph), option paragraphs
 * (one per A)/B)/... line), and structured fields (Answer:/Marks:/etc,
 * parsed as plain text — see FIELD_LINE).
 */
function classifyBlock(block, blockNumber, { requireAnswer = true } = {}) {
  const paragraphs = block.paragraphs;
  const stemParagraphs = [paragraphs[0]];
  const optionParagraphs = [];
  const fields = { answerRaw: null, marks: 4, negativeMarks: 1, tolerance: 0 };
  let sawFieldOrOption = false;

  let firstLine = paragraphs[0].text.trim().replace(QUESTION_START, '').trim();
  const { rest: afterTags, explicitType, conceptCodes } = consumeLeadingTags(firstLine);
  firstLine = afterTags.trim();

  for (const p of paragraphs.slice(1)) {
    const line = p.text.trim();
    if (!line) {
      // An image-only paragraph (e.g. a circuit diagram with no caption
      // text) has no text to classify — but it's still part of the stem as
      // long as we haven't reached the options/fields yet, and must not be
      // silently dropped just because there's no text line to match here.
      if (!sawFieldOrOption && p.hasImage) stemParagraphs.push(p);
      continue;
    }
    const optMatch = OPTION_LINE.exec(line);
    const fieldMatch = FIELD_LINE.exec(line);

    if (fieldMatch) {
      sawFieldOrOption = true;
      const value = line.slice(line.indexOf(':') + 1).trim();
      const field = fieldMatch[1].toLowerCase();
      if (field === 'answer') fields.answerRaw = value;
      else if (field === 'marks') fields.marks = Number(value) || fields.marks;
      else if (field === 'negative') fields.negativeMarks = Number(value) || 0;
      else if (field === 'tolerance') fields.tolerance = Number(value) || 0;
    } else if (optMatch) {
      sawFieldOrOption = true;
      optionParagraphs.push({
        paragraph: p,
        letter: optMatch[1],
        text: optMatch[2].trim(),
        prefixLength: computeOptionPrefixLength(p.text),
      });
    } else if (!sawFieldOrOption) {
      stemParagraphs.push(p);
    }
    // else: trailing text after the question's fields — ignored
  }

  if (requireAnswer && !fields.answerRaw) return { error: `Question ${blockNumber}: missing "Answer:" line` };

  const stemText = [firstLine, ...stemParagraphs.slice(1).map((p) => p.text.trim())].join(' ');
  const stemPrefixLength = computeStemPrefixLength(paragraphs[0].text);

  return {
    stemParagraphs,
    stemPrefixLength,
    optionParagraphs,
    fields,
    explicitType,
    conceptCodes,
    stemText,
    questionNumber: block.number,
  };
}

function buildQuestion(classified, blockNumber, conceptCodeMap, { requireAnswer = true } = {}) {
  const { stemParagraphs, stemPrefixLength, optionParagraphs, fields, explicitType, conceptCodes, stemText, questionNumber } = classified;
  const options = optionParagraphs.map((o) => o.text);
  const hasAnswer = fields.answerRaw != null;

  const conceptWarnings = [];
  // chapter/topic come from the FIRST recognized code (first-wins, since
  // Question.chapter/topic are still single-value fields).
  let taxonomyOverride = null;
  conceptCodes.forEach((code) => {
    const match = conceptCodeMap.get(code);
    if (match) {
      if (!taxonomyOverride) taxonomyOverride = { chapter: match.chapter, topic: match.topic };
    } else {
      conceptWarnings.push(`Question ${blockNumber}: concept code "${code}" not found — used the batch's chapter/topic instead.`);
    }
  });

  const type =
    explicitType || (options.length === 0 ? 'numerical' : hasAnswer && fields.answerRaw.includes(',') ? 'mcq-multiple' : 'mcq-single');

  if (type === 'numerical') {
    let correctNumericAnswer;
    if (hasAnswer) {
      correctNumericAnswer = Number(fields.answerRaw);
      if (Number.isNaN(correctNumericAnswer)) {
        return { error: `Question ${blockNumber}: numerical answer "${fields.answerRaw}" is not a number` };
      }
    } else if (requireAnswer) {
      return { error: `Question ${blockNumber}: missing "Answer:" line` };
    }
    return {
      question: {
        type,
        text: stemText,
        options: [],
        correctOptionIndexes: [],
        correctNumericAnswer,
        numericTolerance: fields.tolerance,
        marks: fields.marks,
        negativeMarks: fields.negativeMarks,
        ...(taxonomyOverride || {}),
        conceptCodes,
      },
      questionNumber,
      stemParagraphs,
      stemPrefixLength,
      optionParagraphs: [],
      conceptWarnings,
    };
  }

  if (options.length < 2) return { error: `Question ${blockNumber}: needs at least 2 options` };

  let correctOptionIndexes = [];
  if (hasAnswer) {
    const letters = fields.answerRaw.split(',').map((s) => s.trim().toUpperCase());
    correctOptionIndexes = letters.map((l) => l.charCodeAt(0) - 'A'.charCodeAt(0));
    if (correctOptionIndexes.some((i) => i < 0 || i >= options.length)) {
      return { error: `Question ${blockNumber}: answer "${fields.answerRaw}" doesn't match an option letter` };
    }
  } else if (requireAnswer) {
    return { error: `Question ${blockNumber}: missing "Answer:" line` };
  }

  return {
    question: {
      type: correctOptionIndexes.length > 1 ? 'mcq-multiple' : type,
      text: stemText,
      options: options.map((text) => ({ text, imageUrl: undefined })),
      correctOptionIndexes,
      correctNumericAnswer: undefined,
      numericTolerance: 0,
      marks: fields.marks,
      negativeMarks: fields.negativeMarks,
      ...(taxonomyOverride || {}),
      conceptCodes,
    },
    questionNumber,
    stemParagraphs,
    stemPrefixLength,
    optionParagraphs,
    conceptWarnings,
  };
}

export async function parseQuestionsFromDocxBuffer(buffer, conceptCodeMap = new Map(), { requireInlineAnswer = true } = {}) {
  let zip, documentRootNode, paragraphs;
  try {
    ({ zip, documentRootNode, paragraphs } = await loadDocxParagraphs(buffer));
  } catch {
    throw new ApiError(400, 'Could not read the Word document — make sure it\'s a valid, unprotected .docx file (not .doc, and not password-protected).');
  }
  const blocks = splitIntoBlocks(paragraphs);

  if (blocks.length === 0) {
    return { questions: [], warnings: ['No questions found — each question must start a line with "Q1.", "Q2.", etc.'] };
  }

  const warnings = [];
  const built = [];

  blocks.forEach((block, i) => {
    const classified = classifyBlock(block, i + 1, { requireAnswer: requireInlineAnswer });
    if (classified.error) {
      warnings.push(classified.error);
      return;
    }
    const result = buildQuestion(classified, i + 1, conceptCodeMap, { requireAnswer: requireInlineAnswer });
    if (result.error) {
      warnings.push(result.error);
      return;
    }
    if (result.conceptWarnings?.length) warnings.push(...result.conceptWarnings);
    built.push(result);
  });

  const sofficeAvailable = await findSoffice();
  if (!sofficeAvailable) {
    warnings.unshift(
      'Image rendering is unavailable on the server right now — questions were parsed as plain text, so equations/symbols/diagrams may not display correctly.'
    );
  } else {
    const fragments = [];
    built.forEach((b, qi) => {
      // Only the first stem paragraph carries the "Q1. [type]" prefix —
      // any wrapped continuation paragraphs are used as-is.
      const [firstStem, ...restStem] = b.stemParagraphs;
      const strippedFirstStem = stripLeadingChars(firstStem.node, b.stemPrefixLength);
      fragments.push({ key: `q${qi}-stem`, paragraphNodes: [strippedFirstStem, ...restStem.map((p) => p.node)] });

      b.optionParagraphs.forEach((o, oi) => {
        const strippedOption = stripLeadingChars(o.paragraph.node, o.prefixLength);
        fragments.push({ key: `q${qi}-opt${oi}`, paragraphNodes: [strippedOption] });
      });
    });

    const rendered = await renderFragmentsToImages(zip, documentRootNode, fragments);

    built.forEach((b, qi) => {
      const stemImage = rendered.get(`q${qi}-stem`);
      if (stemImage) b.question.imageUrl = saveQuestionImage(stemImage, 'image/png');
      else warnings.push(`Question ${qi + 1}: could not render an image for the question text — showing plain text instead.`);

      b.optionParagraphs.forEach((o, oi) => {
        const optImage = rendered.get(`q${qi}-opt${oi}`);
        if (optImage) b.question.options[oi].imageUrl = saveQuestionImage(optImage, 'image/png');
      });
    });
  }

  return { questions: built.map((b) => ({ ...b.question, questionNumber: b.questionNumber })), warnings };
}
