import { DepotState, Train, Track, Conflict, LaunchSlot } from '../types';

const DEPARTURE_TIMES = [
  '05:00','05:12','05:24','05:36','05:48',
  '06:00','06:12','06:24','06:36','06:48',
  '07:00','07:12','07:24','07:36','07:48',
  '08:00','08:12','08:24','08:36','08:48',
  '09:00','09:12','09:24','09:36','09:48',
];

const STATUSES: Train['status'][] = [
  'operational','operational','operational','operational',
  'operational','operational','operational','operational',
  'maintenance','washing','inspection','operational','operational',
  'operational','operational','operational','fault','operational',
  'operational','operational','operational','operational',
  'washing','operational','operational',
];

export function generateInitialState(): DepotState {
  const trains: Record<string, Train> = {};
  const trackCapacities = [6, 6, 5, 5, 3]; // 5 tracks

  for (let i = 0; i < 25; i++) {
    const id = `T${String(i + 1).padStart(2, '0')}`;
    const kmTotal = 40000 + Math.floor(Math.random() * 60000);
    const pmInterval = 5000;
    const kmSincePM = Math.floor(Math.random() * pmInterval);
    trains[id] = {
      id,
      label: id,
      kmTotal,
      kmSinceLastPM: kmSincePM,
      pmIntervalKm: pmInterval,
      status: STATUSES[i],
      scheduledDeparture: DEPARTURE_TIMES[i],
      assignedTrackId: null,
      positionInTrack: 0,
      dailyKmAvg: 180 + Math.floor(Math.random() * 120),
      lastMaintenanceDate: '2025-03-01',
      nextMaintenanceKm: kmTotal - kmSincePM + pmInterval,
    };
  }

  const trackDefs: Omit<Track, 'trainIds'>[] = [
    { id: 'TRK-A', label: 'Track A', type: 'stabling', capacity: 6 },
    { id: 'TRK-B', label: 'Track B', type: 'stabling', capacity: 6 },
    { id: 'TRK-C', label: 'Track C', type: 'stabling', capacity: 5 },
    { id: 'TRK-D', label: 'Track D (Maint.)', type: 'maintenance', capacity: 5 },
    { id: 'TRK-E', label: 'Track E (Wash)', type: 'washing', capacity: 3 },
  ];

  const tracks: Record<string, Track> = {};
  for (const def of trackDefs) {
    tracks[def.id] = { ...def, trainIds: [] };
  }

  // Assign trains to tracks in a shuffled (non-optimal) way
  const trainIds = Object.keys(trains);
  let tIdx = 0;
  for (const track of Object.values(tracks)) {
    while (track.trainIds.length < track.capacity && tIdx < trainIds.length) {
      const trainId = trainIds[tIdx];
      track.trainIds.push(trainId);
      trains[trainId].assignedTrackId = track.id;
      trains[trainId].positionInTrack = track.trainIds.length - 1;
      tIdx++;
    }
  }

  const state: DepotState = {
    trains,
    tracks,
    conflicts: [],
    launchQueue: [],
    lastOptimized: null,
  };

  state.conflicts = detectConflicts(state);
  state.launchQueue = buildLaunchQueue(state);

  return state;
}

export function detectConflicts(state: DepotState): Conflict[] {
  const conflicts: Conflict[] = [];
  let cIdx = 0;

  for (const track of Object.values(state.tracks)) {
    if (track.type !== 'stabling') continue;

    for (let i = 0; i < track.trainIds.length - 1; i++) {
      const frontTrain = state.trains[track.trainIds[i]];
      const backTrain = state.trains[track.trainIds[i + 1]];
      if (!frontTrain || !backTrain) continue;

      // FILO conflict: back train departs earlier than front train
      if (backTrain.scheduledDeparture < frontTrain.scheduledDeparture) {
        conflicts.push({
          id: `C${cIdx++}`,
          type: 'filo',
          trainId: backTrain.id,
          trackId: track.id,
          message: `${backTrain.id} (${backTrain.scheduledDeparture}) is behind ${frontTrain.id} (${frontTrain.scheduledDeparture}) on ${track.label}`,
          severity: 'high',
        });
      }
    }

    // Overloaded
    if (track.trainIds.length > track.capacity) {
      conflicts.push({
        id: `C${cIdx++}`,
        type: 'overloaded',
        trainId: track.trainIds[0],
        trackId: track.id,
        message: `${track.label} exceeds capacity (${track.trainIds.length}/${track.capacity})`,
        severity: 'medium',
      });
    }
  }

  // Maintenance access conflict
  for (const train of Object.values(state.trains)) {
    if ((train.status === 'maintenance' || train.status === 'inspection' || train.status === 'washing') &&
        train.assignedTrackId) {
      const track = state.tracks[train.assignedTrackId];
      if (track && track.type === 'stabling') {
        conflicts.push({
          id: `C${cIdx++}`,
          type: 'maintenance_access',
          trainId: train.id,
          trackId: track.id,
          message: `${train.id} needs ${train.status} but is on stabling track ${track.label}`,
          severity: 'medium',
        });
      }
    }
  }

  return conflicts;
}

export function buildLaunchQueue(state: DepotState): LaunchSlot[] {
  const allTrains = Object.values(state.trains)
    .filter(t => t.status !== 'fault')
    .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture));

  return allTrains.map((train, idx) => {
    const track = train.assignedTrackId ? state.tracks[train.assignedTrackId] : null;
    const position = track ? track.trainIds.indexOf(train.id) : 0;
    const deadMileage = position * 0.3; // each blocked train = 0.3 km extra
    const maneuvers = position;
    const hasConflict = state.conflicts.some(c => c.trainId === train.id);

    return {
      order: idx + 1,
      trainId: train.id,
      scheduledDeparture: train.scheduledDeparture,
      deadMileage: parseFloat(deadMileage.toFixed(1)),
      maneuvers,
      status: hasConflict ? 'conflict' : maneuvers === 0 ? 'ready' : 'pending',
    };
  });
}

export function optimizeStabling(state: DepotState): DepotState {
  const newState = JSON.parse(JSON.stringify(state)) as DepotState;

  // Clear all track assignments
  for (const track of Object.values(newState.tracks)) {
    track.trainIds = [];
  }

  const allTrains = Object.values(newState.trains);

  // Route maintenance/wash/inspection trains to their correct tracks
  const maintenanceTrains = allTrains.filter(t => t.status === 'maintenance' || t.status === 'inspection');
  const washingTrains = allTrains.filter(t => t.status === 'washing');
  const faultTrains = allTrains.filter(t => t.status === 'fault');
  const operationalTrains = allTrains
    .filter(t => t.status === 'operational')
    .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture));

  const maintTrack = newState.tracks['TRK-D'];
  const washTrack = newState.tracks['TRK-E'];
  const stablingTracks = [newState.tracks['TRK-A'], newState.tracks['TRK-B'], newState.tracks['TRK-C']];

  // Assign maintenance trains
  for (const t of [...maintenanceTrains, ...faultTrains]) {
    if (maintTrack.trainIds.length < maintTrack.capacity) {
      maintTrack.trainIds.push(t.id);
      newState.trains[t.id].assignedTrackId = maintTrack.id;
    }
  }

  // Assign washing trains
  for (const t of washingTrains) {
    if (washTrack.trainIds.length < washTrack.capacity) {
      washTrack.trainIds.push(t.id);
      newState.trains[t.id].assignedTrackId = washTrack.id;
    }
  }

  // Assign operational trains to stabling tracks in departure-time order
  // Earlier departures go at the FRONT (index 0) of each track
  let opIdx = 0;
  for (const track of stablingTracks) {
    while (track.trainIds.length < track.capacity && opIdx < operationalTrains.length) {
      const t = operationalTrains[opIdx];
      track.trainIds.push(t.id);
      newState.trains[t.id].assignedTrackId = track.id;
      newState.trains[t.id].positionInTrack = track.trainIds.length - 1;
      opIdx++;
    }
  }

  // Re-run conflict detection and launch queue
  newState.conflicts = detectConflicts(newState);
  newState.launchQueue = buildLaunchQueue(newState);
  newState.lastOptimized = new Date().toLocaleTimeString();

  return newState;
}

export function addKmToTrain(state: DepotState, trainId: string, km: number): DepotState {
  const newState = JSON.parse(JSON.stringify(state)) as DepotState;
  const train = newState.trains[trainId];
  if (!train) return state;
  train.kmTotal += km;
  train.kmSinceLastPM += km;
  if (train.kmSinceLastPM >= train.pmIntervalKm) {
    train.status = 'maintenance';
    train.kmSinceLastPM = train.kmSinceLastPM % train.pmIntervalKm;
  }
  newState.conflicts = detectConflicts(newState);
  newState.launchQueue = buildLaunchQueue(newState);
  return newState;
}

export function moveTrain(state: DepotState, trainId: string, toTrackId: string): DepotState {
  const newState = JSON.parse(JSON.stringify(state)) as DepotState;
  const train = newState.trains[trainId];
  if (!train) return state;

  // Remove from old track
  if (train.assignedTrackId) {
    const oldTrack = newState.tracks[train.assignedTrackId];
    if (oldTrack) {
      oldTrack.trainIds = oldTrack.trainIds.filter(id => id !== trainId);
    }
  }

  // Add to new track
  const newTrack = newState.tracks[toTrackId];
  if (!newTrack || newTrack.trainIds.length >= newTrack.capacity) return state;
  newTrack.trainIds.push(trainId);
  train.assignedTrackId = toTrackId;
  train.positionInTrack = newTrack.trainIds.length - 1;

  newState.conflicts = detectConflicts(newState);
  newState.launchQueue = buildLaunchQueue(newState);
  return newState;
}