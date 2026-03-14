export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { system, userMsg } = req.body || {};
  if (!system || !userMsg) return res.status(400).json({ error: "Missing params" });
  const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 700, system, messages: [{ role: "user", content: userMsg }] })
    });
    const d = await r.json();
    if (!r.ok) return res.status(400).json({ error: d?.error?.message || "API error" });
    return res.status(200).json({ text: (d.content || []).map(b => b.text || "").join("") });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
