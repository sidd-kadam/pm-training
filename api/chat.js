export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { system, userMsg } = req.body || {};
  if (!system || !userMsg) return res.status(400).json({ error: 'Missing system or userMsg' });

  const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured. Add VITE_ANTHROPIC_API_KEY to Vercel environment variables.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        system,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();
    
    if (!response.ok || data.error) {
      return res.status(400).json({ 
        error: data?.error?.message || `Anthropic returned ${response.status}` 
      });
    }

    const text = (data.content || []).map(b => b.text || '').join('');
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
