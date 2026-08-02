import { useState } from "react";
import {
  updateEmail, updatePassword, EmailAuthProvider,
  reauthenticateWithCredential, sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../lib/auth";
import { PLATFORMS } from "../lib/constants";
import { updateMyProfile } from "../lib/data";
import "./Settings.css";

const AUTH_ERRORS = {
  "auth/wrong-password": "That password isn't right.",
  "auth/invalid-credential": "That password isn't right.",
  "auth/requires-recent-login": "For security, sign out and back in, then try again.",
  "auth/email-already-in-use": "Another account already uses that email.",
  "auth/invalid-email": "That doesn't look like an email address.",
  "auth/weak-password": "Use at least six characters.",
};

function Section({ title, sub, children }) {
  return (
    <div className="card set-card">
      <h3 className="set-h">{title}</h3>
      {sub && <p className="set-sub">{sub}</p>}
      {children}
    </div>
  );
}

export default function Settings({ client, clientUid }) {
  const { user } = useAuth();

  // ── Firm details
  const [firm, setFirm] = useState({
    firmName: client?.firmName || "",
    phone: client?.phone || "",
    platforms: client?.platforms || [],
  });
  const [firmBusy, setFirmBusy] = useState(false);
  const [firmMsg, setFirmMsg] = useState("");

  // ── Email / password
  const [newEmail, setNewEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMsg, setAuthMsg] = useState("");
  const [authErr, setAuthErr] = useState("");

  // ── Notifications
  const prefs = client?.notifyPrefs ?? { postsReady: true, messages: true, monthly: true };
  const [notify, setNotify] = useState(prefs);
  const [notifyMsg, setNotifyMsg] = useState("");

  const isPasswordUser = user?.providerData?.some((p) => p.providerId === "password");

  const togglePlatform = (k) =>
    setFirm((f) => ({
      ...f,
      platforms: f.platforms.includes(k)
        ? f.platforms.filter((p) => p !== k)
        : [...f.platforms, k],
    }));

  async function saveFirm() {
    if (!firm.firmName.trim()) return setFirmMsg("Firm name can't be empty.");
    setFirmBusy(true); setFirmMsg("");
    try {
      await updateMyProfile(clientUid, {
        firmName: firm.firmName.trim(),
        phone: firm.phone.trim(),
        platforms: firm.platforms,
      });
      setFirmMsg("Saved.");
      setTimeout(() => setFirmMsg(""), 2400);
    } catch {
      setFirmMsg("That didn't save. Try again.");
    }
    setFirmBusy(false);
  }

  async function saveNotify(next) {
    setNotify(next);
    try {
      await updateMyProfile(clientUid, { notifyPrefs: next });
      setNotifyMsg("Saved.");
      setTimeout(() => setNotifyMsg(""), 2000);
    } catch {
      setNotifyMsg("Couldn't save that.");
    }
  }

  async function changeEmail() {
    setAuthBusy(true); setAuthErr(""); setAuthMsg("");
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updateEmail(auth.currentUser, newEmail.trim());
      setAuthMsg("Email updated. Use the new one next time you sign in.");
      setNewEmail(""); setCurrentPw("");
    } catch (e) {
      setAuthErr(AUTH_ERRORS[e.code] ?? "That didn't work. Try again.");
    }
    setAuthBusy(false);
  }

  async function changePassword() {
    setAuthBusy(true); setAuthErr(""); setAuthMsg("");
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPw);
      setAuthMsg("Password updated.");
      setCurrentPw(""); setNewPw("");
    } catch (e) {
      setAuthErr(AUTH_ERRORS[e.code] ?? "That didn't work. Try again.");
    }
    setAuthBusy(false);
  }

  async function resetByEmail() {
    setAuthBusy(true); setAuthErr(""); setAuthMsg("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setAuthMsg(`Sent a reset link to ${user.email}.`);
    } catch {
      setAuthErr("Couldn't send that. Try again.");
    }
    setAuthBusy(false);
  }

  return (
    <div className="settings">
      <Section title="Your firm" sub="This is what Sierra sees on her side.">
        <label className="field">
          <span>Firm name</span>
          <input value={firm.firmName} onChange={(e) => setFirm((f) => ({ ...f, firmName: e.target.value }))} />
        </label>
        <label className="field">
          <span>Phone</span>
          <input value={firm.phone} onChange={(e) => setFirm((f) => ({ ...f, phone: e.target.value }))} placeholder="Optional" />
        </label>
        <div className="field">
          <span>Platforms</span>
          <div className="set-plats">
            {Object.entries(PLATFORMS).map(([k, p]) => (
              <button
                key={k}
                type="button"
                className={`set-plat${firm.platforms.includes(k) ? " is-on" : ""}`}
                onClick={() => togglePlatform(k)}
                aria-pressed={firm.platforms.includes(k)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row">
          <button className="btn btn-primary" onClick={saveFirm} disabled={firmBusy}>
            {firmBusy ? "Saving…" : "Save changes"}
          </button>
          {firmMsg && <span className="set-msg">{firmMsg}</span>}
        </div>
      </Section>

      <Section title="Sign-in" sub={`You're signed in as ${user?.email}.`}>
        {!isPasswordUser ? (
          <p className="set-note">
            You sign in with Google, so your email and password are managed there.
          </p>
        ) : (
          <>
            <label className="field">
              <span>Current password</span>
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
            </label>

            <label className="field">
              <span>New email</span>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Leave blank to keep current" />
            </label>
            <button className="btn btn-secondary" onClick={changeEmail} disabled={authBusy || !newEmail || !currentPw}>
              Change email
            </button>

            <div className="set-divider" />

            <label className="field">
              <span>New password</span>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" placeholder="At least six characters" />
            </label>
            <div className="set-row">
              <button className="btn btn-secondary" onClick={changePassword} disabled={authBusy || !newPw || !currentPw}>
                Change password
              </button>
              <button className="btn btn-quiet" onClick={resetByEmail} disabled={authBusy}>
                Email me a reset link
              </button>
            </div>
          </>
        )}
        {authMsg && <p className="set-ok">{authMsg}</p>}
        {authErr && <p className="set-err">{authErr}</p>}
      </Section>

      <Section title="Notifications" sub="Emails we send you. Sierra always hears from you either way.">
        {[
          ["postsReady", "When posts are ready for you to approve"],
          ["messages", "When Sierra sends you a message"],
          ["monthly", "A reminder to send your monthly brief"],
        ].map(([key, label]) => (
          <label key={key} className="set-toggle">
            <input
              type="checkbox"
              checked={Boolean(notify[key])}
              onChange={(e) => saveNotify({ ...notify, [key]: e.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
        {notifyMsg && <p className="set-ok">{notifyMsg}</p>}
      </Section>

      <Section
        title="Connected accounts"
        sub="Linking your social accounts lets us pull your real numbers and post for you."
      >
        <div className="set-pending">
          <strong>Not available yet</strong>
          <p>
            Instagram, Facebook, and LinkedIn each have to approve our app before
            accounts can be connected. That review is underway. Until it clears,
            Sierra posts on your behalf and your Results tab shows sample numbers.
          </p>
        </div>
      </Section>

      <Section title="Team access" sub="More than one person from your firm using this.">
        <div className="set-pending">
          <strong>Coming soon</strong>
          <p>
            Soon you'll be able to invite others at your firm with a code, so
            everyone has their own login into this same account. For now, message
            Sierra and she'll sort it out.
          </p>
        </div>
      </Section>
    </div>
  );
}
