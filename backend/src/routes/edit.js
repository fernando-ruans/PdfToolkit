
import express from 'express';
const router = express.Router();
import { streamUploadHandler } from '../utils/streamUpload.js';
import {
  addPages, removePages, mergePdfs, splitPdf, rotatePages,
  addContent, resizePages, protectPdf, unprotectPdf,
  extractContent, signPdf, reorderPages, addPageNumbers, watermarkPdf, pdfToImages, comparePdfs, compressPdf
} from '../services/edit.service.js';

router.post('/compress', streamUploadHandler, async (req, res) => {
  const { level } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const out = await compressPdf(files[0], level);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="compressed.pdf"');
    out.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao comprimir' });
  }
});

// router já declarado no topo

// All endpoints accept multipart stream with 1..N files depending on operation

router.post('/add-pages', streamUploadHandler, async (req, res) => {
  const { targetIndex } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF base + páginas necessárias' });
  try {
    const outStream = await addPages(files, Number(targetIndex) || undefined);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="edited.pdf"');
    outStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao adicionar páginas' });
  }
});

router.post('/remove-pages', streamUploadHandler, async (req, res) => {
  const { pages } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const outStream = await removePages(files[0], pages);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="edited.pdf"');
    outStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao remover páginas' });
  }
});

router.post('/merge', streamUploadHandler, async (req, res) => {
  const files = req.filesMeta || [];
  if (files.length < 2) return res.status(400).json({ error: 'Mínimo de 2 PDFs' });
  try {
    const outStream = await mergePdfs(files);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
    outStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao mesclar' });
  }
});

router.post('/split', streamUploadHandler, async (req, res) => {
  const { ranges } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const zipStream = await splitPdf(files[0], ranges);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="splits.zip"');
    zipStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao dividir' });
  }
});

router.post('/rotate', streamUploadHandler, async (req, res) => {
  const { pages, angle } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const outStream = await rotatePages(files[0], pages, Number(angle) || 90);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rotated.pdf"');
    outStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao rotacionar' });
  }
});

router.post('/add-content', streamUploadHandler, async (req, res) => {
  const { ops } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const outStream = await addContent(files[0], ops);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="annotated.pdf"');
    outStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao adicionar conteúdo' });
  }
});

router.post('/resize', streamUploadHandler, async (req, res) => {
  const { width, height } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const outStream = await resizePages(files[0], Number(width), Number(height));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resized.pdf"');
    outStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao redimensionar' });
  }
});

router.post('/protect', streamUploadHandler, async (req, res) => {
  const { password } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length || !password) return res.status(400).json({ error: 'PDF e senha necessários' });
  try {
    const outStream = await protectPdf(files[0], password);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="protected.pdf"');
    outStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao proteger' });
  }
});

router.post('/unprotect', streamUploadHandler, async (req, res) => {
  const { password } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length || !password) return res.status(400).json({ error: 'PDF e senha necessários' });
  try {
    const outStream = await unprotectPdf(files[0], password);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="unprotected.pdf"');
    outStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao desproteger' });
  }
});

router.post('/extract', streamUploadHandler, async (req, res) => {
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const zipStream = await extractContent(files[0]);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="extracted.zip"');
    zipStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao extrair' });
  }
});

router.post('/reorder', streamUploadHandler, async (req, res) => {
  const { order } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const out = await reorderPages(files[0], order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reordered.pdf"');
    out.pipe(res);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Falha ao reordenar' }); }
});

router.post('/page-numbers', streamUploadHandler, async (req, res) => {
  const { startAt } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const out = await addPageNumbers(files[0], Number(startAt) || 1);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="numbered.pdf"');
    out.pipe(res);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Falha ao numerar' }); }
});

router.post('/watermark', streamUploadHandler, async (req, res) => {
  const { text, opacity, size } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const out = await watermarkPdf(files[0], text, opacity, size);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="watermarked.pdf"');
    out.pipe(res);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Falha ao aplicar watermark' }); }
});

router.post('/pdf-to-images', streamUploadHandler, async (req, res) => {
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  try {
    const zip = await pdfToImages(files[0]);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="images.zip"');
    zip.pipe(res);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Falha ao converter em imagens' }); }
});

router.post('/compare', streamUploadHandler, async (req, res) => {
  const files = req.filesMeta || [];
  if (files.length < 2) return res.status(400).json({ error: 'Dois PDFs necessários' });
  try {
    const out = await comparePdfs(files[0], files[1]);
    res.setHeader('Content-Type', 'application/json');
    out.pipe(res);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Falha ao comparar' }); }
});

router.post('/sign', streamUploadHandler, async (req, res) => {
  const { signerName, passphrase } = req.body || {};
  const files = req.filesMeta || [];
  if (!files.length) return res.status(400).json({ error: 'PDF necessário' });
  // Optional: additional uploaded file with field "cert" is P12
  const cert = files.find(f => f.fieldname === 'cert');
  try {
    const outStream = await signPdf(files[0], { signerName, p12Path: cert?.filepath, passphrase });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="signed.pdf"');
    outStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao assinar' });
  }
});

export default router;
