import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import xpath from 'xpath';

/**
 * Loads a .docx's raw XML rather than using a plain-text extractor — needed
 * so later stages can (a) classify each paragraph's role (question stem /
 * option / structured field) from its text, and (b) re-serialize the exact
 * original paragraph node into a standalone mini-document for faithful
 * image rendering (see docxFragmentRenderer.js) — preserving whatever
 * fonts, Symbol-font character tricks, or embedded MathType/diagram objects
 * that paragraph contains, since a plain-text pass loses all of that.
 */
export const NS = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  v: 'urn:schemas-microsoft-com:vml',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
};

const select = xpath.useNamespaces(NS);

function paragraphText(pNode) {
  return select('.//w:t', pNode)
    .map((n) => n.textContent)
    .join('');
}

function paragraphHasImage(pNode) {
  return select('.//a:blip/@r:embed', pNode).length > 0 || select('.//v:imagedata/@r:id', pNode).length > 0;
}

/**
 * Returns a deep clone of pNode with the first `charCount` characters of its
 * text content removed — e.g. stripping "Q1. [mcq-single] " or "B) " before
 * rendering, so parser syntax and the option letter (already shown by the
 * surrounding UI) don't get baked into the rendered image itself. Operates
 * on <w:t> nodes in document order, clearing/truncating as many as the
 * character budget spans, since Word commonly splits what looks like one
 * run of text across several <w:r> elements.
 */
export function stripLeadingChars(pNode, charCount) {
  const clone = pNode.cloneNode(true);
  if (charCount <= 0) return clone;

  let remaining = charCount;
  for (const textNode of select('.//w:t', clone)) {
    if (remaining <= 0) break;
    const text = textNode.textContent;
    if (text.length <= remaining) {
      textNode.textContent = '';
      remaining -= text.length;
    } else {
      textNode.textContent = text.slice(remaining);
      remaining = 0;
    }
  }
  return clone;
}

/**
 * Returns { zip, documentRootNode, paragraphs } where paragraphs is an
 * ordered array of { node, text, hasImage } — node is the live DOM element
 * for that <w:p>, reusable later to build a fragment document.
 */
export async function loadDocxParagraphs(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) throw new Error('Not a valid .docx file (missing word/document.xml)');

  const documentXml = await documentXmlFile.async('string');
  const doc = new DOMParser().parseFromString(documentXml, 'text/xml');
  const documentRootNode = doc.documentElement;

  const paragraphs = select('//w:p', doc).map((node) => ({
    node,
    text: paragraphText(node),
    hasImage: paragraphHasImage(node),
  }));

  return { zip, documentRootNode, paragraphs };
}
