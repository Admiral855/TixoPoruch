module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "Telegram webhook is active" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = String(process.env.TELEGRAM_CHAT_ID || "");

  if (!token || !adminChatId) {
    return res.status(500).json({ ok: false, error: "Missing Telegram environment variables" });
  }

  const update = req.body || {};
  const message = update.message;
  const callbackQuery = update.callback_query;

  async function telegram(method, payload) {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  async function sendMessage(chatId, text, extra = {}) {
    return telegram("sendMessage", {
      chat_id: chatId,
      text,
      ...extra
    });
  }

  async function answerCallbackQuery(callbackQueryId, text = "") {
    return telegram("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text
    });
  }

  function userInfo(user, chat) {
    const firstName = user?.first_name || chat?.first_name || "Користувач";
    const username = user?.username ? `@${user.username}` : (chat?.username ? `@${chat.username}` : "не вказано");
    const userChatId = chat?.id || user?.id;
    return { firstName, username, userChatId };
  }

  function mainKeyboard() {
    return {
      inline_keyboard: [
        [{ text: "💬 Швидкий чат — 199 грн", callback_data: "quick_chat" }],
        [{ text: "✍️ Консультація в переписці — 699 грн", callback_data: "text_consult" }],
        [{ text: "📹 Відеоконсультація + переписка — 1499 грн", callback_data: "video_consult" }],
        [{ text: "📝 Залишити повідомлення", callback_data: "leave_message" }]
      ]
    };
  }

  if (callbackQuery) {
    const data = callbackQuery.data || "";
    const user = callbackQuery.from || {};
    const chat = callbackQuery.message?.chat || {};
    const { firstName, username, userChatId } = userInfo(user, chat);

    await answerCallbackQuery(callbackQuery.id);

    if (data.startsWith("reply_to_")) {
      const targetChatId = data.replace("reply_to_", "");

      await sendMessage(
        adminChatId,
`✍️ Режим відповіді клієнту

Скопіюйте та відправте наступну команду разом з текстом відповіді:

/reply ${targetChatId} Ваш текст відповіді

Приклад:
/reply ${targetChatId} Доброго дня 💜 Можемо провести консультацію сьогодні о 18:00.`
      );

      return res.status(200).json({ ok: true });
    }

    const formats = {
      quick_chat: "Швидкий чат — 199 грн",
      text_consult: "Онлайн-консультація в переписці — 699 грн",
      video_consult: "Відеоконсультація + переписка — 1499 грн",
      leave_message: "Залишити повідомлення"
    };

    const selected = formats[data] || "Невідомий формат";

    if (data === "leave_message") {
      await sendMessage(
        userChatId,
`Напишіть, будь ласка, одним повідомленням:

1. Ваше імʼя
2. Що вас зараз турбує
3. Коли вам зручно отримати відповідь

Можна писати просто і своїми словами 💜`
      );
    } else {
      await sendMessage(
        userChatId,
`Ви обрали: ${selected}

Щоб ми могли швидше допомогти, напишіть, будь ласка:

1. Ваше імʼя
2. Що вас зараз турбує
3. Коли вам зручно поспілкуватися

Ми отримаємо ваше повідомлення і звʼяжемося з вами 💜`
      );
    }

    await sendMessage(
      adminChatId,
`🔘 Користувач обрав формат підтримки

👤 Імʼя: ${firstName}
🔗 Username: ${username}
🆔 Chat ID: ${userChatId}

📌 Формат: ${selected}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✉️ Відповісти клієнту", callback_data: `reply_to_${userChatId}` }]
          ]
        }
      }
    );

    return res.status(200).json({ ok: true });
  }

  if (!message || !message.chat) {
    return res.status(200).json({ ok: true });
  }

  const chat = message.chat;
  const from = message.from || {};
  const userChatId = chat.id;
  const text = message.text || "";
  const { firstName, username } = userInfo(from, chat);

  // Admin reply command: /reply CHAT_ID text
  if (String(userChatId) === adminChatId && text.startsWith("/reply ")) {
    const parts = text.split(" ");
    const targetChatId = parts[1];
    const replyText = parts.slice(2).join(" ").trim();

    if (!targetChatId || !replyText) {
      await sendMessage(
        adminChatId,
`Невірний формат команди.

Використовуйте:
/reply CHAT_ID текст відповіді

Приклад:
/reply 123456789 Доброго дня 💜 Можемо поспілкуватися о 18:00.`
      );
      return res.status(200).json({ ok: true });
    }

    const result = await sendMessage(
      targetChatId,
`Повідомлення від ТихоПоруч 💜

${replyText}`
    );

    if (result.ok) {
      await sendMessage(adminChatId, "✅ Відповідь клієнту відправлено.");
    } else {
      await sendMessage(adminChatId, `❌ Не вдалося відправити відповідь: ${result.description || "невідома помилка"}`);
    }

    return res.status(200).json({ ok: true });
  }

  if (text === "/start") {
    await sendMessage(
      userChatId,
`Вітаємо в ТихоПоруч 💜

Ми поруч, коли важко всередині.

Оберіть, що вам потрібно:`,
      {
        reply_markup: mainKeyboard()
      }
    );

    await sendMessage(
      adminChatId,
`🟣 Новий користувач відкрив бота

👤 Імʼя: ${firstName}
🔗 Username: ${username}
🆔 Chat ID: ${userChatId}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✉️ Відповісти клієнту", callback_data: `reply_to_${userChatId}` }]
          ]
        }
      }
    );

    return res.status(200).json({ ok: true });
  }

  if (text === "/help") {
    await sendMessage(
      userChatId,
`Команди ТихоПоруч:

/start — відкрити меню підтримки
/help — допомога
/consultation — обрати формат консультації`
    );
    return res.status(200).json({ ok: true });
  }

  if (text === "/consultation") {
    await sendMessage(
      userChatId,
`Оберіть формат консультації:`,
      {
        reply_markup: mainKeyboard()
      }
    );
    return res.status(200).json({ ok: true });
  }

  // Regular user message forwarded to admin with reply button
  await sendMessage(
    adminChatId,
`💬 Нове повідомлення в боті ТихоПоруч

👤 Імʼя: ${firstName}
🔗 Username: ${username}
🆔 Chat ID: ${userChatId}

📩 Повідомлення:
${text || "[не текстове повідомлення]"}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✉️ Відповісти клієнту", callback_data: `reply_to_${userChatId}` }]
        ]
      }
    }
  );

  await sendMessage(
    userChatId,
`Дякуємо 💜

Ми отримали ваше повідомлення.
Найближчим часом відповімо вам або запропонуємо зручний формат підтримки.`
  );

  return res.status(200).json({ ok: true });
}
