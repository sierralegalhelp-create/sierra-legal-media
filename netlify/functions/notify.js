function subjectFor(event, firmName) {
  switch (event) {
    case "new_message":       return `New message from ${firmName}`;
    case "post_approved":     return `${firmName} approved a post`;
    case "changes_requested": return `${firmName} asked for a change`;
    case "brief_submitted":   return `${firmName} sent this month's brief`;
    case "new_client":        return `New client signed up: ${firmName}`;
    default:                  return `Update from ${firmName}`;
  }
}

function bodyFor(event, firmName) {
  const line = {
    new_message:       `${firmName} sent you a new message. Open Legal Media to reply.`,
    post_approved:     `${firmName} approved a post. It's set to go out as scheduled.`,
    changes_requested: `${firmName} asked for a change on a post. Open Legal Media to see their note.`,
    brief_submitted:   `${firmName} submitted this month's brief. Open Legal Media to read it.`,
    new_client:        `${firmName} just signed up. They're now in your Clients list.`,
  }[event] || `Something happened with ${firmName} in Legal Media.`;

  return `<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#1C1A17">
    <p>${line}</p>
    <p style="color:#6E665C;font-size:13px;margin-top:24px">-- Sierra Roberts Legal Media</p>
  </div>`;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { event: type, firmName } = JSON.parse(event.body || "{}");
    const firm = firmName || "A client";
    const subject = subjectFor(type, firm);

    const key  = process.env.RESEND_API_KEY;
    const to   = process.env.SIERRA_EMAIL;
    const from = process.env.NOTIFY_FROM || "onboarding@resend.dev";

    if (!key || !to) {
      console.log("[notify - email not set up yet]", subject);
      return { statusCode: 200, body: JSON.stringify({ sent: false, reason: "not configured" }) };
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Legal Media <${from}>`,
        to: [to],
        subject,
        html: bodyFor(type, firm),
      }),
    });

    if (!r.ok) {
      console.error("Resend error", r.status, await r.text());
      return { statusCode: 200, body: JSON.stringify({ sent: false }) };
    }
    return { statusCode: 200, body: JSON.stringify({ sent: true }) };
  } catch (err) {
    console.error("notify failed", err);
    return { statusCode: 200, body: JSON.stringify({ sent: false }) };
  }
}
