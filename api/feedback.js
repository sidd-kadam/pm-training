export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Accept both old and new payload shapes for backwards compatibility
  const {
    name, age,
    field, industry,          // old: field, new: industry
    experience,
    lastScore,
    rating,
    easyToUse,                // new field
    comment, extra,           // old: extra, new: comment
    improve, missing,         // old: missing, new: improve
    freq, sessions,           // old: freq, new: sessions
    wouldPay, priceRange,
    recommend,
  } = req.body || {};

  if (!rating) return res.status(400).json({ error: "Rating required" });

  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  const industryVal = industry || field;
  const commentVal = comment || extra;
  const improveVal = improve || missing;
  const sessionsVal = sessions || freq;

  const row = (label, value) =>
    value
      ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px;width:160px;vertical-align:top">${label}</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#111;font-size:14px">${value}</td></tr>`
      : "";

  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#fafafa;">
      <div style="background:linear-gradient(135deg,#0F172A,#1E293B);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <h2 style="margin:0;color:#fff;font-size:18px">New Guest Feedback</h2>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px">PM Training App</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin:0 0 14px">Guest Profile</p>
        <table style="width:100%;border-collapse:collapse">
          ${row("Name", name)}
          ${row("Age", age)}
          ${row("Industry", industryVal)}
          ${row("Experience", experience)}
          ${row("Last score", lastScore ? lastScore + "/10" : null)}
        </table>
      </div>
      <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin:0 0 14px">Survey Responses</p>
        <table style="width:100%;border-collapse:collapse">
          ${row("Rating", `${stars} ${rating}/5 — ${labels[rating]}`)}
          ${row("Easy to use?", easyToUse)}
          ${row("Sessions", sessionsVal)}
          ${row("Would pay?", wouldPay)}
          ${row("Price range", priceRange)}
          ${row("Recommend?", recommend)}
        </table>
      </div>
      ${commentVal ? `<div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;"><p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin:0 0 10px">What they thought</p><p style="font-size:15px;color:#111;line-height:1.7;margin:0">${commentVal}</p></div>` : ""}
      ${improveVal ? `<div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;"><p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin:0 0 10px">What would make it better</p><p style="font-size:15px;color:#111;line-height:1.7;margin:0">${improveVal}</p></div>` : ""}
      <p style="color:#ccc;font-size:12px;text-align:center;margin:0">pm-training.vercel.app</p>
    </div>`;

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_EMAIL;

  if (!apiKey || !toEmail) {
    console.log("Feedback received (email not configured):", { name, rating, easyToUse });
    return res.status(200).json({ ok: true });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "PM Training <onboarding@resend.dev>",
        to: [toEmail],
        subject: `${stars} Feedback from ${name || "Guest"} — PM Training`,
        html,
      }),
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
