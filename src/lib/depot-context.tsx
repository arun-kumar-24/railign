'use client';
import { createContext, useContext, useReducer, ReactNode } from 'react';
import { DepotState, Train } from '../types';
import { generateInitialState, optimizeStabling, addKmToTrain, moveTrain } from './depot-data';

type Action =
  | { type: 'OPTIMIZE' }
  | { type: 'ADD_KM'; trainId: string; km: number }
  | { type: 'MOVE_TRAIN'; trainId: string; toTrackId: string }
  | { type: 'SET_STATUS'; trainId: string; status: Train['status'] }
  | { type: 'RESET' };

function reducer(state: DepotState, action: Action): DepotState {
  switch (action.type) {
    case 'OPTIMIZE': return optimizeStabling(state);
    case 'ADD_KM': return addKmToTrain(state, action.trainId, action.km);
    case 'MOVE_TRAIN': return moveTrain(state, action.trainId, action.toTrackId);
    case 'SET_STATUS': {
      const newState = JSON.parse(JSON.stringify(state)) as DepotState;
      newState.trains[action.trainId].status = action.status;
      return newState;
    }
    case 'RESET': return generateInitialState();
    default: return state;
  }
}

const DepotContext = createContext<{
  state: DepotState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function DepotProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, generateInitialState);
  return <DepotContext.Provider value={{ state, dispatch }}>{children}</DepotContext.Provider>;
}

export function useDepot() {
  const ctx = useContext(DepotContext);
  if (!ctx) throw new Error('useDepot must be used within DepotProvider');
  return ctx;
}