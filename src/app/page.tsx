'use client';
import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import DepotMap from '../components/modules/DepotMap';
import FleetManager from '../components/modules/FleetManager';
import LaunchSequencer from '../components/modules/LaunchSequencer';
import Analytics from '../components/modules/Analytics';

export default function Home() {
  const [activeModule, setActiveModule] = useState('depot');

  return (
    <div className="app-shell">
      <Sidebar active={activeModule} setActive={setActiveModule} />
      <main className="main-content">
        {activeModule === 'depot'     && <DepotMap />}
        {activeModule === 'fleet'     && <FleetManager />}
        {activeModule === 'launch'    && <LaunchSequencer />}
        {activeModule === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}