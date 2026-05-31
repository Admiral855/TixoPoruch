module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" });
  }

  try {
    const { telegram_chat_id, amount } = req.body || {};

    if (!telegram_chat_id) {
      return res.status(400).json({ ok: false, error: "Missing telegram_chat_id" });
    }

    if (!amount) {
      return res.status(400).json({ ok: false, error: "Missing amount" });
    }

    const message =
`💳 Оплата

Сума:
${amount} грн

Отримувач:
Ніколаєнко Богдан Геннадійович

IBAN:
UA133005280000000262003520170

Призначення платежу:
Оплата за товар

Після оплати надішліть квитанцію у цей чат.`;

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegram_chat_id,
        text: message
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
