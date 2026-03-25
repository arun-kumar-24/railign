'use client';
import { useState } from 'react';
import { useDepot } from '../../lib/depot-context';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  operational: '#166534',
  maintenance: '#b45309',
  washing: '#1d4ed8',
  inspection: '#7c3aed',
  fault: '#991b1b',
};

const STATUS_BG: Record<string, string> = {
  operational: '#dcfce7',
  maintenance: '#fef3c7',
  washing: '#dbeafe',
  inspection: '#ede9fe',
  fault: '#fee2e2',
};

export default function DepotMap() {
  const { state, dispatch } = useDepot();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const conflictTrainIds = new Set(state.conflicts.map(c => c.trainId));

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h1 className="module-title">Depot Map</h1>
          <p className="module-subtitle">Drag trains between tracks to re-position. Conflicts highlighted in red.</p>
        </div>
        <div className="header-actions">
          {state.conflicts.length > 0 ? (
            <div className="conflict-badge">
              <AlertTriangle size={14} /> {state.conflicts.length} conflicts
            </div>
          ) : (
            <div className="ok-badge">
              <CheckCircle size={14} /> No conflicts
            </div>
          )}
        </div>
      </div>

      <div className="depot-map-grid">
        {Object.values(state.tracks).map(track => (
          <div
            key={track.id}
            className={`track-lane ${dragOver === track.id ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(track.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => {
              if (dragging) dispatch({ type: 'MOVE_TRAIN', trainId: dragging, toTrackId: track.id });
              setDragging(null); setDragOver(null);
            }}
          >
            <div className="track-header">
              <div className="track-label-row">
                <span className={`track-type-dot type-${track.type}`}></span>
                <strong>{track.label}</strong>
              </div>
              <span className="track-capacity">{track.trainIds.length}/{track.capacity}</span>
            </div>

            <div className="track-rail">
              <div className="rail-line" />
              <div className="train-row">
                {track.trainIds.map((trainId, pos) => {
                  const train = state.trains[trainId];
                  if (!train) return null;
                  const hasConflict = conflictTrainIds.has(trainId);
                  const pmPct = Math.round((train.kmSinceLastPM / train.pmIntervalKm) * 100);

                  return (
                    <div
                      key={trainId}
                      className={`train-card ${hasConflict ? 'conflict' : ''} ${dragging === trainId ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => setDragging(trainId)}
                      onDragEnd={() => setDragging(null)}
                      title={`${train.id} — Departs ${train.scheduledDeparture} — ${train.status}`}
                    >
                      <div className="train-card-top">
                        <span className="train-id">{train.id}</span>
                        {pos === 0 && <span className="exit-arrow">→</span>}
                      </div>
                      <div
                        className="train-status-dot"
                        style={{ background: STATUS_BG[train.status], color: STATUS_COLOR[train.status] }}
                      >
                        {train.status.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="train-depart">{train.scheduledDeparture}</div>
                      <div className="pm-bar">
                        <div className="pm-fill" style={{
                          width: `${pmPct}%`,
                          background: pmPct > 85 ? '#ef4444' : pmPct > 60 ? '#f59e0b' : '#22c55e'
                        }} />
                      </div>
                    </div>
                  );
                })}
                {Array.from({ length: track.capacity - track.trainIds.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="train-card empty">
                    <span className="empty-label">Empty</span>
                  </div>
                ))}
              </div>
              <div className="track-exit-label">← EXIT</div>
            </div>
          </div>
        ))}
      </div>

      <div className="conflict-list">
        <h3>Active Conflicts</h3>
        {state.conflicts.length === 0 ? (
          <p className="no-conflicts">All clear — no stabling conflicts detected.</p>
        ) : (
          <div className="conflicts-grid">
            {state.conflicts.map(c => (
              <div key={c.id} className={`conflict-item sev-${c.severity}`}>
                <span className={`sev-badge ${c.severity}`}>{c.severity}</span>
                <span className="conflict-msg">{c.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}