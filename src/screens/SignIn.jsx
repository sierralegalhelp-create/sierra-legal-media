import { useState } from "react";
import { useAuth } from "../lib/auth";
import "./SignIn.css";

const FRIENDLY = {
  "auth/invalid-credential": "That email and password don't match.",
  "auth/user-not-found":     "No account with that email.",
  "auth/wrong-password":     "That password isn't right.",
  "auth/email-already-in-use": "There's already an account with that email. Sign in instead.",
  "auth/weak-password":      "Use at least six characters.",
  "auth/invalid-email":      "That doesn't look like an email address.",
  "auth/popup-closed-by-user": "",
  "auth/too-many-requests":  "Too many tries. Wait a minute and try again.",
};

export default function SignIn() {
  const { signInGoogle, signInEmail, signUpEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState("in"); // in | up | reset
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  async function run(fn) {
    setBusy(true); setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(FRIENDLY[e.code] ?? "Something went wrong. Try again.");
    }
    setBusy(false);
  }

  const submit = () => {
    if (mode === "reset") {
      return run(async () => {
        await resetPassword(email);
        setSent(true);
      });
    }
    if (mode === "up") return run(() => signUpEmail(email, pw));
    return run(() => signInEmail(email, pw));
  };

  return (
    <div className="signin">
      <div className="signin-card">
        <div className="signin-mark" aria-hidden="true">SR</div>

        <h1>Sierra Roberts Legal Media</h1>
        <p className="signin-sub">
          {mode === "up"
            ? "Set up your account to see your calendar."
            : mode === "reset"
            ? "We'll email you a link to set a new password."
            : "Sign in to see this month's calendar."}
        </p>

        {sent ? (
          <div className="signin-sent">
            <p>Check <strong>{email}</strong> for the reset link.</p>
            <button
              className="btn btn-secondary btn-full"
              onClick={() => { setMode("in"); setSent(false); setErr(""); }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <button
              className="btn btn-secondary btn-full signin-google"
              onClick={() => run(signInGoogle)}
              disabled={busy}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z"/>
              </svg>
              Continue with Google
            </button>

            <div className="signin-or"><span>or</span></div>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoComplete="email"
              />
            </label>

            {mode !== "reset" && (
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                />
              </label>
            )}

            {err && <p className="signin-err">{err}</p>}

            <button
              className="btn btn-primary btn-full"
              onClick={submit}
              disabled={busy || !email || (mode !== "reset" && !pw)}
            >
              {busy
                ? "One moment…"
                : mode === "up"
                ? "Create account"
                : mode === "reset"
                ? "Send reset link"
                : "Sign in"}
            </button>

            <div className="signin-alts">
              {mode === "in" && (
                <>
                  <button className="signin-link" onClick={() => { setMode("up"); setErr(""); }}>
                    Create an account
                  </button>
                  <span>·</span>
                  <button className="signin-link" onClick={() => { setMode("reset"); setErr(""); }}>
                    Forgot password
                  </button>
                </>
              )}
              {mode !== "in" && (
                <button className="signin-link" onClick={() => { setMode("in"); setErr(""); }}>
                  Back to sign in
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
