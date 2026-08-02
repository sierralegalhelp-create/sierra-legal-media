import { useState, useEffect } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { watchStats } from "../lib/data";
import { PLATFORMS } from "../lib/constants";
import "./Stats.css";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtNum(n) {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function shortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="stat-tip">
      <span className="stat-tip-date">{shortDate(label)}</span>
      <span className="stat-tip-val">{fmtNum(payload[0].value)}</span>
    </div>
  );
}

function PlatformStats({ platform, data }) {
  if (data?.error) {
    return (
      <div className="card empty">
        <h3>Couldn't load {PLATFORMS[platform]?.label}</h3>
        <p>We'll try again on the next nightly refresh. If it keeps happening, the account may need reconnecting.</p>
      </div>
    );
  }

  const totals = data?.totals ?? {};
  const reach = data?.reach ?? [];
  const engagement = data?.engagement ?? [];

  return (
    <div className="stat-platform">
      {data?.sample && (
        <p className="stat-sample">
          Sample numbers — live {PLATFORMS[platform]?.label} data appears once the account is connected.
        </p>
      )}

      <div className="stat-summary">
        <div className="stat-kpi">
          <span className="stat-kpi-n">{fmtNum(totals.reach)}</span>
          <span className="stat-kpi-l">People reached</span>
        </div>
        <div className="stat-kpi">
          <span className="stat-kpi-n">{fmtNum(totals.engagement)}</span>
          <span className="stat-kpi-l">Likes, comments, shares</span>
        </div>
        <div className="stat-kpi">
          <span className="stat-kpi-n">{fmtNum(data?.followers)}</span>
          <span className="stat-kpi-l">Followers</span>
        </div>
        <div className="stat-kpi">
          <span className="stat-kpi-n">
            {totals.newFollowers >= 0 ? "+" : ""}{fmtNum(totals.newFollowers)}
          </span>
          <span className="stat-kpi-l">New this month</span>
        </div>
      </div>

      <div className="stat-chart card">
        <h3>Reach, last 30 days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={reach} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={`fill-${platform}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4EC9E8" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#4EC9E8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#EAE3D7" vertical={false} />
            <XAxis
              dataKey="date" tickFormatter={shortDate}
              tick={{ fontSize: 10.5, fill: "#A29889" }}
              interval={6} axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={fmtNum}
              tick={{ fontSize: 10.5, fill: "#A29889" }}
              axisLine={false} tickLine={false} width={44}
            />
            <Tooltip content={<ChartTip />} />
            <Area
              type="monotone" dataKey="value"
              stroke="#2FA8CC" strokeWidth={2}
              fill={`url(#fill-${platform})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="stat-chart card">
        <h3>Engagement, last 30 days</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={engagement} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#EAE3D7" vertical={false} />
            <XAxis
              dataKey="date" tickFormatter={shortDate}
              tick={{ fontSize: 10.5, fill: "#A29889" }}
              interval={6} axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={fmtNum}
              tick={{ fontSize: 10.5, fill: "#A29889" }}
              axisLine={false} tickLine={false} width={44}
            />
            <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(28,26,23,0.04)" }} />
            <Bar dataKey="value" fill="#E8A24E" radius={[3, 3, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Stats({ clientUid, platforms = [] }) {
  const [stats, setStats] = useState(undefined); // undefined = loading, null = none
  const [active, setActive] = useState(platforms[0] ?? null);

  useEffect(() => {
    if (!clientUid) return;
    return watchStats(clientUid, thisMonth(), setStats);
  }, [clientUid]);

  useEffect(() => {
    if (!active && platforms.length) setActive(platforms[0]);
  }, [platforms, active]);

  if (platforms.length === 0) {
    return (
      <div className="card empty">
        <h3>No platforms yet</h3>
        <p>Once your accounts are connected, this is where you'll see how each one is doing.</p>
      </div>
    );
  }

  if (stats === undefined) {
    return <div className="stat-loading"><div className="spinner" /></div>;
  }

  const data = stats?.platforms?.[active];

  return (
    <div className="stats">
      <div className="stat-wip">
        <strong>Work in progress</strong>
        <p>
          These are sample numbers so you can see the shape of it. Instagram,
          Facebook, and LinkedIn each have to approve our app before we can pull
          your real figures — that review is underway. Everything else works
          normally in the meantime.
        </p>
      </div>

      {platforms.length > 1 && (
        <div className="stat-switch">
          {platforms.map((p) => (
            <button
              key={p}
              className={`stat-tab${active === p ? " is-on" : ""}`}
              onClick={() => setActive(p)}
            >
              {PLATFORMS[p]?.label ?? p}
            </button>
          ))}
        </div>
      )}

      {data ? (
        <PlatformStats platform={active} data={data} />
      ) : (
        <div className="card empty">
          <h3>Nothing here yet</h3>
          <p>The first numbers land after tonight's refresh.</p>
        </div>
      )}
    </div>
  );
}
