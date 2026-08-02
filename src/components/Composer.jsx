import { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { CONTENT_TYPES, PLATFORMS, STATUS, FORMATS } from "../lib/constants";
import { createPost, updatePost, deletePost } from "../lib/data";
import "./Composer.css";

function toLocalInput(ts) {
  const d = ts?.toDate?.() ?? (ts instanceof Date ? ts : new Date(ts));
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BLANK = {
  contentType: "legal_tip",
  format: "post",
  platforms: ["instagram"],
  caption: "",
  mediaUrl: "",
};

export default function Composer({ clientUid, post, initialDate, onClose }) {
  const editing = Boolean(post?.id);

  const [form, setForm] = useState(() => {
    if (post) {
      return {
        contentType: post.contentType,
        format: post.format || "post",
        platforms: post.platforms || [],
        caption: post.caption || "",
        mediaUrl: post.mediaUrl || "",
      };
    }
    return BLANK;
  });

  const [when, setWhen] = useState(() =>
    toLocalInput(post?.scheduledFor ?? initialDate ?? new Date()),
  );
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState("");
  const [confirmDel, setConfirm] = useState(false);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose, busy]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const togglePlatform = (key) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(key)
        ? f.platforms.filter((p) => p !== key)
        : [...f.platforms, key],
    }));

  function validate() {
    if (!form.caption.trim())      return "Write a caption.";
    if (form.platforms.length === 0) return "Pick at least one platform.";
    if (!when)                      return "Pick a date and time.";
    return "";
  }

  async function save(status) {
    const problem = validate();
    if (problem) { setErr(problem); return; }

    setBusy(true); setErr("");
    const payload = {
      ...form,
      caption: form.caption.trim(),
      scheduledFor: Timestamp.fromDate(new Date(when)),
      status,
    };

    try {
      if (editing) await updatePost(clientUid, post.id, payload);
      else         await createPost(clientUid, payload);
      onClose();
    } catch {
      setErr("That didn't save. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deletePost(clientUid, post.id);
      onClose();
    } catch {
      setErr("Couldn't delete that. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="comp-backdrop" onClick={() => !busy && onClose()}>
      <div
        className="comp"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit post" : "New post"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="comp-head">
          <h2>{editing ? "Edit post" : "New post"}</h2>
          <button className="btn-quiet" onClick={onClose} disabled={busy} aria-label="Close">✕</button>
        </div>

        <div className="comp-body">
          <label className="field">
            <span>Content type</span>
            <div className="comp-types">
              {Object.entries(CONTENT_TYPES).map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  className={`comp-type${form.contentType === k ? " is-on" : ""}`}
                  onClick={() => set("contentType", k)}
                  aria-pressed={form.contentType === k}
                >
                  <span className="comp-dot" style={{ background: t.color }} />
                  {t.label}
                </button>
              ))}
            </div>
          </label>

          <label className="field">
            <span>Format</span>
            <div className="comp-plats">
              {Object.entries(FORMATS).map(([k, f]) => (
                <button
                  key={k}
                  type="button"
                  className={`comp-plat${form.format === k ? " is-on" : ""}`}
                  onClick={() => set("format", k)}
                  aria-pressed={form.format === k}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </label>

          <label className="field">
            <span>Platforms</span>
            <div className="comp-plats">
              {Object.entries(PLATFORMS).map(([k, p]) => (
                <button
                  key={k}
                  type="button"
                  className={`comp-plat${form.platforms.includes(k) ? " is-on" : ""}`}
                  onClick={() => togglePlatform(k)}
                  aria-pressed={form.platforms.includes(k)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </label>

          <label className="field">
            <span>Goes out</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Caption</span>
            <textarea
              value={form.caption}
              onChange={(e) => set("caption", e.target.value)}
              placeholder="Write the post exactly as it should appear."
              rows={5}
            />
          </label>

          <div className="field">
            <span>Image link</span>
            <input
              type="url"
              value={form.mediaUrl}
              onChange={(e) => set("mediaUrl", e.target.value)}
              placeholder="Paste an image link (ends in .jpg or .png)"
            />
            {form.mediaUrl && (
              <div className="comp-preview">
                <img src={form.mediaUrl} alt="" onError={(e) => { e.target.style.display = "none"; }} />
                <button
                  type="button"
                  className="comp-remove"
                  onClick={() => set("mediaUrl", "")}
                >
                  Remove
                </button>
              </div>
            )}
            <p className="comp-hint">
              Paste a link to an image (from Canva, Google Drive, Dropbox, or anywhere online).
              Photo uploads can be turned on later.
            </p>
          </div>

          {post?.clientNote && (
            <div className="comp-clientnote">
              <strong>They asked for</strong>
              <p>{post.clientNote}</p>
            </div>
          )}

          {err && <p className="comp-err">{err}</p>}
        </div>

        <div className="comp-foot">
          {editing && !confirmDel && (
            <button className="btn btn-danger" onClick={() => setConfirm(true)} disabled={busy}>
              Delete
            </button>
          )}
          {editing && confirmDel && (
            <div className="comp-confirm">
              <span>Delete this post?</span>
              <button className="btn btn-danger" onClick={remove} disabled={busy}>Yes, delete</button>
              <button className="btn btn-quiet" onClick={() => setConfirm(false)} disabled={busy}>No</button>
            </div>
          )}

          {!confirmDel && (
            <div className="comp-foot-right">
              <button
                className="btn btn-secondary"
                onClick={() => save(STATUS.draft)}
                disabled={busy}
              >
                Save as draft
              </button>
              <button
                className="btn btn-primary"
                onClick={() => save(STATUS.pending_approval)}
                disabled={busy}
              >
                {busy ? "Sending…" : "Send for approval"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
