import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import xpath from 'xpath';

/**
 * Loads a .docx's raw XML rather than using a plain-text extractor — needed
 * so later stages can (a) classify each paragraph's role (question stem /
 * option / structured field) from its text, and (b) locate/extract whatever
 * embedded picture or legacy equation-object preview (MathType, etc.) a
 * paragraph carries — see docxEmbeddedImageExtractor.js — since a plain-text
 * pass loses all of that.
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
 * Returns { zip, paragraphs } where paragraphs is an ordered array of
 * { node, text, hasImage } — node is the live DOM element for that <w:p>,
 * reusable later to locate an embedded picture/equation preview.
 */
export async function loadDocxParagraphs(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) throw new Error('Not a valid .docx file (missing word/document.xml)');

  const documentXml = await documentXmlFile.async('string');
  const doc = new DOMParser().parseFromString(documentXml, 'text/xml');

  const paragraphs = select('//w:p', doc).map((node) => ({
    node,
    text: paragraphText(node),
    hasImage: paragraphHasImage(node),
  }));

  return { zip, paragraphs };
}
