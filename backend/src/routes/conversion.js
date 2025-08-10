import express from 'express';
import fs from 'fs';
import { convertManyToPdf, convertOneToPdf, convertManyToSinglePdf } from '../services/conversion.service.js';
import { streamUploadHandler } from '../utils/streamUpload.js';

const router = express.Router();

// POST /api/convert
router.post('/', streamUploadHandler, async (req, res) => {
  try {
    const filesMeta = req.filesMeta || [];
    if (!filesMeta.length) return res.status(400).json({ error: 'No files uploaded' });

    const forceZip = (req.body && (req.body.zip === '1' || req.body.zip === 'true')) || (req.query.zip === '1');
    if (filesMeta.length === 1) {
      // Retorna PDF único
      const pdfPath = await convertOneToPdf(filesMeta[0]);
      res.setHeader('Content-Type', 'application/pdf');
      const baseName = filesMeta[0].filename.replace(/\.[^.]+$/, '') + '.pdf';
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}"`);
      return fs.createReadStream(pdfPath).pipe(res);
    }

    // Múltiplos arquivos: se não for solicitado ZIP explicitamente, mescla em um único PDF
    if (!forceZip) {
      const mergedPath = await convertManyToSinglePdf(filesMeta);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
      return fs.createReadStream(mergedPath).pipe(res);
    }

  // ZIP solicitado
    const zipStream = await convertManyToPdf(filesMeta);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="converted_pdfs.zip"');
    zipStream.pipe(res);
    zipStream.on('error', (err) => {
      console.error('Zip stream error:', err);
      if (!res.headersSent) res.status(500).end('Conversion error');
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

export default router;
