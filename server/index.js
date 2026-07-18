import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readStore, writeStore } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/store', (_req, res) => {
  try {
    res.json(readStore());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to read store' });
  }
});

app.put('/api/store', (req, res) => {
  try {
    const body = req.body || {};
    const saved = writeStore(body);
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save store' });
  }
});

// Production: serve built React app
app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`Smart Start server running on http://localhost:${PORT}`);
});
