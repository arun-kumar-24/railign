'use client';
import { useDepot } from '../../lib/depot-context';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell
} from 'recharts';

export default function Analytics() {
  const { state } = useDepot();

  const trains = Object.values(state.trains).sort((a, b) => a.id.localeCompare(b.id));

  const kmData = trains.map(t => ({
    name: t.id,
    km: t.kmTotal,
    pm: Math.round((t.kmSinceLastPM / t.pmIntervalKm) * 100),
  }));

  const avgKm = Math.round(trains.reduce((s, t) => s + t.kmTotal, 0) / trains.length);
  const maxKm = Math.max(...trains.map(t => t.kmTotal));
  const minKm = Math.min(...trains.map(t => t.kmTotal));
  const spread = maxKm - minKm;
  const stdDev = Math.round(Math.sqrt(trains.reduce((s, t) => s + Math.pow(t.kmTotal - avgKm, 2), 0) / trains.length));

  const statusBreakdown = ['operational','maintenance','washing','inspection','fault'].map(s => ({
    name: s,
    count: trains.filter(t => t.status === s).length,
  }));

  const pmRiskTrains = trains.filter(t => (t.kmSinceLastPM / t.pmIntervalKm) > 0.8);

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h1 className="module-title">Analytics & Wear Leveling</h1>
          <p className="module-subtitle">Fleet mileage distribution, PM health, and asset lifecycle balance.</p>
        </div>
      </div>

      <div className="analytics-kpi-row">
        <div className="kpi-card">
          <div className="kpi-val">{avgKm.toLocaleString()}</div>
          <div className="kpi-lbl">Fleet avg km</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val">{spread.toLocaleString()}</div>
          <div className="kpi-lbl">km spread</div>
          <div className="kpi-sub">{spread < 10000 ? '✅ Balanced' : '⚠️ High spread'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val">±{stdDev.toLocaleString()}</div>
          <div className="kpi-lbl">Std deviation</div>
        </div>
        <div className="kpi-card accent-warn">
          <div className="kpi-val">{pmRiskTrains.length}</div>
          <div className="kpi-lbl">PM due soon (&gt;80%)</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card wide">
          <h3>Total km per Train <span className="chart-subtitle">— dashed line = fleet average</span></h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kmData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e1da" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'DM Mono' }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `${Number(v).toLocaleString()} km`} />
              <Bar dataKey="km" radius={[4,4,0,0]}>
                {kmData.map((entry, i) => (
                  <Cell key={i} fill={entry.km > avgKm + stdDev ? '#ef4444' : entry.km < avgKm - stdDev ? '#3b82f6' : '#1a3a5c'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card wide">
          <h3>PM Health % per Train <span className="chart-subtitle">— red = due soon</span></h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kmData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e1da" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'DM Mono' }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip formatter={(v) => `${Number(v)}%`} />
              <Bar dataKey="pm" radius={[4,4,0,0]}>
                {kmData.map((entry, i) => (
                  <Cell key={i} fill={entry.pm > 85 ? '#ef4444' : entry.pm > 60 ? '#f59e0b' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card half">
          <h3>Fleet Status Breakdown</h3>
          <div className="status-breakdown">
            {statusBreakdown.map(s => (
              <div key={s.name} className="breakdown-row">
                <span className={`status-label status-${s.name}`}>{s.name}</span>
                <div className="breakdown-bar-wrap">
                  <div className="breakdown-bar" style={{ width: `${(s.count / 25) * 100}%` }} />
                </div>
                <span className="breakdown-count">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card half">
          <h3>PM Due Soon</h3>
          {pmRiskTrains.length === 0 ? (
            <p className="no-risk">All trains within safe PM window.</p>
          ) : (
            <div className="pm-risk-list">
              {pmRiskTrains.map(t => {
                const pct = Math.round((t.kmSinceLastPM / t.pmIntervalKm) * 100);
                const remaining = t.pmIntervalKm - t.kmSinceLastPM;
                return (
                  <div key={t.id} className="pm-risk-row">
                    <span className="train-id-cell">{t.id}</span>
                    <div className="pm-bar-full">
                      <div className="pm-fill" style={{ width: `${pct}%`, background: pct > 95 ? '#ef4444' : '#f59e0b' }} />
                    </div>
                    <span className="pm-rem">{remaining} km left</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}