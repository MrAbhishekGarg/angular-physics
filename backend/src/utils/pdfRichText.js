import SVGtoPDF from 'svg-to-pdfkit';
import { renderMathToSvg } from './mathRenderer.js';

// Helvetica's own AFM metrics (what pdfkit's standard-14 fonts use) — the
// exact ascent/descent ratios, not an approximation, so plain text and
// inline math share one real baseline instead of an eyeballed one.
const ASCENT_RATIO = 0.718;
const DESCENT_RATIO = 0.207;

function tokenize(text) {
  const parts = String(text || '')
    .split(/(\$[^$]*\$)/g)
    .filter((p) => p !== '');
  const tokens = [];
  parts.forEach((part) => {
    if (part.length > 1 && part.startsWith('$') && part.endsWith('$')) {
      tokens.push({ type: 'math', tex: part.slice(1, -1) });
      return;
    }
    part.split(/(\s+)/).forEach((piece) => {
      if (piece === '') return;
      tokens.push(/^\s+$/.test(piece) ? { type: 'space' } : { type: 'word', value: piece });
    });
  });
  return tokens;
}

function measureTokens(doc, tokens, fontSize) {
  const spaceWidth = doc.widthOfString(' ');
  return tokens.map((t) => {
    if (t.type === 'space') return { type: 'space', width: spaceWidth };
    if (t.type === 'word') return { type: 'word', value: t.value, width: doc.widthOfString(t.value) };
    const math = renderMathToSvg(t.tex, fontSize);
    if (!math) {
      // Parse failure: fall back to the raw source rather than dropping
      // the expression silently.
      const raw = `$${t.tex}$`;
      return { type: 'word', value: raw, width: doc.widthOfString(raw) };
    }
    return { type: 'math', svg: math.svg, width: math.width, height: math.height, depth: math.depth };
  });
}

// Greedy word-wrap: packs tokens onto lines no wider than maxWidth,
// treating a math token as one unbreakable unit (like a long word).
function layoutLines(measuredTokens, maxWidth) {
  const lines = [];
  let current = [];
  let currentWidth = 0;
  const trimTrailingSpace = () => {
    while (current.length && current[current.length - 1].type === 'space') {
      currentWidth -= current.pop().width;
    }
  };
  measuredTokens.forEach((tok) => {
    if (tok.type === 'space') {
      if (current.length === 0) return;
      current.push(tok);
      currentWidth += tok.width;
      return;
    }
    if (currentWidth + tok.width > maxWidth && current.length > 0) {
      trimTrailingSpace();
      lines.push(current);
      current = [];
      currentWidth = 0;
    }
    current.push(tok);
    currentWidth += tok.width;
  });
  trimTrailingSpace();
  if (current.length) lines.push(current);
  return lines;
}

function lineMetrics(line, fontSize) {
  let above = fontSize * ASCENT_RATIO;
  let below = fontSize * DESCENT_RATIO;
  line.forEach((tok) => {
    if (tok.type !== 'math') return;
    above = Math.max(above, tok.height - tok.depth);
    below = Math.max(below, tok.depth);
  });
  return { above, below, total: above + below };
}

/**
 * Measures the total rendered height (points) of `text` — which may
 * contain $...$ inline math — word-wrapped to `maxWidth` at `fontSize`.
 * Mirrors pdfkit's doc.heightOfString() but accounts for embedded math.
 */
export function measureRichText(doc, text, maxWidth, fontSize, font = 'Helvetica') {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  doc.fontSize(fontSize).font(font);
  const measured = measureTokens(doc, tokens, fontSize);
  const lines = layoutLines(measured, maxWidth);
  const lineGap = fontSize * 0.3;
  return lines.reduce((sum, line) => sum + lineMetrics(line, fontSize).total, 0) + lineGap * Math.max(0, lines.length - 1);
}

/**
 * Draws `text` (may contain $...$ inline math, rendered via MathJax/SVG)
 * word-wrapped to `width` starting at (x, y). Plain-text runs and math
 * tokens share one baseline per line, computed from Helvetica's real
 * ascent/descent so the two don't drift apart. Returns the total height
 * drawn so the caller can advance its own layout cursor.
 */
export function drawRichText(doc, text, x, y, width, { fontSize = 10, font = 'Helvetica', color = '#111827' } = {}) {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  doc.fontSize(fontSize).font(font).fillColor(color);
  const measured = measureTokens(doc, tokens, fontSize);
  const lines = layoutLines(measured, width);
  const lineGap = fontSize * 0.3;
  const textAscent = fontSize * ASCENT_RATIO;

  let cursorY = y;
  lines.forEach((line, idx) => {
    const { above, total } = lineMetrics(line, fontSize);
    const baselineY = cursorY + above;
    let cursorX = x;
    line.forEach((tok) => {
      if (tok.type === 'space') {
        cursorX += tok.width;
        return;
      }
      if (tok.type === 'word') {
        doc.fontSize(fontSize).font(font).fillColor(color).text(tok.value, cursorX, baselineY - textAscent, { lineBreak: false });
        cursorX += tok.width;
        return;
      }
      const imgY = baselineY - (tok.height - tok.depth);
      try {
        // MathJax's SVG paints with fill/stroke="currentColor" so it
        // inherits whatever text color surrounds it in a browser — pdfkit
        // has no such cascade, so substitute the actual color directly
        // (e.g. teal for a highlighted correct answer) rather than always
        // rendering math in black regardless of context.
        const coloredSvg = tok.svg.replace(/currentColor/g, color);
        SVGtoPDF(doc, coloredSvg, cursorX, imgY, { width: tok.width, height: tok.height });
      } catch {
        // A malformed expression shouldn't take the whole PDF down —
        // skip drawing it, cursor still advances so layout stays intact.
      }
      cursorX += tok.width;
    });
    cursorY += total;
    if (idx < lines.length - 1) cursorY += lineGap;
  });

  return cursorY - y;
}
