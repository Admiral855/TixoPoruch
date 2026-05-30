module.exports = async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, error: "Missing Supabase env vars" });

  const endpoint = `${url}/rest/v1/clients`;
  const headers = {"apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json"};

  try {
    if (req.method === "GET") {
      const r = await fetch(`${endpoint}?select=*&order=created_at.desc`, {headers});
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ ok:false, error:data.message || "Supabase GET error" });
      return res.status(200).json({ ok:true, clients:data });
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
        telegram_chat_id: b.telegram_chat_id || null
      };
      const r = await fetch(endpoint, {method:"POST", headers:{...headers, "Prefer":"return=representation"}, body:JSON.stringify(payload)});
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ ok:false, error:data.message || "Supabase POST error" });
      return res.status(200).json({ ok:true, client:data[0] });
    }

    if (req.method === "PUT") {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ ok:false, error:"Missing id" });
      const payload = {status:b.status, request:b.request, note:b.note, updated_at:new Date().toISOString()};
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      const r = await fetch(`${endpoint}?id=eq.${encodeURIComponent(b.id)}`, {method:"PATCH", headers:{...headers, "Prefer":"return=representation"}, body:JSON.stringify(payload)});
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ ok:false, error:data.message || "Supabase PATCH error" });
      return res.status(200).json({ ok:true, client:data[0] });
    }

    if (req.method === "DELETE") {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ ok:false, error:"Missing id" });
      const r = await fetch(`${endpoint}?id=eq.${encodeURIComponent(b.id)}`, {method:"DELETE", headers});
      if (!r.ok) {
        const data = await r.json().catch(()=>({}));
        return res.status(r.status).json({ ok:false, error:data.message || "Supabase DELETE error" });
      }
      return res.status(200).json({ ok:true });
    }

    return res.status(405).json({ ok:false, error:"Method not allowed" });
  } catch(e) {
    return res.status(500).json({ ok:false, error:e.message });
  }
}
