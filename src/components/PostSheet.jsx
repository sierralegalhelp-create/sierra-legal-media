import { useState, useEffect } from "react";
import { CONTENT_TYPES, PLATFORMS, STATUS, STATUS_LABEL } from "../lib/constants";
import { approvePost, requestChanges, notifySierra } from "../lib/data";
import PlatformPreview from "./PlatformPreview";
import "./PostSheet.css";

const PILL_CLASS = {
  draft: "pill-draft",
  pending_approval: "pill-pending",
  approved: "pill-approved",
  changes_requested: "pill-changes",
  published: "pill-published",
};

function fmtDate(ts) {
  const d = ts?.toDate?.() ?? new Date(ts);
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}
function fmtTime(ts) {
  const d = ts?.toDate?.() ?? new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function PostSheet({ post, clientUid, isAdmin, firmName, onClose, onEdit }) {
  const [mode, setMode]   = useState("view"); // view | changes
  const [note, setNote]   = useState("");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!post) return null;

  const type = CONTENT_TYPES[post.contentType];
  const waiting = post.status === STATUS.pending_approval;

  async function doApprove() {
    setBusy(true); setErr("");
    try {
      await approvePost(clientUid, post.id);
      notifySierra("post_approved", firmName);
      onClose();
    } catch {
      setErr("That didn't save. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function doRequestChanges() {
    if (!note.trim()) {
      setErr("Tell Sierra what to change.");
      return;
    }
    setBusy(true); setErr("");
    try {
      await requestChanges(clientUid, post.id, note.trim());
      notifySierra("changes_requested", firmName);
      onClose();
    } catch {
      setErr("That didn't save. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Post details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-swatch" style={{ background: type?.color }} />

        <div className="sheet-inner">
          <div className="sheet-top">
            <div>
              <p className="sheet-type">{type?.label}</p>
              <h2 className="sheet-date">{fmtDate(post.scheduledFor)}</h2>
              <p className="sheet-time">Posting at {fmtTime(post.scheduledFor)}</p>
            </div>
            <button className="btn-quiet sheet-x" onClick={onClose} aria-label="Close">✕</button>
          </div>

          <div className="sheet-meta">
            <span className={`pill ${PILL_CLASS[post.status]}`}>
              {STATUS_LABEL[post.status]}
            </span>
            {post.platforms?.map((p) => (
              <span key={p} className="sheet-plat">{PLATFORMS[p]?.label}</span>
            ))}
          </div>

          <PlatformPreview post={post} firmName={firmName} />

          {post.clientNote && (
            <div className="sheet-note">
              <strong>Your note to Sierra</strong>
              <p>{post.clientNote}</p>
            </div>
          )}

          {err && <p className="sheet-err">{err}</p>}

          {/* ── Client actions ── */}
          {!isAdmin && waiting && mode === "view" && (
            <div className="sheet-actions">
              <button className="btn btn-primary btn-full" onClick={doApprove} disabled={busy}>
                {busy ? "Approving…" : "Approve this post"}
              </button>
              <button
                className="btn btn-secondary btn-full"
                onClick={() => { setMode("changes"); setErr(""); }}
                disabled={busy}
              >
                Ask for a change
              </button>
            </div>
          )}

          {!isAdmin && waiting && mode === "changes" && (
            <div className="sheet-actions">
              <label className="field">
                <span>What should change?</span>
                <textarea
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Swap the photo, soften the last line, move it to Thursday…"
                />
              </label>
              <button className="btn btn-primary btn-full" onClick={doRequestChanges} disabled={busy}>
                {busy ? "Sending…" : "Send to Sierra"}
              </button>
              <button
                className="btn btn-quiet btn-full"
                onClick={() => { setMode("view"); setErr(""); }}
                disabled={busy}
              >
                Never mind
              </button>
            </div>
          )}

          {!isAdmin && !waiting && (
            <p className="sheet-passive">
              {post.status === STATUS.approved && "You approved this. It'll go out on schedule."}
              {post.status === STATUS.changes_requested && "Sierra is working on your changes."}
              {post.status === STATUS.published && "This one is live."}
            </p>
          )}

          {/* ── Admin actions ── */}
          {isAdmin && (
            <div className="sheet-actions">
              <button className="btn btn-primary btn-full" onClick={() => onEdit(post)}>
                Edit this post
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
