import Stripe from "stripe";
import { getDb } from "./_firebase-admin.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map a Stripe price back to our tier name.
const TIER_BY_PRICE = {
  [process.env.STRIPE_PRICE_STARTER]: "starter",
  [process.env.STRIPE_PRICE_GROWTH]:  "growth",
  [process.env.STRIPE_PRICE_FIRM]:    "firm",
};

async function writeSub(uid, patch) {
  if (!uid) return;
  const db = getDb();
  await db.collection("clients").doc(uid).set(
    { subscription: patch },
    { merge: true },
  );
}

// Portal-initiated changes may not carry our metadata, so fall back to
// finding the client by the Stripe customer id we stored at checkout.
async function uidOf(subscription) {
  if (subscription.metadata?.uid) return subscription.metadata.uid;

  const db = getDb();
  const hit = await db
    .collection("clients")
    .where("subscription.stripeCustomerId", "==", subscription.customer)
    .limit(1)
    .get();

  if (hit.empty) {
    console.error("No client for Stripe customer", subscription.customer);
    return null;
  }
  return hit.docs[0].id;
}

function tierOf(subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  return TIER_BY_PRICE[priceId] ?? "starter";
}

export async function handler(event) {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  // Without this check anyone could POST themselves a free subscription.
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Bad webhook signature", err.message);
    return { statusCode: 400, body: "Invalid signature" };
  }

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        const uid = session.client_reference_id ?? session.metadata?.uid;

        const sub = await stripe.subscriptions.retrieve(session.subscription);

        await writeSub(uid, {
          tier: tierOf(sub),
          status: sub.status,                 // active | trialing
          stripeCustomerId: session.customer,
          stripeSubscriptionId: sub.id,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodEnd: sub.current_period_end,
        });
        break;
      }

      // Plan switch, cancellation scheduled, renewal, reactivation.
      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object;
        await writeSub(await uidOf(sub), {
          tier: tierOf(sub),
          status: sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodEnd: sub.current_period_end,
        });
        break;
      }

      // The period they paid for has ended.
      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object;
        await writeSub(await uidOf(sub), {
          status: "canceled",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: sub.current_period_end,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = stripeEvent.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await writeSub(await uidOf(sub), { status: sub.status }); // past_due | unpaid
        }
        break;
      }

      default:
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    // Non-200 makes Stripe retry, which is what we want on a transient failure.
    console.error("Webhook handler failed", stripeEvent.type, err);
    return { statusCode: 500, body: "Handler error" };
  }
}
