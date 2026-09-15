import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders question/option text that may contain inline LaTeX ($...$) and,
 * occasionally, a markdown pipe-table (used for match-the-following style
 * questions). Plain text with no $...$ or table renders exactly as before —
 * this is a drop-in replacement for printing `{text}` directly.
 */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMath(text) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts
    .map((part) => {
      if (part.length > 1 && part.startsWith('$') && part.endsWith('$')) {
        try {
          return katex.renderToString(part.slice(1, -1), { throwOnError: false });
        } catch {
          return escapeHtml(part);
        }
      }
      return escapeHtml(part).replace(/\n/g, '<br>');
    })
    .join('');
}

function mdTableToHtml(block) {
  const rows = block
    .trim()
    .split('\n')
    .filter((l) => l.trim().startsWith('|'));
  if (rows.length < 2) return null;
  const cells = rows.map((r) =>
    r
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
  );
  const header = cells[0];
  const body = cells.slice(2); // row 1 is the "---" separator
  let html = '<table><thead><tr>' + header.map((h) => `<th>${renderMath(h)}</th>`).join('') + '</tr></thead><tbody>';
  body.forEach((r) => {
    html += '<tr>' + r.map((c) => `<td>${renderMath(c)}</td>`).join('') + '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function isTableParagraph(paragraph) {
  const lines = paragraph.split('\n');
  return lines.length > 1 && lines.every((l) => l.trim().startsWith('|'));
}

export default function MathText({ text, as: Tag = 'span', className }) {
  if (!text || !text.trim()) return null;

  const paragraphs = text.split(/\n\n+/);
  const hasTable = paragraphs.some(isTableParagraph);

  if (!hasTable) {
    return <Tag className={className} dangerouslySetInnerHTML={{ __html: renderMath(text) }} />;
  }

  const html = paragraphs
    .map((p) => (isTableParagraph(p) ? mdTableToHtml(p) || `<p>${renderMath(p)}</p>` : `<p>${renderMath(p)}</p>`))
    .join('');
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
