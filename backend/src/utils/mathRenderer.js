import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
// fontCache 'none' bakes full glyph path data into every SVG instead of a
// shared <defs> block — each expression is extracted and embedded on its
// own, so there's no shared page context for a cached def to live in.
const texInput = new TeX({ packages: AllPackages });
const svgOutput = new SVG({ fontCache: 'none' });
const mathDocument = mathjax.document('', { InputJax: texInput, OutputJax: svgOutput });

// MathJax v3's SVG output always sizes its viewBox so 1000 units = 1em —
// a fixed convention of the TeX-derived fonts it ships, independent of any
// one expression. Its width/height/vertical-align attributes are in "ex"
// units instead, whose ratio to those 1000 units isn't a constant worth
// hardcoding (it's shifted by whichever glyphs are present) — each SVG's
// own width="Nex" against its own viewBox width gives an exact, per-SVG
// units-per-ex figure to convert vertical-align with, no guessing needed.
const VIEWBOX_UNITS_PER_EM = 1000;

/**
 * Renders a LaTeX expression to a standalone SVG plus the metrics needed
 * to place it inline with surrounding pdfkit text at a given font size:
 * render width/height in points, and how far the glyph's bottom edge
 * hangs below the text baseline (depth — e.g. a fraction bar's denominator,
 * or a subscript) so the caller can align it against normal text.
 * Returns null if the expression fails to parse (caller falls back to
 * printing the raw source instead of crashing the PDF).
 */
// A single test PDF can re-render the same expression many times (the
// same option reused across the student paper, the answer-key copy, and
// the answer-key table), and MathJax's TeX->SVG conversion isn't free —
// cache by (expression, font size) for the life of the server process.
// Bounded by the question bank's actual vocabulary of distinct
// expressions, which stays small relative to this being worth an LRU.
const svgCache = new Map();

export function renderMathToSvg(tex, fontSizePt) {
  const cacheKey = `${fontSizePt}:${tex}`;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey);

  let node;
  try {
    node = mathDocument.convert(tex, { display: false });
  } catch {
    svgCache.set(cacheKey, null);
    return null;
  }
  const outerHtml = adaptor.outerHTML(node);
  const svgMatch = outerHtml.match(/<svg[\s\S]*?<\/svg>/);
  if (!svgMatch) {
    svgCache.set(cacheKey, null);
    return null;
  }
  const svg = svgMatch[0];

  // viewBox is "minX minY width height" — MathJax shifts minY to a negative
  // offset (accounting for descenders below its internal baseline), so only
  // the width/height (3rd and 4th values) matter for sizing.
  const viewBoxMatch = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
  if (!viewBoxMatch) {
    svgCache.set(cacheKey, null);
    return null;
  }
  const vbWidth = parseFloat(viewBoxMatch[1]);
  const vbHeight = parseFloat(viewBoxMatch[2]);
  const scale = fontSizePt / VIEWBOX_UNITS_PER_EM;

  const widthExMatch = svg.match(/width="([\d.]+)ex"/);
  const heightExMatch = svg.match(/height="([\d.]+)ex"/);
  const valignMatch = svg.match(/vertical-align:\s*(-?[\d.]+)ex/);

  let depth = 0;
  if (valignMatch && widthExMatch && heightExMatch) {
    const widthEx = parseFloat(widthExMatch[1]);
    const heightEx = parseFloat(heightExMatch[1]);
    const unitsPerEx = (vbWidth / widthEx + vbHeight / heightEx) / 2;
    const valignEx = parseFloat(valignMatch[1]);
    // A negative vertical-align (the common case, e.g. a fraction) means the
    // box hangs below the baseline by that amount — depth is how much of
    // the rendered height sits below the baseline.
    depth = Math.max(0, -valignEx * unitsPerEx * scale);
  }

  const result = {
    svg,
    width: vbWidth * scale,
    height: vbHeight * scale,
    depth,
  };
  svgCache.set(cacheKey, result);
  return result;
}
