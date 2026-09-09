import { loadDocxParagraphs } from './docxStructureParser.js';
import { loadRelationships, extractParagraphImage } from './docxEmbeddedImageExtractor.js';
import { ApiError } from './ApiError.js';

/**
 * Bulk question format — each Q<n>./[A]/[B]/[C]/[D] marker accepts EITHER a
 * pasted screenshot OR typed text (or both). Paste a screenshot only for
 * whatever actually needs it (an equation, a diagram); type everything else
 * directly, exactly like typing "[A] 1.2 J" for a plain numeric option. This
 * never touches typed text as anything but a literal, verbatim value —
 * unlike the old docx parser this replaces (which additionally inferred
 * answer letters/marks/concept-code tags from text and broke on equation
 * fonts that don't decode to the Unicode codepoint the doc actually
 * stores), so there's no font-decoding failure mode here even for typed
 * content:
 *
 *   Q1. An electric dipole ... (typed directly — no image needed)
 *   [A] 1.2 J
 *   [B] 1.5 J
 *   [C] [paste a screenshot here if this option needs one]
 *   [D] 1.0 J
 *
 *   Q2.
 *   [paste the stem/diagram screenshot on the next line instead]
 *   [A] ...
 *
 * Options are marked "[A]"/"[B]"/... (square brackets), not "A)"/"B)" — a
 * bracket isn't a pattern Word's "AutoFormat As You Type" recognizes, while
 * a typed "A)" at the start of a line gets silently converted into an
 * automatic numbered list the moment the mentor presses Enter, which
 * removes the literal "A)" text entirely (it becomes list-numbering
 * metadata, invisible to plain text extraction) — every option's content
 * then silently falls through to whatever the current context still is
 * (usually the stem), which is exactly the failure this format avoids.
 *
 * A marker's content may be typed right after it on the same line, pasted
 * on the same line, or pasted/typed on the following line(s) up to the next
 * marker — all forms land fine. Answers, marks, chapter, etc. always come
 * from the paired Excel mapping sheet, never from anything typed here — see
 * question.service.js's bulkCreateFromDocxScreenshots.
 */

const QUESTION_START = /^Q(\d+)[.)]\s*(.*)$/i;
// Bracket form is the documented, autocorrect-safe convention (see the
// module doc-comment above). The old "A)"/"A." form is still accepted as a
// fallback for a document where Word's autocorrect happened to be off, but
// it can't be relied on — that literal text can vanish entirely once
// AutoFormat As You Type converts it into a numbered list.
const OPTION_START = /^(?:\[([A-Za-z])\]|([A-Za-z])[.)])\s*(.*)$/;

function splitIntoBlocks(paragraphs) {
  const blocks = [];
  let current = null;

  for (const p of paragraphs) {
    const qMatch = QUESTION_START.exec(p.text.trim());
    if (qMatch) {
      if (current) blocks.push(current);
      current = { number: Number(qMatch[1]), markerText: qMatch[2].trim(), markerParagraph: p, paragraphs: [] };
    } else if (current) {
      current.paragraphs.push(p);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function appendText(slot, text) {
  if (!text) return;
  slot.text = slot.text ? `${slot.text} ${text}` : text;
}

function hasContent(slot) {
  return Boolean(slot && (slot.text || slot.imageUrl));
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

    const slots = new Map(); // 'stem' or a letter-index -> { text, imageUrl }
    const getSlot = (key) => {
      if (!slots.has(key)) slots.set(key, { text: '', imageUrl: undefined });
      return slots.get(key);
    };

    // eslint-disable-next-line no-await-in-loop
    const applyImage = async (paragraph, slot, label) => {
      if (!paragraph.hasImage) return;
      const imageUrl = await extractParagraphImage(paragraph.node, zip, relsMap, warnings, label);
      if (!imageUrl) return;
      if (slot.imageUrl) warnings.push(`${label}: more than one image found — using the last one.`);
      slot.imageUrl = imageUrl;
    };

    const stemSlot = getSlot('stem');
    appendText(stemSlot, block.markerText);
    // eslint-disable-next-line no-await-in-loop
    await applyImage(block.markerParagraph, stemSlot, `Question ${number}`);

    let context = 'stem';
    for (const p of block.paragraphs) {
      const trimmed = p.text.trim();
      const optMatch = OPTION_START.exec(trimmed);

      let slot;
      let label;
      if (optMatch) {
        const letter = optMatch[1] || optMatch[2];
        context = letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
        slot = getSlot(context);
        label = `Question ${number}, option ${String.fromCharCode(65 + context)}`;
        appendText(slot, optMatch[3].trim());
      } else {
        slot = getSlot(context);
        label = context === 'stem' ? `Question ${number}` : `Question ${number}, option ${String.fromCharCode(65 + context)}`;
        appendText(slot, trimmed);
      }

      // eslint-disable-next-line no-await-in-loop
      await applyImage(p, slot, label);
    }

    const group = { stem: hasContent(stemSlot) ? stemSlot : null, options: new Map() };
    for (const [key, slot] of slots) {
      if (key !== 'stem' && hasContent(slot)) group.options.set(key, slot);
    }
    groups.set(number, group);
  }

  return { groups, warnings };
}
