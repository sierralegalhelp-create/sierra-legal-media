import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { watchPosts, watchPendingPosts, watchMessages } from "../lib/data";
import { SUBSCRIPTION_TIERS, CONTENT_TYPES } from "../lib/constants";
import Calendar from "../components/Calendar";
import PostSheet from "../components/PostSheet";
import Chat from "../components/Chat";
import Intake from "../components/Intake";
import Stats from "./Stats";
import Settings from "./Settings";
import "./Dashboard.css";

const TABS = [
  { key: "calendar", label: "Calendar" },
  { key: "approve",  label: "To approve" },
  { key: "results",  label: "Results" },
  { key: "chat",     label: "Messages" },
  { key: "plan",     label: "Your plan" },
  { key: "settings", label: "Settings" },
];

function fmtDay(ts) {
  const d = ts?.toDate?.() ?? new Date(ts);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function Plan({ client, clientUid }) {
  const sub = client?.subscription ?? {};
  const tier = SUBSCRIPTION_TIERS[sub.tier] ?? SUBSCRIPTION_TIERS.basic;
  const active = sub.status === "active" || sub.status === "trialing";

  const renews = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd * 1000).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <div className="plan-solo">
      <div className="plan-hero card">
        <span className="plan-tag">Your plan</span>
        <h2 className="plan-hero-name">{tier.label}</h2>
        <p className="plan-hero-price">${tier.price.toLocaleString()}<span>/month</span></p>
        <ul className="plan-hero-list">
          {tier.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
        <p className="plan-hero-note">
          {active && renews && !sub.cancelAtPeriodEnd && `Renews ${renews}. `}
          {active && sub.cancelAtPeriodEnd && renews && `Active through ${renews}. `}
          Questions about your plan? Just message Sierra.
        </p>
      </div>

      <Intake clientUid={clientUid} firmName={client?.firmName} />
    </div>
  );
}

export default function ClientDashboard() {
  const { user, client, signOut } = useAuth();
  const [tab, setTab] = useState("calendar");

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [posts, setPosts]     = useState([]);
  const [pending, setPending] = useState([]);
  const [unread, setUnread]   = useState(0);
  const [open, setOpen]       = useState(null);

  useEffect(() => {
    if (!user) return;
    return watchPosts(user.uid, year, month, true, setPosts);
  }, [user, year, month]);

  useEffect(() => {
    if (!user) return;
    return watchPendingPosts(user.uid, setPending);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchMessages(user.uid, (msgs) =>
      setUnread(msgs.filter((m) => m.fromAdmin && !m.readByClient).length),
    );
  }, [user]);

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

  const badge = { approve: pending.length, chat: unread };

  return (
    <div className="dash">
      <header className="dash-head">
        <div className="dash-brand">
          <span className="dash-mark">SR</span>
          <div>
            <h1>{client?.firmName ?? "Your calendar"}</h1>
            <p>Sierra Roberts Legal Media</p>
          </div>
        </div>
        <button className="btn btn-quiet" onClick={signOut}>Sign out</button>
      </header>

      <nav className="dash-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`dash-tab${tab === t.key ? " is-on" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {badge[t.key] > 0 && <span className="dash-badge">{badge[t.key]}</span>}
          </button>
        ))}
      </nav>

      <main className="dash-main">
        {tab === "calendar" && (
          <Calendar
            year={year}
            month={month}
            posts={posts}
            isAdmin={false}
            onSelectPost={setOpen}
            onSelectDay={() => {}}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onToday={today}
          />
        )}

        {tab === "approve" && (
          pending.length === 0 ? (
            <div className="card empty">
              <h3>You're all caught up</h3>
              <p>Nothing is waiting on you. Sierra will let you know when the next batch is ready.</p>
            </div>
          ) : (
            <div className="queue">
              <p className="queue-head">
                {pending.length} post{pending.length > 1 ? "s" : ""} waiting on you
              </p>
              {pending.map((p) => (
                <button key={p.id} className="queue-item card" onClick={() => setOpen(p)}>
                  <span
                    className="queue-swatch"
                    style={{ background: CONTENT_TYPES[p.contentType]?.color }}
                  />
                  <span className="queue-text">
                    <span className="queue-date">{fmtDay(p.scheduledFor)}</span>
                    <span className="queue-cap">{p.caption}</span>
                  </span>
                  <span className="queue-go" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          )
        )}

        {tab === "results" && client && (
          <Stats clientUid={user.uid} platforms={client.platforms ?? []} />
        )}

        {tab === "chat" && user && (
          <Chat
            clientUid={user.uid}
            isAdmin={false}
            authorName={client?.firmName ?? "Client"}
            firmName={client?.firmName}
          />
        )}

        {tab === "plan" && client && <Plan client={client} clientUid={user.uid} />}

        {tab === "settings" && client && <Settings client={client} clientUid={user.uid} />}
      </main>

      {open && (
        <PostSheet
          post={open}
          clientUid={user.uid}
          isAdmin={false}
          firmName={client?.firmName}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
