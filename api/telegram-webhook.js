module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok:true, message:"Telegram webhook is active" });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = String(process.env.TELEGRAM_CHAT_ID || "");
  if (!token || !adminChatId) return res.status(500).json({ ok:false, error:"Missing Telegram environment variables" });

  const update = req.body || {};
  const message = update.message;
  const callbackQuery = update.callback_query;

  async function telegram(method, payload){
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
    return r.json();
  }
  async function sendMessage(chatId, text, extra={}){ return telegram("sendMessage", {chat_id:chatId, text, ...extra}); }
  async function saveClient(payload){
    try { await fetch(`https://${req.headers.host}/api/clients`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)}); }
    catch(e){ console.log("CRM save failed:", e.message); }
  }
  function info(user, chat){
    return {
      firstName: user?.first_name || chat?.first_name || "Користувач",
      username: user?.username ? `@${user.username}` : (chat?.username ? `@${chat.username}` : "не вказано"),
      userChatId: chat?.id || user?.id
    };
  }
  function mainKeyboard(){return {inline_keyboard:[
    [{ text:"💬 Швидкий чат — 199 грн", callback_data:"quick_chat" }],
    [{ text:"✍️ Консультація в переписці — 699 грн", callback_data:"text_consult" }],
    [{ text:"📹 Відеоконсультація + переписка — 1499 грн", callback_data:"video_consult" }],
    [{ text:"📝 Залишити повідомлення", callback_data:"leave_message" }]
  ]};}

  if (callbackQuery) {
    const data = callbackQuery.data || "";
    const chat = callbackQuery.message?.chat || {};
    const {firstName, username, userChatId} = info(callbackQuery.from || {}, chat);
    await telegram("answerCallbackQuery", {callback_query_id: callbackQuery.id});

    if (data.startsWith("reply_to_")) {
      const target = data.replace("reply_to_", "");
      await sendMessage(adminChatId, `✍️ Режим відповіді клієнту\n\nСкопіюйте та відправте команду:\n/reply ${target} Ваш текст відповіді`);
      return res.status(200).json({ok:true});
    }

    const formats = {quick_chat:"Швидкий чат — 199 грн", text_consult:"Онлайн-консультація в переписці — 699 грн", video_consult:"Відеоконсультація + переписка — 1499 грн", leave_message:"Залишити повідомлення"};
    const selected = formats[data] || "Невідомий формат";

    await saveClient({name:firstName, contact:username, tariff:selected, request:`Користувач обрав формат: ${selected}`, note:"", source:"telegram", status:"new", telegram_chat_id:String(userChatId)});

    await sendMessage(userChatId, `Ви обрали: ${selected}\n\nНапишіть, будь ласка, що вас турбує, і коли вам зручно поспілкуватися 💜`);
    await sendMessage(adminChatId, `🔘 Користувач обрав формат підтримки\n\n👤 Імʼя: ${firstName}\n🔗 Username: ${username}\n🆔 Chat ID: ${userChatId}\n\n📌 Формат: ${selected}`, {reply_markup:{inline_keyboard:[[{text:"✉️ Відповісти клієнту", callback_data:`reply_to_${userChatId}`}]]}});
    return res.status(200).json({ok:true});
  }

  if (!message || !message.chat) return res.status(200).json({ok:true});
  const chat = message.chat, from = message.from || {};
  const userChatId = chat.id, text = message.text || "";
  const {firstName, username} = info(from, chat);

  if (String(userChatId) === adminChatId && text.startsWith("/reply ")) {
    const parts = text.split(" "), target = parts[1], replyText = parts.slice(2).join(" ").trim();
    if (!target || !replyText) { await sendMessage(adminChatId, "Невірний формат. Використовуйте: /reply CHAT_ID текст відповіді"); return res.status(200).json({ok:true}); }
    const result = await sendMessage(target, `Повідомлення від ТихоПоруч 💜\n\n${replyText}`);
    await sendMessage(adminChatId, result.ok ? "✅ Відповідь клієнту відправлено." : `❌ Помилка: ${result.description || "невідома"}`);
    return res.status(200).json({ok:true});
  }

  if (text === "/start") {
    await sendMessage(userChatId, "Вітаємо в ТихоПоруч 💜\n\nМи поруч, коли важко всередині.\n\nОберіть, що вам потрібно:", {reply_markup:mainKeyboard()});
    await sendMessage(adminChatId, `🟣 Новий користувач відкрив бота\n\n👤 Імʼя: ${firstName}\n🔗 Username: ${username}\n🆔 Chat ID: ${userChatId}`, {reply_markup:{inline_keyboard:[[{text:"✉️ Відповісти клієнту", callback_data:`reply_to_${userChatId}`}]]}});
    return res.status(200).json({ok:true});
  }

  if (text === "/consultation") { await sendMessage(userChatId, "Оберіть формат консультації:", {reply_markup:mainKeyboard()}); return res.status(200).json({ok:true}); }
  if (text === "/help") { await sendMessage(userChatId, "/start — меню\n/consultation — обрати консультацію"); return res.status(200).json({ok:true}); }

  await saveClient({name:firstName, contact:username, tariff:"Повідомлення в боті", request:text || "[не текстове повідомлення]", note:"", source:"telegram", status:"new", telegram_chat_id:String(userChatId)});
  await sendMessage(adminChatId, `💬 Нове повідомлення в боті ТихоПоруч\n\n👤 Імʼя: ${firstName}\n🔗 Username: ${username}\n🆔 Chat ID: ${userChatId}\n\n📩 Повідомлення:\n${text || "[не текстове повідомлення]"}`, {reply_markup:{inline_keyboard:[[{text:"✉️ Відповісти клієнту", callback_data:`reply_to_${userChatId}`}]]}});
  await sendMessage(userChatId, "Дякуємо 💜\n\nМи отримали ваше повідомлення. Найближчим часом відповімо.");
  return res.status(200).json({ok:true});
}
