import Stripe from "stripe";
import { requireUser, fail } from "./_auth.js";
import { getDb } from "./_firebase-admin.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth:  process.env.STRIPE_PRICE_GROWTH,
  firm:    process.env.STRIPE_PRICE_FIRM,
};

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    // uid comes from the verified token, never from the body.
    const { uid, email } = await requireUser(event);

    const { tier } = JSON.parse(event.body || "{}");
    const price = PRICES[tier];
    if (!price) {
      return { statusCode: 400, body: JSON.stringify({ error: "Unknown plan" }) };
    }

    // Reuse the Stripe customer if they've paid before, so upgrades
    // don't fragment their billing history.
    const snap = await getDb().collection("clients").doc(uid).get();
    const existingCustomer = snap.data()?.subscription?.stripeCustomerId ?? null;

    const site = process.env.SITE_URL;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(existingCustomer
        ? { customer: existingCustomer }
        : { customer_email: email }),
      line_items: [{ price, quantity: 1 }],
      client_reference_id: uid,
      subscription_data: { metadata: { uid, tier } },
      metadata: { uid, tier },
      success_url: `${site}/?checkout=done`,
      cancel_url:  `${site}/?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    if (!err.statusCode) console.error("create-checkout failed", err);
    return fail(err);
  }
}
