module.exports = async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ ok: false, error: "Missing Supabase env vars" });
  }

  const endpoint = `${url}/rest/v1/clients`;
  const headers = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
  };

  try {
    if (req.method === "GET") {
      const r = await fetch(`${endpoint}?select=*&order=created_at.desc`, { headers });
      const data = await r.json();

      if (!r.ok) {
        return res.status(r.status).json({
          ok: false,
          error: data.message || "Supabase GET error"
        });
      }

      return res.status(200).json({ ok: true, clients: data });
    }

    if (req.method === "POST") {
      const b = req.body || {};

      const payload = {
        name: b.name || "",
        contact: b.contact || "",
        tariff: b.tariff || "",
        status: b.status || "new",
        request: b.request || "",
        note: b.note || "",
        source: b.source || "site",
        telegram_chat_id: b.telegram_chat_id || null,
        updated_at: new Date().toISOString()
      };

      let existingClient = null;

      if (payload.telegram_chat_id) {
        const findByChatId = await fetch(
          `${endpoint}?telegram_chat_id=eq.${encodeURIComponent(payload.telegram_chat_id)}&select=*&limit=1`,
          { headers }
        );

        const chatData = await findByChatId.json();

        if (findByChatId.ok && chatData.length > 0) {
          existingClient = chatData[0];
        }
      }

      if (!existingClient && payload.contact) {
        const findByContact = await fetch(
          `${endpoint}?contact=eq.${encodeURIComponent(payload.contact)}&select=*&limit=1`,
          { headers }
        );

        const contactData = await findByContact.json();

        if (findByContact.ok && contactData.length > 0) {
          existingClient = contactData[0];
        }
      }

      if (existingClient) {
        const mergedRequest = [
          existingClient.request || "",
          payload.request ? `\n\n--- Нове повідомлення ---\n${payload.request}` : ""
        ].join("").trim();

        const mergedNote = [
          existingClient.note || "",
          payload.tariff ? `\n\nОстанній вибраний тариф: ${payload.tariff}` : ""
        ].join("").trim();

        const updatePayload = {
          name: payload.name || existingClient.name,
          contact: payload.contact || existingClient.contact,
          tariff: payload.tariff || existingClient.tariff,
          status: existingClient.status || "new",
          request: mergedRequest,
          note: mergedNote,
          source: payload.source || existingClient.source,
          telegram_chat_id: payload.telegram_chat_id || existingClient.telegram_chat_id,
          updated_at: new Date().toISOString()
        };

        const update = await fetch(
          `${endpoint}?id=eq.${encodeURIComponent(existingClient.id)}`,
          {
            method: "PATCH",
            headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify(updatePayload)
          }
        );

        const updatedData = await update.json();

        if (!update.ok) {
          return res.status(update.status).json({
            ok: false,
            error: updatedData.message || "Supabase update existing client error"
          });
        }

        return res.status(200).json({
          ok: true,
          client: updatedData[0],
          merged: true
        });
      }

      const create = await fetch(endpoint, {
        method: "POST",
        headers: { ...headers, "Prefer": "return=representation" },
        body: JSON.stringify(payload)
      });

      const createdData = await create.json();

      if (!create.ok) {
        return res.status(create.status).json({
          ok: false,
          error: createdData.message || "Supabase POST error"
        });
      }

      return res.status(200).json({
        ok: true,
        client: createdData[0],
        merged: false
      });
    }

    if (req.method === "PUT") {
      const b = req.body || {};

      if (!b.id) {
        return res.status(400).json({ ok: false, error: "Missing id" });
      }

      const payload = {
        status: b.status,
        request: b.request,
        note: b.note,
        updated_at: new Date().toISOString()
      };

      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const r = await fetch(`${endpoint}?id=eq.${encodeURIComponent(b.id)}`, {
        method: "PATCH",
        headers: { ...headers, "Prefer": "return=representation" },
        body: JSON.stringify(payload)
      });

      const data = await r.json();

      if (!r.ok) {
        return res.status(r.status).json({
          ok: false,
          error: data.message || "Supabase PATCH error"
        });
      }

      return res.status(200).json({ ok: true, client: data[0] });
    }

    if (req.method === "DELETE") {
      const b = req.body || {};

      if (!b.id) {
        return res.status(400).json({ ok: false, error: "Missing id" });
      }

      const r = await fetch(`${endpoint}?id=eq.${encodeURIComponent(b.id)}`, {
        method: "DELETE",
        headers
      });

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));

        return res.status(r.status).json({
          ok: false,
          error: data.message || "Supabase DELETE error"
        });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });

  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
