import { CONTENT_TYPES, PLATFORMS, MONTHS, DAY_NAMES, STATUS } from "../lib/constants";
import "./Calendar.css";

function buildGrid(year, month) {
  const firstDow  = new Date(year, month, 1).getDay();
  const dayCount  = new Date(year, month + 1, 0).getDate();
  const prevCount = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ day: prevCount - i, outside: true });
  }
  for (let d = 1; d <= dayCount; d++) {
    cells.push({ day: d, outside: false });
  }
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: trailing++, outside: true });
  }
  return cells;
}

function dayOf(post) {
  const d = post.scheduledFor?.toDate?.() ?? new Date(post.scheduledFor);
  return d.getDate();
}

// One post fills the cell. Two or more stack as bars.
function Cell({ cell, posts, isToday, isAdmin, onDay, onPost, monthName }) {
  const single = posts.length === 1 ? posts[0] : null;
  const type   = single && CONTENT_TYPES[single.contentType];
  const filled = Boolean(single);

  const label = posts.length === 0
    ? `${monthName} ${cell.day}. Nothing scheduled.`
    : `${monthName} ${cell.day}. ${posts.length} post${posts.length > 1 ? "s" : ""}.`;

  const clickable = !cell.outside && (posts.length > 0 || isAdmin);

  const handle = () => {
    if (cell.outside) return;
    if (posts.length === 1) onPost(posts[0]);
    else if (posts.length > 1) onDay(cell.day);
    else if (isAdmin) onDay(cell.day);
  };

  return (
    <button
      className={[
        "cal-cell",
        cell.outside && "is-outside",
        filled && "is-filled",
        isToday && "is-today",
        !clickable && "is-inert",
      ].filter(Boolean).join(" ")}
      style={filled ? { background: type.color } : undefined}
      onClick={handle}
      disabled={!clickable}
      aria-label={label}
    >
      <span className="cal-num">{cell.day}</span>

      {single && (
        <>
          {single.status === STATUS.pending_approval && (
            <span className="cal-dot" aria-hidden="true" />
          )}
          <span className="cal-cap">{single.caption}</span>
          <span className="cal-chips">
            {single.format === "reel" && <span className="cal-chip cal-chip-reel">Reel</span>}
            {single.platforms?.map((p) => (
              <span key={p} className="cal-chip">{PLATFORMS[p]?.short}</span>
            ))}
          </span>
        </>
      )}

      {posts.length > 1 && (
        <span className="cal-stack">
          {posts.slice(0, 4).map((p) => (
            <span
              key={p.id}
              className="cal-bar"
              style={{ background: CONTENT_TYPES[p.contentType]?.color }}
            >
              {p.status === STATUS.pending_approval && (
                <span className="cal-bar-dot" aria-hidden="true" />
              )}
            </span>
          ))}
          {posts.length > 4 && (
            <span className="cal-more">+{posts.length - 4}</span>
          )}
        </span>
      )}
    </button>
  );
}

export default function Calendar({
  year,
  month,
  posts = [],
  isAdmin = false,
  onSelectDay = () => {},
  onSelectPost = () => {},
  onPrev,
  onNext,
  onToday,
}) {
  const cells = buildGrid(year, month);
  const now = new Date();
  const todayNum =
    now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null;

  const byDay = {};
  for (const p of posts) {
    const d = dayOf(p);
    (byDay[d] ||= []).push(p);
  }

  const pendingCount = posts.filter((p) => p.status === STATUS.pending_approval).length;

  return (
    <div className={`cal-panel${isAdmin ? " cal-admin" : ""}`}>
      <div className="cal-monthbar">
        <div>
          <p className="cal-year">{year}</p>
          <h2 className="cal-month">{MONTHS[month]}</h2>
        </div>
        <div className="cal-nav">
          <button className="cal-navbtn" onClick={onPrev} aria-label="Previous month">‹</button>
          <button className="cal-navbtn cal-navbtn-wide" onClick={onToday}>Today</button>
          <button className="cal-navbtn" onClick={onNext} aria-label="Next month">›</button>
        </div>
      </div>

      <div className="cal-body">
        <div className="cal-main">
          <div className="cal-dayrow" aria-hidden="true">
            {DAY_NAMES.map((d) => <span key={d}>{d}</span>)}
          </div>

          <div className="cal-grid" role="grid">
            {cells.map((cell, i) => (
              <Cell
                key={i}
                cell={cell}
                posts={cell.outside ? [] : (byDay[cell.day] || [])}
                isToday={!cell.outside && cell.day === todayNum}
                isAdmin={isAdmin}
                onDay={onSelectDay}
                onPost={onSelectPost}
                monthName={MONTHS[month]}
              />
            ))}
          </div>
        </div>

        <aside className="cal-side">
          {pendingCount > 0 && !isAdmin && (
            <div className="cal-card cal-card-alert">
              <h3>
                {pendingCount} post{pendingCount > 1 ? "s" : ""} need
                {pendingCount === 1 ? "s" : ""} you
              </h3>
              <p>Tap any square with a dot to read it and approve.</p>
            </div>
          )}

          <div className="cal-card">
            <h3>Content type</h3>
            <div className="cal-legend">
              {Object.entries(CONTENT_TYPES).map(([k, t]) => (
                <div key={k}>
                  <span className="cal-swatch" style={{ background: t.color }} />
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          <div className="cal-card">
            <h3>Platforms</h3>
            <div className="cal-plats">
              {Object.values(PLATFORMS).map((p) => (
                <span key={p.short} className="cal-plat">{p.label}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="cal-note">
        <strong>Note</strong>
        Every post carries the disclosures your jurisdiction requires and follows
        Utah Rule 7.1 on lawyer advertising. Nothing goes live without your approval.
      </div>
    </div>
  );
}
