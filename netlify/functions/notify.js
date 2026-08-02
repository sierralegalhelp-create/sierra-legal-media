// Emails either Sierra or a specific client when something happens.
// Standalone — only built-in fetch, no npm deps, so it bundles cleanly.
// If the Resend key or recipient is missing, it logs and returns success
// so nothing in the app ever breaks.

function content(event, firmName) {
  switch (event) {
    // ── To Sierra ──
    case "new_message":
      return { subject: `New message from ${firmName}`,
               line: `${firmName} sent you a new message. Open Legal Media to reply.` };
    case "post_approved":
      return { subject: `${firmName} approved a post`,
               line: `${firmName} approved a post. It's set to go out as scheduled.` };
    case "changes_requested":
      return { subject: `${firmName} asked for a change`,
               line: `${firmName} asked for a change on a post. Open Legal Media to see their note.` };
    case "brief_submitted":
      return { subject: `${firmName} sent this month's brief`,
               line: `${firmName} submitted this month's brief. Open Legal Media to read it.` };
    case "new_client":
      return { subject: `New client signed up: ${firmName}`,
               line: `${firmName} just signed up. They're now in your Clients list.` };

    // ── To the client ──
    case "post_ready":
      return { subject: `A new post is ready for your approval`,
               line: `Sierra has a new post ready for you to review. Open Legal Media to approve it or ask for changes.` };
    case "message_from_sierra":
      return { subject: `New message from Sierra`,
               line: `Sierra sent you a message. Open Legal Media to read and reply.` };
    case "account_approved":
      return { subject: `You're all set — welcome!`,
               line: `Sierra has set up your account. You can sign in now and see your calendar.` };
    case "brief_reminder":
      return { subject: `A quick reminder: this month's brief`,
               line: `When you have a moment, open Legal Media and tell Sierra what you'd like this month.` };

    default:
      return { subject: `Update from Legal Media`, line: `Something new is waiting in Legal Media.` };
  }
}

function html(line) {
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
    const { event: type, firmName, to, clientEmail } = JSON.parse(event.body || "{}");
    const firm = firmName || "A client";

    const key  = process.env.RESEND_API_KEY;
    const from = process.env.NOTIFY_FROM || "onboarding@resend.dev";

    // Pick the recipient: client events go to the client's address,
    // everything else goes to Sierra.
    const recipient = to === "client" ? clientEmail : process.env.SIERRA_EMAIL;

    const { subject, line } = content(type, firm);

    if (!key || !recipient) {
      console.log("[notify - skipped: missing key or recipient]", type, recipient || "(no address)");
      return { statusCode: 200, body: JSON.stringify({ sent: false, reason: "not configured" }) };
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Legal Media <${from}>`,
        to: [recipient],
        subject,
        html: html(line),
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
