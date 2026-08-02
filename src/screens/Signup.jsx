import { useState } from "react";
import { PLATFORMS, SUBSCRIPTION_TIERS } from "../lib/constants";
import { submitSignup } from "../lib/data";
import "./Signup.css";

export default function Signup({ uid, email, onDone }) {
  const [form, setForm] = useState({
    firmName: "",
    phone: "",
    platforms: [],
    goal: "",
    requestedTier: "basic",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const togglePlatform = (k) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(k)
        ? f.platforms.filter((p) => p !== k)
        : [...f.platforms, k],
    }));

  async function submit() {
    if (!form.firmName.trim()) return setErr("What's your firm called?");
    if (form.platforms.length === 0) return setErr("Pick at least one platform.");

    setBusy(true);
    setErr("");
    try {
      await submitSignup(uid, {
        ...form,
        firmName: form.firmName.trim(),
      });
      onDone?.();
    } catch {
      setErr("That didn't send. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="signup">
      <div className="signup-card card">
        <span className="signup-mark">SR</span>
        <h1>Let's get you set up</h1>
        <p className="signup-sub">
          A few questions so Sierra knows what you need. She'll review this and
          get you started.
        </p>

        <label className="field">
          <span>Firm name</span>
          <input
            value={form.firmName}
            onChange={(e) => set("firmName", e.target.value)}
            placeholder="e.g. Sagebrush Law"
            autoFocus
          />
        </label>

        <label className="field">
          <span>Best phone number</span>
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="Optional, but helps Sierra reach you"
          />
        </label>

        <div className="field">
          <span>Which platforms?</span>
          <div className="signup-plats">
            {Object.entries(PLATFORMS).map(([k, p]) => (
              <button
                key={k}
                type="button"
                className={`signup-plat${form.platforms.includes(k) ? " is-on" : ""}`}
                onClick={() => togglePlatform(k)}
                aria-pressed={form.platforms.includes(k)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>What are you hoping to get out of this?</span>
          <textarea
            rows={3}
            value={form.goal}
            onChange={(e) => set("goal", e.target.value)}
            placeholder="More estate-planning clients, more visibility locally, staying consistent…"
          />
        </label>

        <div className="field">
          <span>Which plan looks right?</span>
          <div className="signup-tiers">
            {Object.entries(SUBSCRIPTION_TIERS).map(([k, t]) => (
              <button
                key={k}
                type="button"
                className={`signup-tier${form.requestedTier === k ? " is-on" : ""}`}
                onClick={() => set("requestedTier", k)}
                aria-pressed={form.requestedTier === k}
              >
                <b>{t.label}</b>
                <small>${t.price.toLocaleString()}/mo</small>
              </button>
            ))}
          </div>
          <p className="signup-hint">
            Not sure? Pick the closest — Sierra will confirm what fits.
          </p>
        </div>

        <label className="field">
          <span>Anything else she should know?</span>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Practice areas, tone you like, things to avoid…"
          />
        </label>

        {err && <p className="signup-err">{err}</p>}

        <button className="btn btn-primary btn-full" onClick={submit} disabled={busy}>
          {busy ? "Sending…" : "Send to Sierra"}
        </button>

        <p className="signup-fine">Signed in as {email}</p>
      </div>
    </div>
  );
}
