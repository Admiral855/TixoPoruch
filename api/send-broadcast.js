module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method not allowed" });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ ok:false, error:"Missing TELEGRAM_BOT_TOKEN" });

  try {
    const { recipients, text } = req.body || {};

    if (!Array.isArray(recipients) || !recipients.length) {
      return res.status(400).json({ ok:false, error:"Recipients are required" });
    }

    if (!text) {
      return res.status(400).json({ ok:false, error:"Text is required" });
    }

    let sent = 0;
    let failed = 0;

    for (const chatId of [...new Set(recipients)]) {
      const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          chat_id:chatId,
          text:`📢 Повідомлення від ТихоПоруч\n\n${text}`
        })
      });

      const result = await tg.json().catch(() => ({ ok:false }));

      if (result.ok) sent++;
      else failed++;
    }

    return res.status(200).json({ ok:true, sent, failed });
  } catch(e) {
    return res.status(500).json({ ok:false, error:e.message });
  }
}
