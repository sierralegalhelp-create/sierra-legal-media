import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, onSnapshot, query, where, orderBy,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db, ADMIN_EMAIL } from "./firebase";
import { STATUS, CLIENT_VISIBLE } from "./constants";

// ── Users ────────────────────────────────────────────────────

export function isAdmin(user) {
  return Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL?.toLowerCase());
}

// Account lifecycle:
//   onboarding -> client must fill the signup form
//   pending    -> form submitted, waiting on Sierra's approval
//   active     -> Sierra approved; full access
//   (Sierra can also set 'paused')

// Called once on first sign-in. Creates the client record if absent.
export async function ensureClientDoc(user) {
  if (isAdmin(user)) return null;

  const clientRef = doc(db, "clients", user.uid);
  const snap = await getDoc(clientRef);

  if (!snap.exists()) {
    await setDoc(clientRef, {
      uid: user.uid,
      email: user.email,
      firmName: "",
      platforms: [],
      goal: "",
      phone: "",
      notes: "",
      accountState: "onboarding",
      requestedTier: "basic",
      createdAt: serverTimestamp(),
      subscription: {
        tier: "basic",
        status: "inactive",
        stripeCustomerId: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    });
    return (await getDoc(clientRef)).data();
  }
  return snap.data();
}

// Client submits the signup form -> goes to pending.
export async function submitSignup(uid, info) {
  await updateDoc(doc(db, "clients", uid), {
    ...info,
    accountState: "pending",
    submittedAt: serverTimestamp(),
  });
  notifySierra("new_client", info.firmName || "A new firm");
}

// Sierra approves -> client gets full access.
export async function approveClient(uid, tier) {
  const snap = await getDoc(doc(db, "clients", uid));
  const c = snap.data() || {};
  await updateDoc(doc(db, "clients", uid), {
    accountState: "active",
    "subscription.tier": tier,
    "subscription.status": "active",
    approvedAt: serverTimestamp(),
  });
  if (c.email) notifyClient("account_approved", c.firmName || "your firm", c.email);
}

// Client editing their own settings. The rules restrict which fields
// they can touch — never accountState or subscription.
export async function updateMyProfile(uid, patch) {
  await updateDoc(doc(db, "clients", uid), patch);
}

export function watchClient(uid, cb) {
  return onSnapshot(doc(db, "clients", uid), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function watchAllClients(cb) {
  const q = query(collection(db, "clients"), orderBy("firmName"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function updateClient(uid, patch) {
  await updateDoc(doc(db, "clients", uid), patch);
}

// ── Posts ────────────────────────────────────────────────────

function postsCol(clientUid) {
  return collection(db, "clients", clientUid, "posts");
}

// Live posts for one month. `forClient` hides drafts.
export function watchPosts(clientUid, year, month, forClient, cb) {
  const start = Timestamp.fromDate(new Date(year, month, 1, 0, 0, 0));
  const end   = Timestamp.fromDate(new Date(year, month + 1, 1, 0, 0, 0));

  // Two different query shapes, on purpose:
  //
  // - Admin (Sierra) reads the whole month by date range. She's allowed
  //   every status, so a plain range query is fine.
  //
  // - Client must never READ a draft (the rule blocks it, and a query
  //   that would return one fails entirely). So the client filters by
  //   status instead — an "in" filter that uses Firestore's automatic
  //   single-field index, needing NO composite index to be deployed —
  //   then narrows to the month in JS below. This keeps the client
  //   calendar working even before any custom index exists.
  const q = forClient
    ? query(postsCol(clientUid), where("status", "in", CLIENT_VISIBLE))
    : query(
        postsCol(clientUid),
        where("scheduledFor", ">=", start),
        where("scheduledFor", "<", end),
        orderBy("scheduledFor"),
      );

  return onSnapshot(
    q,
    (snap) => {
      let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (forClient) {
        // Narrow to this month and sort here, since the query didn't.
        rows = rows
          .filter((p) => {
            const t = p.scheduledFor?.toMillis?.() ?? 0;
            return t >= start.toMillis() && t < end.toMillis();
          })
          .sort((a, b) => (a.scheduledFor?.toMillis?.() ?? 0) - (b.scheduledFor?.toMillis?.() ?? 0));
      }
      cb(rows);
    },
    (err) => {
      console.error("Calendar listener failed", err);
      cb([]);
    },
  );
}

// Everything awaiting approval, across all months.
export function watchPendingPosts(clientUid, cb) {
  // Single-field filter (auto-indexed), sorted in JS — so this needs no
  // composite index deployed. Feeds the client's "To approve" list.
  const q = query(
    postsCol(clientUid),
    where("status", "==", STATUS.pending_approval),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.scheduledFor?.toMillis?.() ?? 0) - (b.scheduledFor?.toMillis?.() ?? 0));
      cb(rows);
    },
    (err) => { console.error("Pending listener failed", err); cb([]); },
  );
}

export async function createPost(clientUid, post) {
  return addDoc(postsCol(clientUid), {
    ...post,
    status: post.status || STATUS.draft,
    clientNote: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePost(clientUid, postId, patch) {
  await updateDoc(doc(db, "clients", clientUid, "posts", postId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePost(clientUid, postId) {
  await deleteDoc(doc(db, "clients", clientUid, "posts", postId));
}

// ── The two client actions. Deliberately the only writes a client makes.

export async function approvePost(clientUid, postId) {
  await updatePost(clientUid, postId, {
    status: STATUS.approved,
    clientNote: "",
    approvedAt: serverTimestamp(),
  });
}

export async function requestChanges(clientUid, postId, note) {
  await updatePost(clientUid, postId, {
    status: STATUS.changes_requested,
    clientNote: note,
  });
}

// Rescheduling an approved post more than a day sends it back for approval.
export async function reschedulePost(clientUid, post, newDate) {
  const oldDate = post.scheduledFor.toDate();
  const dayShift = Math.abs(newDate - oldDate) > 24 * 60 * 60 * 1000;
  const needsReapproval = post.status === STATUS.approved && dayShift;

  await updatePost(clientUid, post.id, {
    scheduledFor: Timestamp.fromDate(newDate),
    ...(needsReapproval ? { status: STATUS.pending_approval } : {}),
  });
  return needsReapproval;
}

// ── Messages ─────────────────────────────────────────────────

function msgCol(clientUid) {
  return collection(db, "clients", clientUid, "messages");
}

export function watchMessages(clientUid, cb) {
  const q = query(msgCol(clientUid), orderBy("sentAt"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.error("Message listener failed", err); cb([]); },
  );
}

export async function sendMessage(clientUid, { text, fromAdmin, authorName }) {
  await addDoc(msgCol(clientUid), {
    text: text.trim(),
    fromAdmin,
    authorName,
    sentAt: serverTimestamp(),
    readByClient: !fromAdmin,
    readByAdmin: fromAdmin,
  });
}

export async function markRead(clientUid, messages, asAdmin) {
  const field = asAdmin ? "readByAdmin" : "readByClient";
  const unread = messages.filter((m) => !m[field]);
  await Promise.all(
    unread.map((m) =>
      updateDoc(doc(db, "clients", clientUid, "messages", m.id), { [field]: true }),
    ),
  );
}

// ── Stats ────────────────────────────────────────────────────
// Written nightly by the fetch-stats function. Read-only for everyone.

export function watchStats(clientUid, yyyymm, cb) {
  return onSnapshot(doc(db, "clients", clientUid, "stats", yyyymm), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}

export async function getRecentStats(clientUid, months = 6) {
  const snap = await getDocs(
    query(collection(db, "clients", clientUid, "stats"), orderBy("__name__", "desc")),
  );
  return snap.docs.slice(0, months).map((d) => ({ month: d.id, ...d.data() })).reverse();
}

// ── Admin to-do list ─────────────────────────────────────────
// A simple shared task list for Sierra. Admin-only (see rules).

export function watchTodos(cb) {
  const q = query(collection(db, "todos"), orderBy("createdAt"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.error("Todo listener failed", err); cb([]); },
  );
}

export async function addTodo(text) {
  await addDoc(collection(db, "todos"), { text, done: false, createdAt: serverTimestamp() });
}

export async function toggleTodo(id, done) {
  await updateDoc(doc(db, "todos", id), { done });
}

export async function deleteTodo(id) {
  await deleteDoc(doc(db, "todos", id));
}

// ── Notifications ────────────────────────────────────────────
// Fire-and-forget notifications. Never blocks or throws into the action
// that triggered it. `to` is "sierra" (default) or a client email address.
export function notify(eventType, { firmName, to, clientEmail } = {}) {
  try {
    fetch("/.netlify/functions/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: eventType, firmName, to, clientEmail }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

// Back-compat: existing calls that emailed Sierra keep working.
export function notifySierra(eventType, firmName) {
  notify(eventType, { firmName, to: "sierra" });
}

// Notify a specific client at their email.
export function notifyClient(eventType, firmName, clientEmail) {
  notify(eventType, { firmName, to: "client", clientEmail });
}

// Email a client that Sierra sent them a message.
export async function notifyClientMessage(clientUid) {
  try {
    const snap = await getDoc(doc(db, "clients", clientUid));
    const c = snap.data();
    if (c?.email) notifyClient("message_from_sierra", c.firmName || "your firm", c.email);
  } catch { /* ignore */ }
}

// Look up a client and email them that a post is waiting for approval.
export async function notifyPostReady(clientUid) {
  try {
    const snap = await getDoc(doc(db, "clients", clientUid));
    const c = snap.data();
    if (c?.email) notifyClient("post_ready", c.firmName || "your firm", c.email);
  } catch { /* ignore */ }
}

// ── Monthly brief (client intake) ────────────────────────────
// One document per month at clients/{uid}/briefs/{yyyy-mm}.

export function watchBrief(clientUid, yyyymm, cb) {
  return onSnapshot(doc(db, "clients", clientUid, "briefs", yyyymm), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function saveBrief(clientUid, yyyymm, brief) {
  await setDoc(
    doc(db, "clients", clientUid, "briefs", yyyymm),
    { ...brief, month: yyyymm, submittedAt: serverTimestamp() },
    { merge: true },
  );
}
