import fs from 'fs';

/**
 * Range-aware file streaming so <video> seeking works. Responds with 206 +
 * Content-Range when a Range header is present, otherwise streams the whole
 * file as 200. Shared by the video streaming route (and reusable for any
 * future large-file route) rather than duplicating Range parsing per route.
 */
export function streamFile(req, res, absolutePath, mimeType) {
  const stat = fs.statSync(absolutePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Disposition', 'inline');

  if (!range) {
    res.setHeader('Content-Length', fileSize);
    res.status(200);
    fs.createReadStream(absolutePath).pipe(res);
    return;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
  const chunkSize = end - start + 1;

  if (start >= fileSize || end >= fileSize) {
    res.setHeader('Content-Range', `bytes */${fileSize}`);
    res.status(416).end();
    return;
  }

  res.status(206);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  res.setHeader('Content-Length', chunkSize);
  fs.createReadStream(absolutePath, { start, end }).pipe(res);
}
