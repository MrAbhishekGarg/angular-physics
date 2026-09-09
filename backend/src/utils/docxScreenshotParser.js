import { loadDocxParagraphs } from './docxStructureParser.js';
import { loadRelationships, extractParagraphImage } from './docxEmbeddedImageExtractor.js';
import { ApiError } from './ApiError.js';

/**
 * Bulk question format — screenshots only, nothing is ever read as typed
 * text (unlike the old docx parser this replaces, which broke on equation
 * fonts that don't decode to the Unicode codepoint the doc actually
 * stores). Word is purely a container here:
 *
 *   Q1.
 *   [paste the stem/diagram screenshot here]
 *   A)
 *   [paste option A's screenshot here]
 *   B)
 *   [paste option B's screenshot here]
 *   ...
 *
 *   Q2.
 *   ...
 *
 * A marker's screenshot may also be pasted on the same line as the marker
 * (no Enter first) — both land in the same Word paragraph either way, and
 * this parser only cares about which paragraph carries an embedded image,
 * never what the paragraph's text says beyond the marker itself. Answers,
 * marks, chapter, etc. all come from the paired Excel mapping sheet — see
 * question.service.js's bulkCreateFromDocxScreenshots.
 */

const QUESTION_START = /^Q(\d+)[.)]/i;
// Case-insensitive, same reasoning as the old parser: a mentor might type
// "a)" as easily as "A)". Trailing text after the marker is ignored — only
// the letter matters now, there's no option text to extract.
const OPTION_START = /^([A-Za-z])[.)]/;

function splitIntoBlocks(paragraphs) {
  const blocks = [];
  let current = null;

  for (const p of paragraphs) {
    const qMatch = QUESTION_START.exec(p.text.trim());
    if (qMatch) {
      if (current) blocks.push(current);
      current = { number: Number(qMatch[1]), paragraphs: [] };
    } else if (current) {
      current.paragraphs.push(p);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

export async function extractDocxScreenshotGroups(buffer) {
  let zip, paragraphs;
  try {
    ({ zip, paragraphs } = await loadDocxParagraphs(buffer));
  } catch {
    throw new ApiError(400, "Could not read the Word document — make sure it's a valid, unprotected .docx file (not .doc, and not password-protected).");
  }

  const blocks = splitIntoBlocks(paragraphs);
  const warnings = [];
  const groups = new Map();

  if (blocks.length === 0) {
    warnings.push('No questions found — each question must start a line with "Q1.", "Q2.", etc.');
    return { groups, warnings };
  }

  const relsMap = await loadRelationships(zip);

  for (const block of blocks) {
    const { number } = block;
    if (groups.has(number)) {
      warnings.push(`Question ${number}: this number appears more than once in the document — later occurrence used.`);
    }
    const group = { stem: null, options: new Map() };
    groups.set(number, group);

    let context = 'stem';

    for (const p of block.paragraphs) {
      const optMatch = OPTION_START.exec(p.text.trim());
      if (optMatch) context = optMatch[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);

      if (!p.hasImage) continue;

      const label = context === 'stem' ? `Question ${number}` : `Question ${number}, option ${String.fromCharCode(65 + context)}`;
      // eslint-disable-next-line no-await-in-loop
      const imageUrl = await extractParagraphImage(p.node, zip, relsMap, warnings, label);
      if (!imageUrl) continue;
      const file = { imageUrl };

      if (context === 'stem') {
        if (group.stem) warnings.push(`Question ${number}: more than one stem image found — using the last one.`);
        group.stem = file;
      } else {
        if (group.options.has(context)) {
          warnings.push(`Question ${number}, option ${String.fromCharCode(65 + context)}: more than one image found — using the last one.`);
        }
        group.options.set(context, file);
      }
    }
  }

  return { groups, warnings };
}
