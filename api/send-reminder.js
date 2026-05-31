module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" });
  }

  try {
    const { telegram_chat_id, type } = req.body || {};

    if (!telegram_chat_id) {
      return res.status(400).json({ ok: false, error: "Missing telegram_chat_id" });
    }

    const paymentMessage =
`🔔 Нагадування про оплату

Будь ласка, оплатіть консультацію за реквізитами, які ми надіслали раніше.

Після оплати надішліть квитанцію у цей чат.`;

    const consultationMessage =
`🔔 Нагадування про консультацію

Нагадуємо про заплановану консультацію.

Якщо час потрібно змінити — напишіть нам у цей чат.`;

    const text = type === "payment" ? paymentMessage : consultationMessage;

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegram_chat_id,
        text
      })
    });

    const result = await tg.json();

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: result.description || "Telegram sendMessage error"
      });
    }

    return res.status(200).json({ ok: true, result });

  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
