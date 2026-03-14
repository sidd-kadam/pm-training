export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { name, age, field, experience, lastScore, rating, freq, missing, wouldPay, priceRange, recommend, extra } = req.body || {};
  if (!rating) return res.status(400).json({ error: "Rating required" });

  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const labels = ["","Poor","Fair","Good","Great","Excellent"];

  const row = (label, value) => value ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px;width:160px;vertical-align:top">${label}</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#111;font-size:14px">${value}</td></tr>` : "";

  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#fafafa;">
      <div style="background:linear-gradient(135deg,#7C3AED,#4338CA);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <h2 style="margin:0;color:#fff;font-size:18px">New Guest Feedback</h2>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px">PM Training App</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin:0 0 14px">Guest Profile</p>
        <table style="width:100%;border-collapse:collapse">
          ${row("Name", name)} ${row("Age", age)} ${row("Field", field)} ${row("Experience", experience)} ${row("Last score", lastScore ? lastScore + "/10" : null)}
        </table>
      </div>
      <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin:0 0 14px">Survey Responses</p>
        <table style="width:100%;border-collapse:collapse">
          ${row("Rating", `${stars} ${rating}/5 — ${labels[rating]}`)}
          ${row("Usage frequency", freq)}
          ${row("Recommend?", recommend)}
        </table>
      </div>
      <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px;padding:20px;margin-bottom:16px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7C3AED;margin:0 0 14px">💰 Pricing</p>
        <table style="width:100%;border-collapse:collapse">
          ${row("Would pay?", wouldPay)} ${row("Price range", priceRange || "Not specified")}
        </table>
      </div>
      ${missing ? `<div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;"><p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin:0 0 10px">What is missing</p><p style="font-size:15px;color:#111;line-height:1.7;margin:0">${missing}</p></div>` : ""}
      ${extra ? `<div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;"><p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin:0 0 10px">Additional comments</p><p style="font-size:15px;color:#111;line-height:1.7;margin:0">${extra}</p></div>` : ""}
      <p style="color:#ccc;font-size:12px;text-align:center;margin:0">pm-training-omega.vercel.app</p>
    </div>`;

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_EMAIL;

  if (!apiKey || !toEmail) {
    console.log("Feedback received (email not configured):", { name, rating, wouldPay });
    return res.status(200).json({ ok: true });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ from: "PM Training <onboarding@resend.dev>", to: [toEmail], subject: `${stars} Feedback from ${name || "Guest"} — PM Training`, html })
    });
    const d = await r.json();
    if (d.id) return res.status(200).json({ ok: true });
    console.error("Resend error:", d);
    return res.status(200).json({ ok: true }); // still return ok so survey completes
  } catch (e) {
    console.error("Feedback email error:", e.message);
    return res.status(200).json({ ok: true }); // still return ok
  }
}
