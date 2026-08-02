import { useAuth } from "../lib/auth";
import "./Signup.css";

export default function Pending({ client }) {
  const { signOut } = useAuth();

  return (
    <div className="signup">
      <div className="signup-card card signup-pending">
        <span className="signup-mark">SR</span>
        <div className="pending-badge">✓</div>
        <h1>You're on the list</h1>
        <p className="signup-sub">
          Thanks{client?.firmName ? `, ${client.firmName}` : ""} — Sierra has
          your info and will look it over shortly. You'll get an email the
          moment she's set your calendar up.
        </p>

        <div className="pending-recap">
          <div><dt>Firm</dt><dd>{client?.firmName || "—"}</dd></div>
          <div><dt>Platforms</dt><dd>{client?.platforms?.length ? client.platforms.join(", ") : "—"}</dd></div>
          <div><dt>Plan you picked</dt><dd>{client?.requestedTier || "—"}</dd></div>
        </div>

        <p className="signup-fine">
          Nothing else to do right now. This page will open up on its own once
          you're approved.
        </p>

        <button className="btn btn-secondary btn-full" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
