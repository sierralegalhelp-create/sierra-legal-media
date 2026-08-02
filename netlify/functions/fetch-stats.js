import { getDb } from "./_firebase-admin.js";

// ─────────────────────────────────────────────────────────────
// Runs nightly (see the schedule at the bottom). For each client,
// pulls the last 30 days of metrics per connected platform and
// writes one document at clients/{uid}/stats/{yyyy-mm}.
//
// Meta Graph API and LinkedIn both require app review that takes
// weeks. Until you have tokens, this writes clearly-labeled sample
// data so the Stats screen is testable. The moment a client has a
// real token stored, it uses the live API for that platform.
// ─────────────────────────────────────────────────────────────

function yyyymm(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Instagram / Facebook via Meta Graph API ──────────────────
async function fetchMeta(token, igUserId) {
  // https://developers.facebook.com/docs/instagram-api/guides/insights
  const metrics = "reach,impressions,profile_views,follower_count";
  const url =
    `https://graph.facebook.com/v20.0/${igUserId}/insights` +
    `?metric=${metrics}&period=day&access_token=${token}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`Meta API ${r.status}`);
  const json = await r.json();

  const series = {};
  for (const m of json.data ?? []) {
    series[m.name] = (m.values ?? []).map((v) => ({
      date: v.end_time?.slice(0, 10),
      value: v.value,
    }));
  }
  return series;
}

// ── LinkedIn via Marketing API ───────────────────────────────
async function fetchLinkedIn(token, orgId) {
  // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/share-statistics
  const url =
    `https://api.linkedin.com/rest/organizationalEntityShareStatistics` +
    `?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}`;

  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": "202405",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  if (!r.ok) throw new Error(`LinkedIn API ${r.status}`);
  const json = await r.json();

  const el = json.elements?.[0]?.totalShareStatistics ?? {};
  return {
    impressions: el.impressionCount ?? 0,
    clicks: el.clickCount ?? 0,
    likes: el.likeCount ?? 0,
    shares: el.shareCount ?? 0,
    engagement: el.engagement ?? 0,
  };
}

// ── Sample data, clearly flagged, until tokens exist ─────────
function sampleFor(platform, seed) {
  const rng = (n, spread) => Math.round(n + (Math.sin(seed * 9301 + n) * spread));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });

  const base = { instagram: 1200, facebook: 800, linkedin: 450, tiktok: 2100 }[platform] ?? 600;

  return {
    sample: true,
    followers: rng(base * 3, 40),
    reach: days.map((date, i) => ({ date, value: Math.max(0, rng(base + i * 8, 180)) })),
    engagement: days.map((date, i) => ({ date, value: Math.max(0, rng(base * 0.06 + i, 22)) })),
    totals: {
      reach: rng(base * 22, 900),
      engagement: rng(base * 1.4, 120),
      newFollowers: rng(38, 14),
    },
  };
}

async function statsForClient(db, client) {
  const uid = client.id;
  const platforms = client.platforms ?? [];

  // Tokens live in a subcollection the browser can't read. Fetch them
  // server-side only.
  const secretSnap = await db
    .collection("clients").doc(uid)
    .collection("secrets").doc("apiTokens").get();
  const tokens = secretSnap.exists ? secretSnap.data() : {};

  const perPlatform = {};

  for (const platform of platforms) {
    try {
      if (platform === "instagram" && tokens.instagram?.token) {
        perPlatform.instagram = await fetchMeta(
          tokens.instagram.token,
          tokens.instagram.igUserId,
        );
      } else if (platform === "linkedin" && tokens.linkedin?.token) {
        perPlatform.linkedin = await fetchLinkedIn(
          tokens.linkedin.token,
          tokens.linkedin.orgId,
        );
      } else {
        // No token yet → labeled sample so the UI has something real-shaped.
        perPlatform[platform] = sampleFor(platform, uid.charCodeAt(0) + platform.length);
      }
    } catch (err) {
      console.error(`stats ${platform} for ${uid}`, err.message);
      perPlatform[platform] = { error: true };
    }
  }

  await db
    .collection("clients").doc(uid)
    .collection("stats").doc(yyyymm())
    .set(
      { platforms: perPlatform, updatedAt: new Date().toISOString() },
      { merge: true },
    );
}

export async function handler() {
  try {
    const db = getDb();
    const clients = await db.collection("clients").get();

    await Promise.all(
      clients.docs.map((d) => statsForClient(db, { id: d.id, ...d.data() })),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ updated: clients.size }),
    };
  } catch (err) {
    console.error("fetch-stats failed", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Stats run failed" }) };
  }
}

// Netlify scheduled function — runs at 6am UTC daily.
export const config = { schedule: "0 6 * * *" };
