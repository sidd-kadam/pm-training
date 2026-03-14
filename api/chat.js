const rateLimits = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const isGuest = req.body?.isGuest === true;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const key = `${ip}:${isGuest ? 'guest' : 'user'}`;
  const record = rateLimits.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) { record.count = 0; record.resetAt = now + windowMs; }
  record.count++;
  rateLimits.set(key, record);
  const limit = isGuest ? 4 : 40;
  if (record.count > limit) return res.status(429).json({ error: "Rate limit reached. Try again in an hour." });

  const { system, userMsg } = req.body;
  if (!system || !userMsg) return res.status(400).json({ error: "Missing system or userMsg" });

  const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured on server" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        system,
        messages: [{ role: "user", content: userMsg }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", JSON.stringify(data));
      return res.status(response.status).json({ error: data?.error?.message || "Anthropic API error" });
    }

    const text = data.content?.map(b => b.text || "").join("") || "";
    res.status(200).json({ text });
  } catch (e) {
    console.error("Server error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
