'use client';
import { useState } from 'react';
import { useDepot } from '../../lib/depot-context';
import { Train } from '../../types';

const STATUS_OPTIONS: Train['status'][] = ['operational','maintenance','washing','inspection','fault'];

export default function FleetManager() {
  const { state, dispatch } = useDepot();
  const [sortBy, setSortBy] = useState<'id' | 'km' | 'pm' | 'departure'>('id');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const trains = Object.values(state.trains)
    .filter(t => filterStatus === 'all' || t.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'id') return a.id.localeCompare(b.id);
      if (sortBy === 'km') return b.kmTotal - a.kmTotal;
      if (sortBy === 'pm') return (b.kmSinceLastPM / b.pmIntervalKm) - (a.kmSinceLastPM / a.pmIntervalKm);
      if (sortBy === 'departure') return a.scheduledDeparture.localeCompare(b.scheduledDeparture);
      return 0;
    });

  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = Object.values(state.trains).filter(t => t.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const avgKm = Math.round(Object.values(state.trains).reduce((s, t) => s + t.kmTotal, 0) / 25);
  const maxKm = Math.max(...Object.values(state.trains).map(t => t.kmTotal));
  const minKm = Math.min(...Object.values(state.trains).map(t => t.kmTotal));

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h1 className="module-title">Fleet Manager</h1>
          <p className="module-subtitle">Monitor all 25 trains — mileage, status, PM health.</p>
        </div>
      </div>

      <div className="fleet-summary-cards">
        <div className="summary-card">
          <div className="summary-val">{avgKm.toLocaleString()}</div>
          <div className="summary-lbl">Avg km / train</div>
        </div>
        <div className="summary-card">
          <div className="summary-val">{(maxKm - minKm).toLocaleString()}</div>
          <div className="summary-lbl">km spread (wear gap)</div>
        </div>
        <div className="summary-card accent-red">
          <div className="summary-val">{statusCounts.maintenance + statusCounts.fault}</div>
          <div className="summary-lbl">Need attention</div>
        </div>
        <div className="summary-card accent-blue">
          <div className="summary-val">{statusCounts.operational}</div>
          <div className="summary-lbl">Operational</div>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="filter-pills">
          {['all', ...STATUS_OPTIONS].map(s => (
            <button
              key={s}
              className={`pill ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s} {s !== 'all' && `(${statusCounts[s] ?? 0})`}
            </button>
          ))}
        </div>
        <div className="sort-row">
          <span>Sort:</span>
          {(['id','km','pm','departure'] as const).map(s => (
            <button key={s} className={`sort-btn ${sortBy === s ? 'active' : ''}`} onClick={() => setSortBy(s)}>
              {s === 'pm' ? 'PM health' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="fleet-table-wrap">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Train</th>
              <th>Status</th>
              <th>Track</th>
              <th>Departure</th>
              <th>Total km</th>
              <th>PM health</th>
              <th>Daily avg km</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trains.map(train => {
              const pmPct = Math.round((train.kmSinceLastPM / train.pmIntervalKm) * 100);
              const track = train.assignedTrackId ? state.tracks[train.assignedTrackId] : null;
              return (
                <tr key={train.id}>
                  <td><span className="train-id-cell">{train.id}</span></td>
                  <td>
                    <select
                      className={`status-select status-${train.status}`}
                      value={train.status}
                      onChange={e => dispatch({ type: 'SET_STATUS', trainId: train.id, status: e.target.value as Train['status'] })}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{track?.label ?? '—'}</td>
                  <td className="mono">{train.scheduledDeparture}</td>
                  <td className="mono">{train.kmTotal.toLocaleString()} km</td>
                  <td>
                    <div className="pm-cell">
                      <div className="pm-bar-table">
                        <div className="pm-fill" style={{
                          width: `${pmPct}%`,
                          background: pmPct > 85 ? '#ef4444' : pmPct > 60 ? '#f59e0b' : '#22c55e'
                        }} />
                      </div>
                      <span className={`pm-pct ${pmPct > 85 ? 'danger' : ''}`}>{pmPct}%</span>
                    </div>
                  </td>
                  <td className="mono">{train.dailyKmAvg} km/day</td>
                  <td>
                    <button className="btn-sm" onClick={() => dispatch({ type: 'ADD_KM', trainId: train.id, km: train.dailyKmAvg })}>
                      +{train.dailyKmAvg}km
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}