module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "Telegram webhook is active" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !adminChatId) {
    return res.status(500).json({ ok: false, error: "Missing Telegram environment variables" });
  }

  const update = req.body || {};
  const message = update.message;

  if (!message || !message.chat) {
    return res.status(200).json({ ok: true });
  }

  const userChatId = message.chat.id;
  const text = message.text || "";
  const firstName = message.from?.first_name || "Користувач";
  const username = message.from?.username ? `@${message.from.username}` : "не вказано";

  async function sendMessage(chatId, text) {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    });

    return response.json();
  }

  if (text === "/start") {
    await sendMessage(
      userChatId,
`Вітаємо в ТихоПоруч 💜

Ми поруч, коли важко всередині.

Щоб ми могли швидше допомогти, напишіть, будь ласка:

1. Ваше імʼя
2. Що вас зараз турбує
3. Який формат підтримки вам зручний:
• Швидкий чат
• Онлайн-консультація в переписці
• Відеоконсультація

Можна писати просто і своїми словами.`
    );

    await sendMessage(
      adminChatId,
`🟣 Новий користувач відкрив бота

👤 Імʼя: ${firstName}
🔗 Username: ${username}
🆔 Chat ID: ${userChatId}`
    );

    return res.status(200).json({ ok: true });
  }

  await sendMessage(
    adminChatId,
`💬 Нове повідомлення в боті ТихоПоруч

👤 Імʼя: ${firstName}
🔗 Username: ${username}
🆔 Chat ID: ${userChatId}

📩 Повідомлення:
${text || "[не текстове повідомлення]"}`
  );

  await sendMessage(
    userChatId,
`Дякуємо 💜

Ми отримали ваше повідомлення.
Найближчим часом відповімо вам або запропонуємо зручний формат підтримки.`
  );

  return res.status(200).json({ ok: true });
