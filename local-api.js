// Local API server for development testing
// Proxies /api/chat and /api/feedback using OpenAI (compatible with the app's interface)
import express from 'express';
import { createServer } from 'http';

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post('/api/chat', async (req, res) => {
  const { system, userMsg } = req.body || {};
  if (!system || !userMsg) return res.status(400).json({ error: 'Missing params' });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'API key not configured' });
  
  try {
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${OPENAI_API_KEY}` 
      },
      body: JSON.stringify({ 
        model: 'gpt-4.1-mini', 
        max_tokens: 700, 
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg }
        ] 
      })
    });
    const d = await r.json();
    if (!r.ok) {
      console.error('API error:', JSON.stringify(d));
      return res.status(400).json({ error: d?.error?.message || d?.message || JSON.stringify(d) || 'API error' });
    }
    return res.status(200).json({ text: d.choices?.[0]?.message?.content || '' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  // Just acknowledge feedback
  return res.status(200).json({ ok: true });
});

const PORT = 3001;
createServer(app).listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});
