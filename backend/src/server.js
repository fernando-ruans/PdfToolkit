import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import conversionRouter from './routes/conversion.js';
import editRouter from './routes/edit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


app.use(cors());
app.use(express.json());


app.use('/api/convert', conversionRouter);
app.use('/api/edit', editRouter);

// Serve frontend build (monolito)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});
