'use client';
import { useState } from 'react';
import { Train, Map, ListOrdered, BarChart2, Settings, AlertTriangle, ChevronRight } from 'lucide-react';
import { useDepot } from '../../lib/depot-context';

const NAV = [
  { id: 'depot',     label: 'Depot Map',       icon: Map },
  { id: 'fleet',     label: 'Fleet Manager',   icon: Train },
  { id: 'launch',    label: 'Launch Sequencer',icon: ListOrdered },
  { id: 'analytics', label: 'Analytics',       icon: BarChart2 },
];

export default function Sidebar({ active, setActive }: { active: string; setActive: (s: string) => void }) {
  const { state, dispatch } = useDepot();
  const conflictCount = state.conflicts.length;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">🚇</div>
        <div>
          <div className="brand-name">DepotOS</div>
          <div className="brand-sub">Stabling Optimizer</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${active === id ? 'active' : ''}`}
            onClick={() => setActive(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {id === 'depot' && conflictCount > 0 && (
              <span className="nav-badge">{conflictCount}</span>
            )}
            <ChevronRight size={14} className="nav-arrow" />
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="depot-stats">
          <div className="stat-row">
            <span>Fleet</span><strong>25 trains</strong>
          </div>
          <div className="stat-row">
            <span>Conflicts</span>
            <strong style={{ color: conflictCount > 0 ? 'var(--red)' : 'var(--green)' }}>
              {conflictCount}
            </strong>
          </div>
          <div className="stat-row">
            <span>Optimized</span>
            <strong>{state.lastOptimized ?? 'Never'}</strong>
          </div>
        </div>
        <button className="btn-optimize" onClick={() => dispatch({ type: 'OPTIMIZE' })}>
          ⚡ Run Optimizer
        </button>
        <button className="btn-reset" onClick={() => dispatch({ type: 'RESET' })}>
          Reset Depot
        </button>
      </div>
    </aside>
  );
}