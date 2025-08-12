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
    const targetFormat = (req.body && req.body.targetFormat) ? req.body.targetFormat.toLowerCase() : 'pdf';
    const forceZip = (req.body && (req.body.zip === '1' || req.body.zip === 'true')) || (req.query.zip === '1');

    // Apenas um arquivo
    if (filesMeta.length === 1) {
      const meta = filesMeta[0];
      // PDF para imagem
      if ((targetFormat === 'jpg' || targetFormat === 'jpeg' || targetFormat === 'png') && meta.mimetype === 'application/pdf') {
        // Usa pdftoppm para converter PDF em imagens
  let ext = 'jpg';
  let pdftoppmOpt = '-jpeg';
  if (targetFormat === 'png') { ext = 'png'; pdftoppmOpt = '-png'; }
  const { spawn } = await import('child_process');
  const outPrefix = meta.filepath.replace(/\.pdf$/i, '');
  const args = [pdftoppmOpt, meta.filepath, outPrefix];
        await new Promise((resolve, reject) => {
          console.log('[PDFTOPPM] Comando:', 'pdftoppm', args.join(' '));
          const proc = spawn('pdftoppm', args);
          let stderr = '';
          proc.stderr && proc.stderr.on('data', d => { stderr += d.toString(); });
          proc.on('error', (err) => {
            console.error('[PDFTOPPM] Erro ao spawn:', err);
            reject(err);
          });
          proc.on('exit', code => {
            if (code === 0) return resolve();
            console.error('[PDFTOPPM] Falha. Código:', code, 'Stderr:', stderr);
            reject(new Error('pdftoppm failed: ' + stderr));
          });
        });
        // Coleta todos os arquivos gerados
  const pathMod = await import('path');
  const dir = pathMod.dirname(meta.filepath);
  const base = pathMod.basename(outPrefix);
  const files = fs.readdirSync(dir).filter(f => f.startsWith(base) && f.endsWith('.'+ext));
        if (!files.length) throw new Error('Nenhuma imagem gerada');
        if (files.length === 1) {
          res.setHeader('Content-Type', ext === 'png' ? 'image/png' : 'image/jpeg');
          res.setHeader('Content-Disposition', `attachment; filename="${base}.${ext}"`);
          return fs.createReadStream(pathMod.join(dir, files[0])).pipe(res);
        } else {
          // Compacta em zip
          const archiver = (await import('archiver')).default;
          const archive = archiver('zip', { zlib: { level: 6 } });
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename="${base}_imagens.zip"`);
          files.forEach(f => archive.file(pathMod.join(dir, f), { name: f }));
          archive.finalize();
          return archive.pipe(res);
        }
      }
      // Imagem para JPG/PNG
      if ((targetFormat === 'jpg' || targetFormat === 'jpeg' || targetFormat === 'png') && meta.mimetype.startsWith('image/')) {
  const sharp = (await import('sharp')).default;
  const ext = targetFormat === 'png' ? 'png' : 'jpg';
  const pathMod = await import('path');
  const outPath = meta.filepath.replace(/\.[^.]+$/, '') + '_converted.' + ext;
  let img = sharp(meta.filepath);
  if (ext === 'png') img = img.png();
  else img = img.jpeg();
  await img.toFile(outPath);
  res.setHeader('Content-Type', ext === 'png' ? 'image/png' : 'image/jpeg');
  res.setHeader('Content-Disposition', `attachment; filename="${meta.filename.replace(/\.[^.]+$/, '')}.${ext}"`);
  return fs.createReadStream(outPath).pipe(res);
      }
      // Bloquear conversão Office e PDF↔Office
      if (['docx','pptx','xlsx'].includes(targetFormat) || ['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(meta.mimetype)) {
        return res.status(400).json({ error: 'Conversão entre arquivos Office e PDF não suportada neste servidor. Apenas imagens e PDF.' });
      }
      // Para PDF (default ou imagem para PDF)
      try {
        const pdfPath = await convertOneToPdf(meta);
        res.setHeader('Content-Type', 'application/pdf');
        const baseName = meta.filename.replace(/\.[^.]+$/, '') + '.pdf';
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}"`);
        return fs.createReadStream(pdfPath).pipe(res);
      } catch (err) {
        console.error('Erro ao converter imagem para PDF:', err);
        return res.status(400).json({ error: 'Falha ao converter imagem para PDF: ' + err.message });
      }
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
    res.status(500).json({ error: 'Conversion failed: ' + err.message });
  }
});

export default router;
