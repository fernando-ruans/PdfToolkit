import Busboy from 'busboy';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Streaming upload handler: writes each file to a temp path and stores metadata in req.filesMeta
export function streamUploadHandler(req, res, next) {
  if (req.method !== 'POST') return next();

  const bb = Busboy({ headers: req.headers, limits: { files: 50 } });
  const filesMeta = [];

  bb.on('file', (fieldname, file, { filename, mimeType }) => {
    const tmpdir = os.tmpdir();
    const id = uuidv4();
    const safeName = filename?.replace(/[^a-zA-Z0-9_.-]/g, '_') || `file_${id}`;
    const filepath = path.join(tmpdir, `upload_${id}_${safeName}`);

    const writeStream = fs.createWriteStream(filepath);
    file.pipe(writeStream);

    const meta = { fieldname, filename: safeName, filepath, mimetype: mimeType, originalname: filename };
    filesMeta.push(meta);

    file.on('limit', () => {
      console.warn('File limit reached for', filename);
    });

    writeStream.on('error', (err) => {
      console.error('Write error', err);
    });
  });

  bb.on('field', (name, val) => {
    if (!req.body) req.body = {};
    req.body[name] = val;
  });

  bb.on('close', () => {
    req.filesMeta = filesMeta;
    next();
  });

  bb.on('error', (err) => {
    console.error('Busboy error', err);
    res.status(500).json({ error: 'Upload error' });
  });

  req.pipe(bb);
}
