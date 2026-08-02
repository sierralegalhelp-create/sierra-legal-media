import { useState } from "react";
import { CONTENT_TYPES, PLATFORMS } from "../lib/constants";
import "./PlatformPreview.css";

function fmtDay(ts) {
  const d = ts?.toDate?.() ?? new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Media({ post, ratio }) {
  const type = CONTENT_TYPES[post.contentType];
  const [failed, setFailed] = useState(false);

  if (post.mediaUrl && !failed) {
    return (
      <div className="pp-media" style={{ aspectRatio: ratio }}>
        <img src={post.mediaUrl} alt="" onError={() => setFailed(true)} />
      </div>
    );
  }
  // No image yet, or the link didn't load — tinted stand-in so layout still reads.
  return (
    <div
      className="pp-media pp-media-empty"
      style={{ aspectRatio: ratio, background: `linear-gradient(135deg, ${type?.color}, ${type?.color}cc)` }}
    >
      <span>{failed ? "Image didn't load" : type?.label}</span>
    </div>
  );
}

function Instagram({ post, firmName }) {
  const handle = (firmName || "yourfirm").toLowerCase().replace(/[^a-z0-9]/g, "");
  const isReel = post.format === "reel";
  return (
    <div className="pp pp-ig">
      <div className="pp-ig-top">
        <div className="pp-ava" style={{ background: CONTENT_TYPES[post.contentType]?.color }}>
          {(firmName || "F").slice(0, 2).toUpperCase()}
        </div>
        <b>{handle}</b>
        {isReel && <span className="pp-badge">Reel</span>}
      </div>
      <Media post={post} ratio={isReel ? "9 / 16" : "1 / 1"} />
      <div className="pp-ig-actions"><span>♥</span><span>💬</span><span>➤</span></div>
      <div className="pp-ig-cap"><b>{handle}</b> {post.caption}</div>
      <div className="pp-ig-time">{fmtDay(post.scheduledFor)}</div>
    </div>
  );
}

function Facebook({ post, firmName }) {
  const isReel = post.format === "reel";
  return (
    <div className="pp pp-fb">
      <div className="pp-fb-top">
        <div className="pp-ava pp-ava-round" style={{ background: CONTENT_TYPES[post.contentType]?.color }}>
          {(firmName || "F").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <b>{firmName || "Your firm"}</b>
          <small>{fmtDay(post.scheduledFor)} · 🌐</small>
        </div>
        {isReel && <span className="pp-badge">Reel</span>}
      </div>
      <div className="pp-fb-cap">{post.caption}</div>
      <Media post={post} ratio={isReel ? "9 / 16" : "1.91 / 1"} />
      <div className="pp-fb-actions"><span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span></div>
    </div>
  );
}

function LinkedIn({ post, firmName }) {
  return (
    <div className="pp pp-li">
      <div className="pp-li-top">
        <div className="pp-ava pp-ava-round" style={{ background: CONTENT_TYPES[post.contentType]?.color }}>
          {(firmName || "F").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <b>{firmName || "Your firm"}</b>
          <small>Law Practice · {fmtDay(post.scheduledFor)}</small>
        </div>
      </div>
      <div className="pp-li-cap">{post.caption}</div>
      <Media post={post} ratio="1.91 / 1" />
      <div className="pp-li-actions"><span>👍 Like</span><span>💬 Comment</span><span>↻ Repost</span><span>➤ Send</span></div>
    </div>
  );
}

const RENDER = { instagram: Instagram, facebook: Facebook, linkedin: LinkedIn };

export default function PlatformPreview({ post, firmName }) {
  const platforms = (post.platforms || []).filter((p) => RENDER[p]);
  const [active, setActive] = useState(platforms[0]);

  if (platforms.length === 0) return null;

  const current = active && platforms.includes(active) ? active : platforms[0];
  const View = RENDER[current];

  return (
    <div className="pp-wrap">
      <div className="pp-head">
        <span className="pp-label">How it'll look</span>
        {platforms.length > 1 && (
          <div className="pp-tabs">
            {platforms.map((p) => (
              <button
                key={p}
                className={`pp-tab${current === p ? " is-on" : ""}`}
                onClick={() => setActive(p)}
              >
                {PLATFORMS[p]?.short}
              </button>
            ))}
          </div>
        )}
      </div>
      <View post={post} firmName={firmName} />
    </div>
  );
}
