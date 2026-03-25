export type TrainStatus = 'operational' | 'maintenance' | 'washing' | 'inspection' | 'fault';
export type TrackType = 'stabling' | 'maintenance' | 'washing' | 'inspection';
export type ConflictType = 'filo' | 'maintenance_access' | 'overloaded';

export interface Train {
  id: string;
  label: string;
  kmTotal: number;
  kmSinceLastPM: number;
  pmIntervalKm: number;
  status: TrainStatus;
  scheduledDeparture: string; // "HH:MM"
  assignedTrackId: string | null;
  positionInTrack: number; // 0 = front (exits first)
  dailyKmAvg: number;
  lastMaintenanceDate: string;
  nextMaintenanceKm: number;
}

export interface Track {
  id: string;
  label: string;
  type: TrackType;
  capacity: number;
  trainIds: string[]; // ordered front→back, index 0 = exits first
}

export interface Conflict {
  id: string;
  type: ConflictType;
  trainId: string;
  trackId: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface LaunchSlot {
  order: number;
  trainId: string;
  scheduledDeparture: string;
  deadMileage: number; // extra moves needed
  maneuvers: number;
  status: 'ready' | 'conflict' | 'pending';
}

export interface DepotState {
  trains: Record<string, Train>;
  tracks: Record<string, Track>;
  conflicts: Conflict[];
  launchQueue: LaunchSlot[];
  lastOptimized: string | null;
}