# Deploy Handoff — Sierra Roberts Legal Media

Everything is built. The app is a Vite + React SPA with a Firebase
(Firestore + Auth) backend. Firestore rules and the client's config are
already in place. **All that's left is deploying to Netlify.** Should take
~15 minutes.

## What's already done
- Code is on GitHub: github.com/sierra5783/sierra-legal-media
- Firebase project `sierra-legal-media` exists; Auth (Email/Password +
  Google) is on; Firestore database created; security rules published.
- Firestore rules and indexes are in the repo (`firestore.rules`,
  `firestore.indexes.json`) and already deployed via the console.
- `netlify.toml` is configured (build command, publish dir, functions dir,
  SPA redirect).

## What you need to do

### 1. Deploy to Netlify
- Connect the GitHub repo `sierra5783/sierra-legal-media` to a new Netlify site.
- Build settings come from `netlify.toml`:
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Functions directory: `netlify/functions`

### 2. Set environment variables in Netlify
(Site settings → Environment variables.) These are the client's real
Firebase values — copy from the `.env` in this note's sibling, or from the
values below:

    VITE_FIREBASE_API_KEY=AIzaSyAcfmApV6s4vLDYdwZCRLJxzu5e-RzR9aM
    VITE_FIREBASE_AUTH_DOMAIN=sierra-legal-media.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=sierra-legal-media
    VITE_FIREBASE_STORAGE_BUCKET=sierra-legal-media.firebasestorage.app
    VITE_FIREBASE_MESSAGING_SENDER_ID=123112111767
    VITE_FIREBASE_APP_ID=1:123112111767:web:798c95dcfe2aff3baef3d2
    VITE_ADMIN_EMAIL=sierra.legalhelp@gmail.com

### 3. Add the deployed domain to Firebase Auth
Firebase console → Authentication → Settings → Authorized domains → add the
Netlify domain (e.g. `sierra-legal-media.netlify.app`), or Google/email
sign-in will be rejected on the live site.

### 4. (Optional, later) Email notifications
`netlify/functions/notify.js` sends email via Resend. Not required to launch.
To enable: set `RESEND_API_KEY`, `SIERRA_EMAIL`, `NOTIFY_FROM` in Netlify env.

### 5. (Optional, later) Nightly stats function
`netlify/functions/fetch-stats.js` needs the Firebase Admin SDK env vars
(`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) and,
for real numbers, Meta/LinkedIn tokens. Shows sample data until then.

### Notes
- No Stripe needed. The admin (Sierra) sets each client's plan manually.
- Firebase Storage is intentionally NOT used — post images are pasted as
  URLs, so no Blaze/billing upgrade is required.
- Admin = whoever signs in with VITE_ADMIN_EMAIL. Everyone else is a client.

That's it. Connect repo, set env vars, add the auth domain, done.
