import Stripe from "stripe";
import { requireUser, fail } from "./_auth.js";
import { getDb } from "./_firebase-admin.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { uid } = await requireUser(event);

    const snap = await getDb().collection("clients").doc(uid).get();
    const customerId = snap.data()?.subscription?.stripeCustomerId;

    if (!customerId) {
      return { statusCode: 400, body: JSON.stringify({ error: "No billing account yet" }) };
    }

    // Cancel, change plan, update card, download invoices — all live here.
    // Configure once at dashboard.stripe.com/settings/billing/portal
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.SITE_URL,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    if (!err.statusCode) console.error("create-portal failed", err);
    return fail(err);
  }
}
