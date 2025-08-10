import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

const pump = promisify(pipeline);

const imageMimes = new Set(['image/jpeg','image/png','image/bmp','image/tiff','image/webp','image/gif']);
const supportedImageFormats = new Set(['jpeg','jpg','png','bmp','tiff','tif','webp','gif']);

function tmpOutPath(name = 'output.pdf') {
  const id = uuidv4();
  return path.join(process.cwd(), `tmp_${id}_${name}`);
}

async function imageToPdf(inputPath) {
  const base = sharp(inputPath, { limitInputPixels: false });
  const metadata = await base.metadata();
  const fmt = (metadata.format || '').toLowerCase();
  if (!supportedImageFormats.has(fmt)) {
    throw new Error(`Formato de imagem não suportado: ${fmt || 'desconhecido'}`);
  }
  // Suporte específico para TIFF multi-página
  if (fmt === 'tiff' || fmt === 'tif') {
    return multiPageTiffToPdf(inputPath, metadata.pages || 1);
  }
  let buffer; let isPng = false; let isJpeg = false;
  if (fmt === 'jpeg' || fmt === 'jpg') { buffer = await base.jpeg().toBuffer(); isJpeg = true; }
  else if (fmt === 'png') { buffer = await base.png().toBuffer(); isPng = true; }
  else { // converte para PNG para formatos restantes suportados
    buffer = await base.png().toBuffer(); isPng = true;
  }
  const pdfDoc = await PDFDocument.create();
  let img; if (isPng) img = await pdfDoc.embedPng(buffer); else if (isJpeg) img = await pdfDoc.embedJpg(buffer);
  const { width, height } = img.scale(1);
  const page = pdfDoc.addPage([width, height]);
  page.drawImage(img, { x: 0, y: 0, width, height });
  const out = tmpOutPath('image.pdf');
  await fs.promises.writeFile(out, await pdfDoc.save());
  return out;
}

async function multiPageTiffToPdf(inputPath, pages) {
  const pdfDoc = await PDFDocument.create();
  const total = pages || 1;
  for (let i = 0; i < total; i++) {
    const frame = sharp(inputPath, { page: i, limitInputPixels: false });
    // Exportar cada página como PNG para embutir
    const buf = await frame.png().toBuffer();
    const img = await pdfDoc.embedPng(buf);
    const dims = img.scale(1);
    const page = pdfDoc.addPage([dims.width, dims.height]);
    page.drawImage(img, { x: 0, y: 0, width: dims.width, height: dims.height });
  }
  const out = tmpOutPath('image.pdf');
  await fs.promises.writeFile(out, await pdfDoc.save());
  return out;
}

async function officeToPdf(inputPath) {
  // Uses LibreOffice (soffice) to convert
  const outDir = path.dirname(inputPath);
  async function run(cmd) {
    const proc = spawn(cmd, ['--headless', '--convert-to', 'pdf', '--outdir', outDir, inputPath]);
    await new Promise((resolve, reject) => {
      proc.on('error', reject);
      proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(cmd + ' failed with ' + code))));
    });
  }
  try {
    await run('soffice');
  } catch (e) {
    // Windows typical path fallback
    const winPath = 'C\\\x3a\\\x5cProgram Files\\\x5cLibreOffice\\\x5cprogram\\\x5csoffice.exe'.replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    await run(winPath);
  }
  const basename = path.basename(inputPath);
  const pdfPath = path.join(outDir, basename.replace(/\.[^.]+$/, '.pdf'));
  if (!fs.existsSync(pdfPath)) throw new Error('PDF not found after conversion');
  return pdfPath;
}

async function htmlTxtToPdf(inputPath, mimetype) {
  // Basic fallback: wrap into minimal HTML and let LibreOffice convert
  return officeToPdf(inputPath);
}

export async function convertOneToPdf(meta) {
  const { filepath, mimetype, filename } = meta;
  try {
    if (imageMimes.has(mimetype)) {
      return await imageToPdf(filepath);
    }
    return await officeToPdf(filepath);
  } catch (e) {
    // Acrescenta formato detectado se possível
    let extra = '';
    try {
      const md = await sharp(filepath, { limitInputPixels: false }).metadata();
      if (md.format) extra = ` (detected format: ${md.format})`;
    } catch {}
    const wrapped = new Error(`Falha ao converter '${filename}': ${e.message}${extra}`);
    throw wrapped;
  }
}

export async function convertManyToPdf(filesMeta) {
  const archive = archiver('zip', { zlib: { level: 6 } });

  // Start async conversion per file, then append to zip streaming
  ;(async () => {
    for (const meta of filesMeta) {
      try {
        const pdfPath = await convertOneToPdf(meta);
        const name = path.basename(meta.filename, path.extname(meta.filename)) + '.pdf';
        archive.file(pdfPath, { name });
      } catch (e) {
        const name = path.basename(meta.filename, path.extname(meta.filename)) + '_ERROR.txt';
        const content = `Failed: ${e.message}\nStack: ${e.stack || ''}\n`;
        archive.append(content, { name });
      }
    }
    await archive.finalize();
  })().catch((e) => {
    archive.emit('error', e);
  });

  return archive;
}

export async function convertManyToSinglePdf(filesMeta) {
  // Converte cada arquivo para PDF e mescla em um único PDF
  const outDoc = await PDFDocument.create();
  const generatedPaths = [];
  try {
    for (const meta of filesMeta) {
      try {
        const pdfPath = await convertOneToPdf(meta);
        generatedPaths.push(pdfPath);
        const bytes = await fs.promises.readFile(pdfPath);
        const srcDoc = await PDFDocument.load(bytes);
        const copied = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        copied.forEach(p => outDoc.addPage(p));
      } catch (e) {
        // Insere página com texto de erro
        const page = outDoc.addPage([600, 100]);
        page.drawText(`Erro em ${meta.filename}: ${e.message}`, { x: 20, y: 60, size: 12 });
      }
    }
    const mergedBytes = await outDoc.save();
    const outPath = tmpOutPath('merged.pdf');
    await fs.promises.writeFile(outPath, mergedBytes);
    return outPath;
  } finally {
    // Limpeza assincrona (não bloqueia retorno)
    setTimeout(() => {
      generatedPaths.forEach(p => fs.promises.unlink(p).catch(()=>{}));
    }, 2000);
  }
}
