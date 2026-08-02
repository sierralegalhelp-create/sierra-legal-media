import { useState, useEffect } from "react";
import { CONTENT_TYPES, MONTHS } from "../lib/constants";
import { watchBrief, saveBrief, notifySierra } from "../lib/data";
import "./Intake.css";

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const EMPTY = { wantPosts: [{ topic: "", when: "", photo: "" }], typePrefs: {}, dayPref: "", bigDates: "", note: "" };

export default function Intake({ clientUid, firmName }) {
  const key = thisMonthKey();
  const monthName = MONTHS[new Date().getMonth()];

  const [form, setForm] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [err, setErr] = useState("");

  // Load this month's brief if it exists.
  useEffect(() => {
    if (!clientUid) return;
    return watchBrief(clientUid, key, (b) => {
      if (b) {
        setForm({
          wantPosts: b.wantPosts?.length ? b.wantPosts : EMPTY.wantPosts,
          typePrefs: b.typePrefs || {},
          dayPref: b.dayPref || "",
          bigDates: b.bigDates || "",
          note: b.note || "",
        });
        setSavedAt(b.submittedAt);
      }
      setLoaded(true);
    });
  }, [clientUid, key]);

  const setPost = (i, field, val) =>
    setForm((f) => ({ ...f, wantPosts: f.wantPosts.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)) }));
  const addPost = () => setForm((f) => ({ ...f, wantPosts: [...f.wantPosts, { topic: "", when: "", photo: "" }] }));
  const removePost = (i) => setForm((f) => ({ ...f, wantPosts: f.wantPosts.filter((_, idx) => idx !== i) }));
  const cycleType = (k) =>
    setForm((f) => {
      const cur = f.typePrefs[k];
      const next = cur === "more" ? "less" : cur === "less" ? undefined : "more";
      const tp = { ...f.typePrefs };
      if (next) tp[k] = next;
      else delete tp[k];
      return { ...f, typePrefs: tp };
    });

  async function submit() {
    setBusy(true);
    setErr("");
    // Drop empty post rows before saving.
    const cleaned = {
      ...form,
      wantPosts: form.wantPosts.filter((p) => p.topic.trim() || p.when.trim() || p.photo.trim()),
    };
    try {
      await saveBrief(clientUid, key, cleaned);
      notifySierra("brief_submitted", firmName);
      setSavedAt(new Date());
    } catch {
      setErr("That didn't send. Check your connection and try again.");
    }
    setBusy(false);
  }

  if (!loaded) {
    return <div className="intake-loading"><div className="spinner" /></div>;
  }

  return (
    <div className="intake card">
      <div className="intake-head">
        <h2>This month's brief</h2>
        <p>
          Tell Sierra what you'd like for {monthName}. Fill in as much or as little as you
          want — she'll take it from here.
          {savedAt && <span className="intake-saved"> Last sent, and saved.</span>}
        </p>
      </div>

      <div className="intake-section">
        <span className="intake-label">Posts you already have in mind</span>
        {form.wantPosts.map((p, i) => (
          <div key={i} className="intake-post">
            <div className="intake-post-top">
              <input
                className="intake-topic"
                value={p.topic}
                onChange={(e) => setPost(i, "topic", e.target.value)}
                placeholder="What's the post about?"
              />
              {form.wantPosts.length > 1 && (
                <button className="intake-x" onClick={() => removePost(i)} aria-label="Remove this post">✕</button>
              )}
            </div>
            <input
              className="intake-when"
              value={p.when}
              onChange={(e) => setPost(i, "when", e.target.value)}
              placeholder="Rough date (optional)"
            />
            <input
              className="intake-photo"
              value={p.photo}
              onChange={(e) => setPost(i, "photo", e.target.value)}
              placeholder="Photo link (optional) — paste an image URL"
            />
            {p.photo && (
              <div className="intake-thumb">
                <img src={p.photo} alt="" onError={(e) => { e.target.style.display = "none"; }} />
              </div>
            )}
          </div>
        ))}
        <button className="intake-add" onClick={addPost}>+ Add another post</button>
      </div>

      <div className="intake-section">
        <span className="intake-label">Content types — tap for more or less this month</span>
        <div className="intake-types">
          {Object.entries(CONTENT_TYPES).map(([k, ct]) => {
            const pref = form.typePrefs[k];
            return (
              <button
                key={k}
                className={`intake-type${pref ? ` is-${pref}` : ""}`}
                onClick={() => cycleType(k)}
                aria-pressed={Boolean(pref)}
              >
                <span className="intake-dot" style={{ background: ct.color }} />
                {ct.label}
                {pref === "more" && <span className="intake-flag">▲ more</span>}
                {pref === "less" && <span className="intake-flag">▼ less</span>}
              </button>
            );
          })}
        </div>
      </div>

      <label className="intake-section">
        <span className="intake-label">Day or time preferences</span>
        <input
          value={form.dayPref}
          onChange={(e) => setForm((f) => ({ ...f, dayPref: e.target.value }))}
          placeholder="e.g. weekday mornings, nothing on Sundays"
        />
      </label>

      <label className="intake-section">
        <span className="intake-label">Big dates this month</span>
        <textarea
          rows={2}
          value={form.bigDates}
          onChange={(e) => setForm((f) => ({ ...f, bigDates: e.target.value }))}
          placeholder="Events, promotions, office closures — anything happening this month we should post around."
        />
      </label>

      <label className="intake-section">
        <span className="intake-label">Anything else for Sierra</span>
        <textarea
          rows={3}
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="Notes, ideas, things to keep in mind…"
        />
      </label>

      {err && <p className="intake-err">{err}</p>}

      <button className="btn btn-primary btn-full" onClick={submit} disabled={busy}>
        {busy ? "Sending…" : savedAt ? "Update this month's brief" : "Send this month's brief"}
      </button>
    </div>
  );
}
