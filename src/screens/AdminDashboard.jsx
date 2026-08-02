import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../lib/auth";
import { watchAllClients, watchPosts, watchMessages, watchBrief, updateClient, watchTodos, addTodo, toggleTodo, deleteTodo, approveClient } from "../lib/data";
import { SUBSCRIPTION_TIERS, STATUS, STATUS_LABEL, CONTENT_TYPES } from "../lib/constants";
import Calendar from "../components/Calendar";
import PostSheet from "../components/PostSheet";
import Composer from "../components/Composer";
import Chat from "../components/Chat";
import Stats from "./Stats";
import "../components/Intake.css";
import "./Dashboard.css";

const TABS = [
  { key: "clients",  label: "Clients" },
  { key: "calendar", label: "Calendar" },
  { key: "todo",     label: "To-do" },
  { key: "results",  label: "Results" },
  { key: "chat",     label: "Messages" },
  { key: "client",   label: "This client" },
];

function CounterRow({ posts }) {
  const counts = useMemo(() => {
    const c = { draft: 0, pending_approval: 0, approved: 0, changes_requested: 0, published: 0 };
    for (const p of posts) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [posts]);

  const shown = ["changes_requested", "pending_approval", "approved", "draft"];

  return (
    <div className="counters">
      {shown.map((k) => (
        <div key={k} className={`counter${counts[k] > 0 && k === "changes_requested" ? " is-hot" : ""}`}>
          <span className="counter-n">{counts[k]}</span>
          <span className="counter-l">{STATUS_LABEL[k]}</span>
        </div>
      ))}
    </div>
  );
}

function PendingSignup({ c }) {
  const [tier, setTier] = useState(c.requestedTier || "basic");
  const [busy, setBusy] = useState(false);

  return (
    <div className="card signup-review">
      <div className="signup-review-head">
        <div>
          <h3>{c.firmName || c.email}</h3>
          <p>{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
        </div>
        <span className="pill pill-pending">Needs approval</span>
      </div>

      <dl className="cpanel-dl">
        <div><dt>Platforms</dt><dd>{c.platforms?.join(", ") || "—"}</dd></div>
        <div><dt>Plan they picked</dt><dd style={{ textTransform: "capitalize" }}>{c.requestedTier || "—"}</dd></div>
      </dl>

      {c.goal && (
        <div className="brief-block">
          <span className="brief-label">Their goal</span>
          <p>{c.goal}</p>
        </div>
      )}
      {c.notes && (
        <div className="brief-block">
          <span className="brief-label">Notes</span>
          <p>{c.notes}</p>
        </div>
      )}

      <label className="field cpanel-planset" style={{ marginTop: 16 }}>
        <span>Set their plan</span>
        <select value={tier} onChange={(e) => setTier(e.target.value)}>
          {Object.entries(SUBSCRIPTION_TIERS).map(([k, t]) => (
            <option key={k} value={k}>{t.label} — ${t.price.toLocaleString()}/mo</option>
          ))}
        </select>
      </label>

      <button
        className="btn btn-primary btn-full"
        disabled={busy}
        onClick={async () => { setBusy(true); await approveClient(c.id, tier); }}
      >
        {busy ? "Approving…" : "Approve and open their account"}
      </button>
    </div>
  );
}

function Roster({ clients, onPick }) {
  const pending = clients.filter((c) => c.accountState === "pending");
  const active = clients.filter((c) => c.accountState === "active");

  return (
    <div className="roster">
      {pending.length > 0 && (
        <div className="roster-pending">
          <p className="revisions-head">
            {pending.length} new signup{pending.length > 1 ? "s" : ""} waiting on you
          </p>
          {pending.map((c) => <PendingSignup key={c.id} c={c} />)}
        </div>
      )}

      <p className="queue-head" style={{ marginTop: pending.length ? 24 : 0 }}>
        {active.length} active client{active.length === 1 ? "" : "s"}
      </p>

      {active.length === 0 ? (
        <div className="card empty">
          <h3>No active clients yet</h3>
          <p>Once you approve a signup, they'll show up here.</p>
        </div>
      ) : (
        <div className="roster-list">
          {active.map((c) => {
            const t = SUBSCRIPTION_TIERS[c.subscription?.tier] ?? SUBSCRIPTION_TIERS.basic;
            return (
              <button key={c.id} className="roster-row" onClick={() => onPick(c.id)}>
                <span className="roster-firm">
                  <span className="roster-firm-text">
                    <b>{c.firmName}</b><small>{c.email}</small>
                  </span>
                </span>
                <span className="roster-plan"><b>{t.label}</b><small>${t.price.toLocaleString()}/mo</small></span>
                <span><span className="pill pill-approved">Active</span></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TodoList() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => watchTodos(setTodos), []);

  const add = () => {
    if (!text.trim()) return;
    addTodo(text.trim());
    setText("");
  };

  return (
    <div className="todo">
      <div className="todo-add">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task…"
        />
        <button className="btn btn-primary" disabled={!text.trim()} onClick={add}>Add</button>
      </div>
      <div className="todo-list">
        {todos.length === 0 && (
          <p className="todo-alldone">No tasks yet. Add one above.</p>
        )}
        {todos.map((t) => (
          <div key={t.id} className={`todo-item${t.done ? " is-done" : ""}`}>
            <button className="todo-check" onClick={() => toggleTodo(t.id, !t.done)} aria-label={t.done ? "Mark undone" : "Mark done"}>
              {t.done ? "✓" : ""}
            </button>
            <span className="todo-text">{t.text}</span>
            <button className="todo-del" onClick={() => deleteTodo(t.id)} aria-label="Delete">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefView({ clientUid }) {
  const [brief, setBrief] = useState(undefined);

  useEffect(() => {
    if (!clientUid) return;
    const key = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    return watchBrief(clientUid, key, setBrief);
  }, [clientUid]);

  if (brief === undefined) return null;

  return (
    <div className="card brief">
      <div className="brief-head">
        <h3>This month's brief from the client</h3>
        {brief && <span className="pill pill-approved">Received</span>}
      </div>

      {!brief ? (
        <p className="brief-empty">The client hasn't sent this month's brief yet.</p>
      ) : (
        <>
          {brief.wantPosts?.length > 0 && (
            <div className="brief-block">
              <span className="brief-label">Posts they want</span>
              {brief.wantPosts.map((p, i) => (
                <div key={i} className="brief-post-row">
                  <div className="brief-post"><b>{p.topic}</b>{p.when && <small>{p.when}</small>}</div>
                  {p.photo && <div className="intake-thumb"><img src={p.photo} alt="" onError={(e) => { e.target.style.display = "none"; }} /></div>}
                </div>
              ))}
            </div>
          )}
          {brief.typePrefs && Object.keys(brief.typePrefs).length > 0 && (
            <div className="brief-block">
              <span className="brief-label">Content types</span>
              <div className="brief-tags">
                {Object.entries(brief.typePrefs).map(([k, pref]) => (
                  <span key={k} className={`brief-tag ${pref === "more" ? "brief-more" : "brief-less"}`}>
                    {pref === "more" ? "▲ More" : "▼ Less"} {CONTENT_TYPES[k]?.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {brief.dayPref && (
            <div className="brief-block"><span className="brief-label">Day preferences</span><p>{brief.dayPref}</p></div>
          )}
          {brief.bigDates && (
            <div className="brief-block"><span className="brief-label">Big dates</span><p>{brief.bigDates}</p></div>
          )}
          {brief.note && (
            <div className="brief-block"><span className="brief-label">Note</span><p>{brief.note}</p></div>
          )}
        </>
      )}
    </div>
  );
}

function ClientPanel({ client }) {
  const sub = client.subscription ?? {};
  const [saving, setSaving] = useState(false);
  const [savedTier, setSavedTier] = useState("");

  async function setPlan(newTier) {
    setSaving(true);
    try {
      // Sierra sets the plan directly. (Billing, if used, is handled separately.)
      await updateClient(client.id, { "subscription.tier": newTier });
      setSavedTier(newTier);
      setTimeout(() => setSavedTier(""), 2400);
    } catch {
      // no-op; the select reverts on next snapshot
    }
    setSaving(false);
  }

  const tier = SUBSCRIPTION_TIERS[sub.tier] ?? SUBSCRIPTION_TIERS.basic;

  return (
    <div className="cpanel">
      <div className="card">
        <h3 className="cpanel-h">Account</h3>
        <dl className="cpanel-dl">
          <div><dt>Firm</dt><dd>{client.firmName}</dd></div>
          <div><dt>Email</dt><dd>{client.email}</dd></div>
          <div><dt>Platforms</dt><dd>{client.platforms?.join(", ") || "—"}</dd></div>
        </dl>
      </div>

      <div className="card">
        <h3 className="cpanel-h">Subscription</h3>
        <label className="field cpanel-planset">
          <span>Plan — you set this</span>
          <select value={sub.tier ?? "basic"} onChange={(e) => setPlan(e.target.value)} disabled={saving}>
            {Object.entries(SUBSCRIPTION_TIERS).map(([k, t]) => (
              <option key={k} value={k}>{t.label} — ${t.price.toLocaleString()}/mo</option>
            ))}
          </select>
        </label>
        <dl className="cpanel-dl">
          <div><dt>Posts included</dt><dd>{tier.postsPerMonth} / month</dd></div>
        </dl>
        <p className="cpanel-note">
          {savedTier ? `Plan set to ${SUBSCRIPTION_TIERS[savedTier].label}.` :
          "You choose the plan based on what you agreed with the client. They see it but can't change it."}
        </p>
      </div>

      <BriefView clientUid={client.id} />
    </div>
  );
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("clients");

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [posts, setPosts] = useState([]);
  const [unread, setUnread] = useState({});
  const [open, setOpen]   = useState(null);
  const [compose, setCompose] = useState(null); // { post } | { date }
  const [toast, setToast] = useState("");

  useEffect(() => watchAllClients(setClients), []);

  // Only approved clients can be worked on.
  const activeClients = clients.filter((c) => c.accountState === "active");
  const pendingCount = clients.filter((c) => c.accountState === "pending").length;

  useEffect(() => {
    if (!selected && activeClients.length > 0) setSelected(activeClients[0].id);
  }, [activeClients, selected]);

  useEffect(() => {
    if (!selected) return;
    return watchPosts(selected, year, month, false, setPosts);
  }, [selected, year, month]);

  // Unread badge per client, so Sierra sees who's waiting.
  useEffect(() => {
    const unsubs = activeClients.map((c) =>
      watchMessages(c.id, (msgs) => {
        const n = msgs.filter((m) => !m.fromAdmin && !m.readByAdmin).length;
        setUnread((u) => ({ ...u, [c.id]: n }));
      }),
    );
    return () => unsubs.forEach((fn) => fn());
  }, [clients]);

  const client = activeClients.find((c) => c.id === selected);

  function step(delta) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }
  function today() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function openNewPost(day) {
    setCompose({ date: new Date(year, month, day, 9, 0) });
  }
  function openEdit(post) {
    setOpen(null);
    setCompose({ post });
  }

  const needsChanges = posts.filter((p) => p.status === STATUS.changes_requested);

  return (
    <div className="dash dark">
      <header className="dash-head">
        <div className="dash-brand">
          <span className="dash-mark">SR</span>
          <div>
            <h1>Admin</h1>
            <p>Sierra Roberts Legal Media</p>
          </div>
        </div>
        <button className="btn btn-quiet" onClick={signOut}>Sign out</button>
      </header>

      {tab !== "clients" && tab !== "todo" && activeClients.length > 0 && (
        <div className="dash-switcher">
          <label className="sr-only" htmlFor="client-select">Client</label>
          <select
            id="client-select"
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firmName}
                {unread[c.id] > 0 ? ` (${unread[c.id]} new)` : ""}
              </option>
            ))}
          </select>

          {tab === "calendar" && (
            <button className="btn btn-primary" onClick={() => openNewPost(new Date().getDate())}>
              New post
            </button>
          )}
        </div>
      )}

      <nav className="dash-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`dash-tab${tab === t.key ? " is-on" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "chat" && unread[selected] > 0 && (
              <span className="dash-badge">{unread[selected]}</span>
            )}
            {t.key === "clients" && pendingCount > 0 && (
              <span className="dash-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="dash-main">
        {tab === "clients" && <Roster clients={clients} onPick={(id) => { setSelected(id); setTab("calendar"); }} />}

        {tab === "calendar" && !client && (
          <div className="card empty">
            <h3>No client selected</h3>
            <p>Approve a signup or pick a client from the Clients tab to see their calendar.</p>
          </div>
        )}

        {tab === "calendar" && client && (
          <>
            <CounterRow posts={posts} />

            {needsChanges.length > 0 && (
              <div className="revisions">
                <p className="revisions-head">
                  {needsChanges.length} post{needsChanges.length > 1 ? "s" : ""} came back with notes
                </p>
                {needsChanges.map((p) => (
                  <div key={p.id} className="revision card">
                    <span
                      className="queue-swatch"
                      style={{ background: CONTENT_TYPES[p.contentType]?.color }}
                    />
                    <button className="revision-main" onClick={() => openEdit(p)}>
                      <span className="queue-cap">{p.clientNote}</span>
                    </button>
                    <button
                      className="btn btn-quiet revision-todo"
                      title="Add to your to-do list"
                      onClick={() => {
                        addTodo(`${client?.firmName ?? "Client"}: ${p.clientNote}`);
                        setToast("Added to your to-do list.");
                        setTimeout(() => setToast(""), 2400);
                      }}
                    >
                      + To-do
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Calendar
              year={year}
              month={month}
              posts={posts}
              isAdmin
              onSelectPost={setOpen}
              onSelectDay={openNewPost}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
              onToday={today}
            />
          </>
        )}

        {tab === "todo" && <TodoList />}

        {tab === "results" && client && (
          <Stats clientUid={selected} platforms={client.platforms ?? []} />
        )}

        {tab === "chat" && selected && (
          <Chat
            clientUid={selected}
            isAdmin
            authorName="Sierra"
            firmName={client?.firmName}
          />
        )}

        {tab === "client" && client && <ClientPanel client={client} />}
      </main>

      {open && (
        <PostSheet
          post={open}
          clientUid={selected}
          isAdmin
          firmName={client?.firmName}
          onClose={() => setOpen(null)}
          onEdit={openEdit}
        />
      )}

      {compose && (
        <Composer
          clientUid={selected}
          post={compose.post}
          initialDate={compose.date}
          onClose={() => setCompose(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
