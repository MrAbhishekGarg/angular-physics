import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { DOMParser } from '@xmldom/xmldom';
import xpath from 'xpath';
import sharp from 'sharp';
import { saveQuestionImage } from './questionImageStorage.js';

const execFileAsync = promisify(execFile);

const NS = {
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  v: 'urn:schemas-microsoft-com:vml',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
};
const select = xpath.useNamespaces(NS);

const RASTER_MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
};

const MAGICK_CANDIDATES = [process.env.IMAGEMAGICK_PATH, 'magick', 'convert'].filter(Boolean);
let cachedMagickPath;

/**
 * Resolves once per process and caches the result — mirrors the old
 * findSoffice()'s caching pattern.
 */
async function findMagick() {
  if (cachedMagickPath !== undefined) return cachedMagickPath;

  for (const candidate of MAGICK_CANDIDATES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await execFileAsync(candidate, ['-version'], { timeout: 10000 });
      cachedMagickPath = candidate;
      return candidate;
    } catch {
      // try next candidate
    }
  }
  cachedMagickPath = null;
  return null;
}

/**
 * Loads word/_rels/document.xml.rels into a Map<rId, targetPath-relative-to-word/>.
 * Relationship elements sit under the package-relationships DEFAULT namespace
 * (not one of the prefixed namespaces used elsewhere in this codebase), so
 * matching is by local-name() rather than a registered-prefix select.
 * Returns an empty Map (never throws) if the part is missing — a malformed
 * or unusual .docx should degrade to "no image found" for every paragraph,
 * not crash the whole upload.
 */
export async function loadRelationships(zip) {
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) return new Map();

  const xml = await relsFile.async('string');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const nodes = xpath.select("//*[local-name()='Relationship']", doc);

  const map = new Map();
  nodes.forEach((node) => {
    const id = node.getAttribute('Id');
    const target = node.getAttribute('Target');
    const mode = node.getAttribute('TargetMode');
    if (id && target && mode !== 'External') map.set(id, target);
  });
  return map;
}

function resolveRelTargetToZipPath(target) {
  // Targets are relative to word/ ("media/image1.wmf") in every real-world
  // case seen here; normalize defensively in case of a stray "../".
  return path.posix.normalize(path.posix.join('word', target));
}

/**
 * Finds a paragraph's embedded picture's or legacy equation object's
 * relationship id — modern DrawingML picture first (a:blip/@r:embed), then
 * the legacy VML/OLE equation fallback-preview path (v:imagedata/@r:id,
 * e.g. a MathType "Equation.DSMT4" object's pre-rendered WMF preview). Mirrors
 * the two checks docxStructureParser.js's paragraphHasImage() already uses
 * for detection. Only the first match is used if a paragraph somehow has
 * more than one embed — a known, accepted limitation.
 */
function findImageRelId(pNode) {
  const blip = select('.//a:blip/@r:embed', pNode)[0];
  if (blip) return blip.value;
  const imagedata = select('.//v:imagedata/@r:id', pNode)[0];
  if (imagedata) return imagedata.value;
  return null;
}

async function convertMetafileToPng(raw, ext, label, warnings) {
  const magick = await findMagick();
  if (!magick) {
    warnings.push(`${label}: image conversion is unavailable on this server (ImageMagick not found) — showing plain text only.`);
    return null;
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-img-'));
  try {
    const inPath = path.join(workDir, `in${ext}`);
    const outPath = path.join(workDir, 'out.png');
    fs.writeFileSync(inPath, raw);

    try {
      await execFileAsync(magick, ['-density', '300', '-background', 'white', inPath, '-flatten', outPath], { timeout: 20000 });
    } catch (err) {
      // EMF specifically isn't reliably supported by libwmf on Linux — treat
      // a conversion failure as an expected "no image", not a hard error.
      warnings.push(`${label}: could not convert embedded ${ext.slice(1).toUpperCase()} image (${err.message}) — showing plain text only.`);
      return null;
    }

    if (!fs.existsSync(outPath)) return null;
    return fs.readFileSync(outPath);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

/**
 * Extracts a paragraph's embedded picture/equation-preview, converts it to a
 * PNG if needed, saves it via saveQuestionImage(), and returns the served
 * URL — or null if the paragraph has no image, the relationship can't be
 * resolved, or conversion fails. Failures push a warning onto `warnings`
 * (matching the old per-fragment graceful-failure pattern) instead of
 * throwing, so one bad embedded object never fails the whole upload.
 */
export async function extractParagraphImage(pNode, zip, relsMap, warnings, label) {
  const relId = findImageRelId(pNode);
  if (!relId) return null;

  const target = relsMap.get(relId);
  if (!target) {
    warnings.push(`${label}: found an embedded image reference but couldn't resolve it in the document's relationships — skipped.`);
    return null;
  }

  const zipPath = resolveRelTargetToZipPath(target);
  const file = zip.file(zipPath);
  if (!file) {
    warnings.push(`${label}: embedded image "${zipPath}" was referenced but not found in the document — skipped.`);
    return null;
  }

  const raw = await file.async('nodebuffer');
  const ext = path.posix.extname(zipPath).toLowerCase();

  try {
    if (ext === '.wmf' || ext === '.emf') {
      const converted = await convertMetafileToPng(raw, ext, label, warnings);
      if (!converted) return null;
      const trimmed = await sharp(converted).trim().png().toBuffer();
      return saveQuestionImage(trimmed, 'image/png');
    }

    if (RASTER_MIME_BY_EXT[ext]) {
      const trimmed = await sharp(raw).trim().png().toBuffer();
      return saveQuestionImage(trimmed, 'image/png');
    }

    warnings.push(`${label}: embedded image has an unsupported format (${ext || 'unknown'}) — skipped.`);
    return null;
  } catch (err) {
    warnings.push(`${label}: failed to process an embedded image (${err.message}) — showing plain text only.`);
    return null;
  }
}
