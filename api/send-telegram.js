export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return res.status(500).json({ ok: false, error: "Telegram env vars are missing" });

  try {
    const { name, contact, tariff, message, page } = req.body || {};
    if (!name || !contact) return res.status(400).json({ ok: false, error: "Name and contact are required" });

    const text = `🔔 Нова заявка з сайту ТихоПоруч

👤 Ім'я: ${name}
📲 Контакт: ${contact}
💳 Тариф: ${tariff || "Не вказано"}

💬 Повідомлення:
${message || "Без повідомлення"}

🌐 Сторінка: ${page || "Невідомо"}
🕒 Час: ${new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })}`;

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    const result = await tg.json();
    if (!result.ok) return res.status(500).json({ ok: false, error: result.description || "Telegram error" });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
