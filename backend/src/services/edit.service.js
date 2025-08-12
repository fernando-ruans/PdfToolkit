export async function compressPdf(file, level = 'default') {
  // Usa qpdf ou ghostscript se disponível
  const outPath = file.filepath + '.compressed.pdf';
  // Tenta qpdf (compressão básica)
  try {
    await new Promise((resolve, reject) => {
      const args = ['--stream-data=compress', '--object-streams=generate', file.filepath, outPath];
      const proc = spawn('qpdf', args);
      proc.on('error', reject);
      proc.on('exit', code => code === 0 ? resolve() : reject(new Error('qpdf exit ' + code)));
    });
    return fs.createReadStream(outPath);
  } catch {}
  // Tenta ghostscript (compressão mais forte)
  try {
    await new Promise((resolve, reject) => {
      const args = ['-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4', '-dPDFSETTINGS=/' + (level || 'default'), '-dNOPAUSE', '-dQUIET', '-dBATCH', `-sOutputFile=${outPath}`, file.filepath];
      const proc = spawn('gs', args);
      proc.on('error', reject);
      proc.on('exit', code => code === 0 ? resolve() : reject(new Error('ghostscript exit ' + code)));
    });
    return fs.createReadStream(outPath);
  } catch {}
  throw new Error('Nenhum compressor disponível (qpdf ou ghostscript)');
}
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import archiver from 'archiver';
import { Readable } from 'stream';
import { spawn } from 'child_process';

function bufferToStream(buf) {
  return Readable.from(buf);
}

async function readPdf(meta) {
  const bytes = await fs.promises.readFile(meta.filepath);
  return PDFDocument.load(bytes, { ignoreEncryption: false });
}

export async function addPages(files, targetIndex) {
  // Expect first to be base, rest pages (PDFs) to insert
  const [base, ...toInsert] = files;
  const basePdf = await readPdf(base);
  for (const f of toInsert) {
    const doc = await readPdf(f);
    const copied = await basePdf.copyPages(doc, doc.getPageIndices());
    const idx = targetIndex ?? basePdf.getPageCount();
    copied.forEach((p, i) => basePdf.insertPage(idx + i, p));
  }
  const out = await basePdf.save();
  return bufferToStream(out);
}

export async function removePages(file, pages) {
  const pdf = await readPdf(file);
  const total = pdf.getPageCount();
  const toRemove = new Set(String(pages || '').split(',').map((s) => Number(s.trim()) - 1).filter((n) => !isNaN(n) && n >= 0 && n < total));
  const keep = [];
  for (let i = 0; i < total; i++) if (!toRemove.has(i)) keep.push(i);
  const newPdf = await PDFDocument.create();
  const copied = await newPdf.copyPages(pdf, keep);
  copied.forEach((p) => newPdf.addPage(p));
  const out = await newPdf.save();
  return bufferToStream(out);
}

export async function mergePdfs(files) {
  const outPdf = await PDFDocument.create();
  for (const f of files) {
    const doc = await readPdf(f);
    const copied = await outPdf.copyPages(doc, doc.getPageIndices());
    copied.forEach((p) => outPdf.addPage(p));
  }
  const out = await outPdf.save();
  return bufferToStream(out);
}

export async function splitPdf(file, ranges) {
  const doc = await readPdf(file);
  const total = doc.getPageCount();
  const archive = archiver('zip', { zlib: { level: 6 } });

  (async () => {
    const parts = String(ranges || `1-${total}`)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    let idx = 1;
    for (const part of parts) {
      const m = part.match(/^(\d+)-(\d+)$/);
      let s = 1, e = total;
      if (m) { s = Number(m[1]); e = Number(m[2]); }
      const start = Math.max(1, s) - 1;
      const end = Math.min(total, e) - 1;
      const newPdf = await PDFDocument.create();
      const copied = await newPdf.copyPages(doc, Array.from({ length: end - start + 1 }, (_, i) => start + i));
      copied.forEach((p) => newPdf.addPage(p));
      const out = await newPdf.save();
      archive.append(Buffer.from(out), { name: `split_${idx++}.pdf` });
    }
    await archive.finalize();
  })().catch((e) => archive.emit('error', e));

  return archive;
}

export async function rotatePages(file, pages, angle) {
  const pdf = await readPdf(file);
  const total = pdf.getPageCount();
  const targets = new Set(String(pages || '').split(',').map((s) => Number(s.trim()) - 1).filter((n) => !isNaN(n) && n >= 0 && n < total));
  pdf.getPages().forEach((p, i) => {
    if (targets.size === 0 || targets.has(i)) p.setRotation((p.getRotation().angle + angle) % 360);
  });
  const out = await pdf.save();
  return bufferToStream(out);
}

export async function reorderPages(file, order) {
  const pdf = await readPdf(file);
  const total = pdf.getPageCount();
  const orderArr = String(order || '')
    .split(',')
    .map(s => Number(s.trim()) - 1)
    .filter(n => !isNaN(n) && n >= 0 && n < total);
  if (!orderArr.length) throw new Error('Ordem inválida');
  const newPdf = await PDFDocument.create();
  const copied = await newPdf.copyPages(pdf, orderArr);
  copied.forEach(p => newPdf.addPage(p));
  return bufferToStream(await newPdf.save());
}

export async function addPageNumbers(file, startAt = 1) {
  const pdf = await readPdf(file);
  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pages.forEach((p, i) => {
    const { width } = p.getSize();
    const num = startAt + i;
    const text = String(num);
    const size = 10;
    p.drawText(text, { x: width / 2 - (text.length * size * 0.25), y: 15, size, font, color: rgb(0, 0, 0) });
  });
  return bufferToStream(await pdf.save());
}

export async function watermarkPdf(file, text, opacity = 0.15, size = 48) {
  const pdf = await readPdf(file);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.getPages().forEach(p => {
    const { width, height } = p.getSize();
    p.drawText(text || 'WATERMARK', {
      x: width / 4,
      y: height / 2,
      size,
      font,
      color: rgb(0.8, 0.1, 0.1),
      rotate: { type: 'degrees', angle: 35 },
      opacity: Number(opacity) || 0.15
    });
  });
  return bufferToStream(await pdf.save());
}

export async function pdfToImages(file) {
  // Usa pdftoppm se disponível para gerar PNGs
  const archive = archiver('zip', { zlib: { level: 6 } });
  (async () => {
    try {
      const tmp = os.tmpdir();
      const prefix = path.join(tmp, 'pg_' + Date.now());
      await new Promise((resolve, reject) => {
        const proc = spawn('pdftoppm', ['-png', file.filepath, prefix]);
        proc.on('error', reject);
        proc.on('exit', code => code === 0 ? resolve() : reject(new Error('pdftoppm exit ' + code)));
      });
      const dir = path.dirname(prefix);
      const base = path.basename(prefix);
      const files = await fs.promises.readdir(dir);
      const imgs = files.filter(f => f.startsWith(base + '-') && f.endsWith('.png'));
      if (!imgs.length) archive.append('Nenhuma imagem gerada', { name: 'README.txt' });
      for (const img of imgs) {
        const buf = await fs.promises.readFile(path.join(dir, img));
        archive.append(buf, { name: img });
      }
    } catch (e) {
      archive.append(`Erro: ${e.message}\nInstale poppler (pdftoppm) para suporte.`, { name: 'ERROR.txt' });
    }
    await archive.finalize();
  })().catch(e => archive.emit('error', e));
  return archive;
}

export async function comparePdfs(fileA, fileB) {
  const a = await readPdf(fileA);
  const b = await readPdf(fileB);
  const diff = {
    pagesA: a.getPageCount(),
    pagesB: b.getPageCount(),
    samePageCount: a.getPageCount() === b.getPageCount(),
    // heurística simples: tamanhos de página primeira e última
    firstPageDimsA: a.getPage(0).getSize(),
    firstPageDimsB: b.getPage(0).getSize()
  };
  const json = JSON.stringify(diff, null, 2);
  return bufferToStream(Buffer.from(json));
}

export async function addContent(files, opsJson) {
  // First file is base PDF, others can be images to embed
  const [file, ...others] = Array.isArray(files) ? files : [files];
  const pdf = await readPdf(file);
  const pages = pdf.getPages();
  let ops = [];
  try { ops = JSON.parse(opsJson || '[]'); } catch {}
  for (const op of ops) {
    const { type, page = 1, x = 50, y = 50, text = '', size = 12, color = '#000000', width = 100, height = 20, filename } = op;
    const idx = Math.max(1, Number(page)) - 1;
    const pg = pages[idx] || pages[0];
    const [r, g, b] = color.startsWith('#') && (color.length === 7 || color.length === 4)
      ? [parseInt(color.slice(1, 3), 16) / 255, parseInt(color.slice(3, 5), 16) / 255, parseInt(color.slice(5, 7), 16) / 255]
      : [0, 0, 0];
    if (type === 'text') {
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      pg.drawText(text, { x, y, size, color: rgb(r, g, b), font });
    } else if (type === 'image') {
      // Find matching uploaded file by original name or use first extra
      const imgMeta = (filename && others.find(f => (f.originalname || f.filename) === filename)) || others[0];
      if (imgMeta) {
        const imgBytes = await fs.promises.readFile(imgMeta.filepath);
        // Try embed as PNG then JPG
        let img;
        try { img = await pdf.embedPng(imgBytes); } catch { img = await pdf.embedJpg(imgBytes); }
        const dims = img.scale(1);
        pg.drawImage(img, { x, y, width: width || dims.width, height: height || dims.height });
      }
    } else if (type === 'highlight') {
      pg.drawRectangle({ x, y, width, height, color: rgb(1, 1, 0), opacity: 0.3, borderOpacity: 0 });
    }
    // Images/annotations could be extended: accept data URLs as additional uploaded files and embed similarly
  }
  const out = await pdf.save();
  return bufferToStream(out);
}

export async function resizePages(file, width, height) {
  const pdf = await readPdf(file);
  const pages = pdf.getPages();
  pages.forEach((pg) => {
    const { width: w, height: h } = pg.getSize();
    pg.setSize(width || w, height || h);
  });
  const out = await pdf.save();
  return bufferToStream(out);
}

export async function protectPdf(file, password) {
  const src = await readPdf(file);
  const outPdf = await PDFDocument.create();
  const copied = await outPdf.copyPages(src, src.getPageIndices());
  copied.forEach((p) => outPdf.addPage(p));
  outPdf.encrypt({ userPassword: password, ownerPassword: password, permissions: { printing: 'highResolution' } });
  const out = await outPdf.save();
  return bufferToStream(out);
}

export async function unprotectPdf(file, password) {
  // Tenta usar qpdf se disponível: qpdf --password=<pwd> --decrypt in.pdf out.pdf
  const outChunks = [];
  const outPath = file.filepath + '.decrypted.pdf';
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn('qpdf', [`--password=${password || ''}`, '--decrypt', file.filepath, outPath]);
      proc.on('error', reject);
      proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('qpdf failed ' + code))));
    });
    const buf = await fs.promises.readFile(outPath);
    return bufferToStream(buf);
  } catch (e) {
    // Fallback: tenta re-salvar se não estiver protegido
    const pdf = await readPdf(file);
    const out = await pdf.save();
    return bufferToStream(out);
  }
}

export async function extractContent(file) {
  // Extrai texto básico via pdfjs-dist e salva PDF original
  const archive = archiver('zip', { zlib: { level: 6 } });
  (async () => {
    const bytes = await fs.promises.readFile(file.filepath);
    archive.append(bytes, { name: 'document.pdf' });
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) });
      const pdfDoc = await loadingTask.promise;
      let allText = '';
      const max = Math.min(pdfDoc.numPages, 200);
      for (let i = 1; i <= max; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((it) => (it.str || '')).join(' ');
        allText += `\n\n=== Page ${i} ===\n${text}`;
      }
      archive.append(allText, { name: 'text.txt' });
    } catch (e) {
      archive.append('', { name: 'text.txt' });
    }
    // Tentar extrair imagens rasterizando páginas via pdftoppm, se disponível
    try {
      const tmp = os.tmpdir();
      const outPrefix = path.join(tmp, 'ppm_' + Date.now());
      await new Promise((resolve, reject) => {
        const proc = spawn('pdftoppm', ['-png', file.filepath, outPrefix]);
        proc.on('error', reject);
        proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('pdftoppm failed ' + code))));
      });
      // Collect generated files: outPrefix-1.png, outPrefix-2.png, ...
      const dir = path.dirname(outPrefix);
      const base = path.basename(outPrefix);
      const files = await fs.promises.readdir(dir);
      const images = files.filter((f) => f.startsWith(base + '-') && f.endsWith('.png'));
      for (const img of images) {
        const p = path.join(dir, img);
        const buf = await fs.promises.readFile(p);
        archive.append(buf, { name: `images/${img}` });
      }
    } catch (e) {
      // ignore if not available
    }
    await archive.finalize();
  })().catch((e) => archive.emit('error', e));
  return archive;
}

export async function signPdf(file, { signerName, p12Path, passphrase }) {
  // If P12 provided, perform actual digital signature; else, draw visual note
  if (p12Path) {
    const input = await fs.promises.readFile(file.filepath);
    const p12 = await fs.promises.readFile(p12Path);
    try {
      const mod = await import('node-signpdf');
      const maybeDefault = mod.default || mod;
      const signFn = typeof maybeDefault === 'function' ? maybeDefault : maybeDefault.sign;
      const signed = await signFn(input, p12, { passphrase: passphrase || '' });
      return bufferToStream(signed);
    } catch (e) {
      // Fallback to visual note if signing fails
      console.warn('node-signpdf failed, falling back to visual signature:', e.message);
    }
  }
  const pdf = await readPdf(file);
  const pages = pdf.getPages();
  const first = pages[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  first.drawText(`Signed by: ${signerName || 'Unknown'}`, { x: 50, y: 30, size: 10, font, color: rgb(0, 0, 0) });
  const out = await pdf.save();
  return bufferToStream(out);
}
