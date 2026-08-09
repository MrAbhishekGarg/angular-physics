import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import JSZip from 'jszip';
import { XMLSerializer } from '@xmldom/xmldom';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

const SOFFICE_CANDIDATES = [
  process.env.SOFFICE_PATH,
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  'soffice',
].filter(Boolean);

let cachedSofficePath;

/**
 * Resolves once per process and caches the result — checking on every
 * request would mean spawning a process just to answer "is it there".
 */
export async function findSoffice() {
  if (cachedSofficePath !== undefined) return cachedSofficePath;

  for (const candidate of SOFFICE_CANDIDATES) {
    try {
      // LibreOffice's very first launch after install is slow (cold profile
      // initialization can take 15-20s+); later launches are much faster.
      // eslint-disable-next-line no-await-in-loop
      await execFileAsync(candidate, ['--version'], { timeout: 30000 });
      cachedSofficePath = candidate;
      return candidate;
    } catch {
      // try next candidate
    }
  }
  cachedSofficePath = null;
  return null;
}

/**
 * Builds a standalone single-paragraph(s) .docx from an already-parsed
 * package (see docxStructureParser.js) — copies every original part
 * verbatim (styles, fonts, theme, media, embeddings, relationships) except
 * word/document.xml, which is replaced with just the given paragraph
 * node(s). This keeps whatever fonts/Symbol-character tricks/embedded
 * MathType or picture objects those paragraphs reference intact, so
 * rendering it produces a faithful crop of exactly what Word would show —
 * far more robust than rendering the whole document and trying to figure
 * out where on the page a given question/option ended up.
 */
async function buildFragmentDocxBuffer(zip, documentRootNode, paragraphNodes) {
  const fragmentZip = new JSZip();

  const entries = Object.keys(zip.files);
  for (const entryPath of entries) {
    const file = zip.files[entryPath];
    if (file.dir || entryPath === 'word/document.xml') continue;
    // eslint-disable-next-line no-await-in-loop
    const content = await file.async('nodebuffer');
    fragmentZip.file(entryPath, content);
  }

  const serializer = new XMLSerializer();
  const namespaceAttrs = Array.from(documentRootNode.attributes)
    .map((attr) => `${attr.name}="${attr.value}"`)
    .join(' ');
  const paragraphsXml = paragraphNodes.map((p) => serializer.serializeToString(p)).join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${namespaceAttrs}><w:body>${paragraphsXml}</w:body></w:document>`;
  fragmentZip.file('word/document.xml', documentXml);

  return fragmentZip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Renders each { key, paragraphNodes } group to a tightly-cropped PNG
 * buffer, batched through a single LibreOffice invocation (LO's ~3-5s
 * startup cost is paid once, not per-question/option — critical since a
 * 20-question test can mean 60-100+ individual fragments).
 *
 * Returns a Map<key, Buffer> — entries are omitted for any fragment that
 * failed to render (caller decides how to warn about those).
 */
export async function renderFragmentsToImages(zip, documentRootNode, fragments) {
  const soffice = await findSoffice();
  if (!soffice) return new Map();

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-fragments-'));
  const keyToBuffer = new Map();

  try {
    const keyByFilename = new Map();
    await Promise.all(
      fragments.map(async ({ key, paragraphNodes }, i) => {
        const buffer = await buildFragmentDocxBuffer(zip, documentRootNode, paragraphNodes);
        const filename = `frag${i}.docx`;
        fs.writeFileSync(path.join(workDir, filename), buffer);
        keyByFilename.set(filename, key);
      })
    );

    const inputFiles = [...keyByFilename.keys()];
    if (inputFiles.length === 0) return keyToBuffer;

    try {
      await execFileAsync(
        soffice,
        ['--headless', '--norestore', '--convert-to', 'png', '--outdir', workDir, ...inputFiles],
        { cwd: workDir, timeout: 120000 }
      );
    } catch (err) {
      // A single malformed fragment (e.g. an embedded object LibreOffice's
      // filter chokes on) can crash the whole batch job with no per-file
      // error output — so on batch failure, fall back to converting each
      // fragment one at a time. Slower, but one bad fragment then only
      // costs its own image instead of every image in the upload.
      console.warn(
        `[docx-render] Batch conversion of ${inputFiles.length} fragment(s) failed (${err.message}) — retrying one at a time.`
      );
      for (const filename of inputFiles) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await execFileAsync(soffice, ['--headless', '--norestore', '--convert-to', 'png', '--outdir', workDir, filename], {
            cwd: workDir,
            timeout: 30000,
          });
        } catch (fileErr) {
          console.warn(`[docx-render] Failed to render ${filename}: ${fileErr.message}`);
        }
      }
    }

    await Promise.all(
      inputFiles.map(async (filename) => {
        const pngPath = path.join(workDir, filename.replace(/\.docx$/, '.png'));
        if (!fs.existsSync(pngPath)) return;
        const raw = fs.readFileSync(pngPath);
        const trimmed = await sharp(raw).trim().png().toBuffer();
        keyToBuffer.set(keyByFilename.get(filename), trimmed);
      })
    );
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }

  return keyToBuffer;
}
