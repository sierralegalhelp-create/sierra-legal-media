# Sierra Roberts Legal Media

A monthly social-media system for law firms. Sierra drafts posts, clients
approve them, clients send a monthly brief, and everyone talks in one thread.

There is **one thing you must do** before it works: set up Firebase (free).
Everything else is already built. Plan on **30-45 minutes**.

---

## What each side does

**The client**
- Sees this month's calendar, colored by content type
- Approves posts (or asks for changes) - sees a real preview of each one first
- Fills in a **monthly brief**: posts they want, content-type leanings, day
  preferences, big dates, and a note to Sierra
- Sees which plan they're on (they can't change it - Sierra sets it)
- Sees their results per platform
- Messages Sierra

**Sierra (admin)**
- One **Clients** list showing every firm and their plan at a glance
- Picks each client from a dropdown and sees just their calendar
- Writes posts, uploads images, sends them for approval - with a live preview
- Reads each client's monthly brief
- Sets each client's plan
- Same results and messages, per client

The whole thing runs on one email address: whatever you put in
VITE_ADMIN_EMAIL is Sierra. Everyone else is a client.

---

## Setup - the one required part: Firebase

1. Go to https://console.firebase.google.com and create a project.
2. Build -> Authentication -> Get started. Enable Email/Password and Google.
3. Build -> Firestore Database -> Create database. Start in production mode.
5. Project settings -> General -> Your apps -> click the web icon </>.
   Register the app, then copy the config values into a file called .env
   (copy .env.example and fill it in).
6. Set Sierra's real email in TWO places, and they must match EXACTLY:
   - .env -> VITE_ADMIN_EMAIL
   - firestore.rules -> line ~12, inside adminEmail()

Then publish the rules and indexes (one-time):

    npm i -g firebase-tools
    firebase login
    firebase deploy --only firestore:rules,firestore:indexes

> The rules are what actually keep one client's data private from another.
> Don't skip this step.

Post images use image links (paste a URL) — no Firebase Storage or paid
plan needed. If you later want direct photo uploads, enable Storage (it
requires the Blaze pay-as-you-go plan, usually free at this scale).

Change the email to Sierra's. She should sign in with Google (or a verified
email), because admin access requires a verified email.

---

## Running it

    cp .env.example .env     # then fill in your Firebase values
    npm install
    npm run dev              # opens on localhost

To put it online (free): push to GitHub, connect the repo at netlify.com, and
add every VITE_* value from your .env under Site settings -> Environment
variables. Netlify builds and hosts it.

---

## Plans and billing

Sierra sets each client's plan herself, on the client's tab - based on what
they agreed when they talked. The client sees the plan but can't change it.
No payment system is required to launch. How the client actually pays
(invoice, card, etc.) is handled however Sierra already does it.

If you later want automatic card billing, the Stripe version is preserved in
netlify/functions-optional-stripe/. Moving those three files back into
netlify/functions/ and filling in the Stripe env vars turns it on.

---

## Results / stats

The Results tab shows reach, engagement, and followers per platform.

Real numbers require access from Instagram/Facebook (Meta) and LinkedIn, which
means registering an app with each and getting approved - Meta's review takes
a few weeks, and it's a form only you can submit (it needs Sierra's business
details). Until then, the Results tab shows clearly-labeled sample numbers so
the screen works. Nothing is broken; it's waiting on Meta.

When ready: start Meta's app review early, store each client's tokens in
clients/{uid}/secrets/apiTokens (a place the browser can't read), and the
nightly function uses them automatically.

---

## How the data is shaped

    clients/{uid}
      firmName, email, platforms[]
      subscription: { tier }              <- Sierra sets tier

      posts/{postId}
        contentType, platforms[], caption, mediaUrl
        scheduledFor, status, clientNote

      briefs/{yyyy-mm}                     <- the monthly brief
        wantPosts[], typePrefs{}, dayPref, bigDates, note

      messages/{msgId}
        text, fromAdmin, authorName, sentAt, readByClient, readByAdmin

      stats/{yyyy-mm}                      <- written by the nightly function
      secrets/apiTokens                    <- platform tokens, server-only

Each client's data lives under their own uid. The rules make sure a client can
only ever read and write their own - never another firm's.

---

## Still to come (not built)

- Auto-publishing approved posts (needs the same Meta/LinkedIn access as stats)
- Email alerts when a post needs approval or a brief comes in
- Drag-to-reschedule on the calendar (the logic is ready in data.js)
- Keeping past months' briefs visible to look back on
