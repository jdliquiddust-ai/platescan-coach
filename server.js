import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://jdliquiddust-ai.github.io', 'http://localhost:5173'],
}));
app.use(express.json({ limit: '20mb' }));

// Load .env manually (no dotenv dependency)
if (existsSync(join(__dirname, '.env'))) {
  const env = readFileSync(join(__dirname, '.env'), 'utf-8');
  env.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#') && val.length) {
      process.env[key.trim()] = val.join('=').trim();
    }
  });
}

app.post('/api/claude', async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  const body = req.body;

  if (!key) {
    return res.status(500).json({ error: 'Server API key not configured.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve built frontend in production
const distPath = join(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`\n🥗 PlateScan Coach server → http://localhost:${PORT}`);
  console.log(`   Frontend dev server  → http://localhost:5173\n`);
});
