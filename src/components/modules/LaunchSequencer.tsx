'use client';
import { useDepot } from '../../lib/depot-context';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function LaunchSequencer() {
  const { state, dispatch } = useDepot();
  const { launchQueue } = state;

  const totalDeadMileage = launchQueue.reduce((s, l) => s + l.deadMileage, 0);
  const totalManeuvers = launchQueue.reduce((s, l) => s + l.maneuvers, 0);
  const readyCount = launchQueue.filter(l => l.status === 'ready').length;
  const conflictCount = launchQueue.filter(l => l.status === 'conflict').length;

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h1 className="module-title">Launch Sequencer</h1>
          <p className="module-subtitle">Morning rollout order for all 25 trains by departure time.</p>
        </div>
        <button className="btn-primary" onClick={() => dispatch({ type: 'OPTIMIZE' })}>
          ⚡ Optimize Sequence
        </button>
      </div>

      <div className="launch-summary">
        <div className="launch-stat">
          <div className="launch-stat-val green">{readyCount}</div>
          <div className="launch-stat-lbl">Ready (0 maneuvers)</div>
        </div>
        <div className="launch-stat">
          <div className="launch-stat-val orange">{launchQueue.filter(l => l.status === 'pending').length}</div>
          <div className="launch-stat-lbl">Need shunting</div>
        </div>
        <div className="launch-stat">
          <div className="launch-stat-val red">{conflictCount}</div>
          <div className="launch-stat-lbl">FILO conflicts</div>
        </div>
        <div className="launch-stat">
          <div className="launch-stat-val">{totalDeadMileage.toFixed(1)} km</div>
          <div className="launch-stat-lbl">Total dead mileage</div>
        </div>
        <div className="launch-stat">
          <div className="launch-stat-val">{totalManeuvers}</div>
          <div className="launch-stat-lbl">Total maneuvers</div>
        </div>
      </div>

      <div className="launch-list">
        {launchQueue.map(slot => {
          const train = state.trains[slot.trainId];
          if (!train) return null;
          const track = train.assignedTrackId ? state.tracks[train.assignedTrackId] : null;

          return (
            <div key={slot.trainId} className={`launch-row status-${slot.status}`}>
              <div className="launch-order">{String(slot.order).padStart(2, '0')}</div>
              <div className="launch-time">
                <Clock size={12} />
                {slot.scheduledDeparture}
              </div>
              <div className="launch-train">{slot.trainId}</div>
              <div className="launch-track">{track?.label ?? '—'}</div>
              <div className="launch-maneuvers">
                {slot.maneuvers === 0
                  ? <span className="maneuver-ok">Front of track</span>
                  : <span className="maneuver-warn">{slot.maneuvers} move{slot.maneuvers > 1 ? 's' : ''} needed</span>
                }
              </div>
              <div className="launch-dead">{slot.deadMileage > 0 ? `+${slot.deadMileage} km` : '—'}</div>
              <div className="launch-status-icon">
                {slot.status === 'ready' && <CheckCircle size={16} color="#16a34a" />}
                {slot.status === 'conflict' && <AlertTriangle size={16} color="#dc2626" />}
                {slot.status === 'pending' && <Clock size={16} color="#d97706" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}