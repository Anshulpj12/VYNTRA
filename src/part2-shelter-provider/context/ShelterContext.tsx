/**
 * VYNTRA Part 2 — Shelter Context (State Management)
 * 
 * Central state management for the shelter provider dashboard.
 * Uses React Context + useReducer pattern as specified in the architecture.
 * 
 * @module part2-shelter-provider/context/ShelterContext
 */

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type {
  ShelterProvider,
  ShelterMetadata,
  Occupant,
  Facility,
  InventoryItem,
} from '../../shared/types';
import { createDemoShelter } from '../mock-data/demo-shelter';

/* ─── State Shape ─── */
export interface ShelterState {
  /** Current shelter provider data (null if not registered) */
  shelter: ShelterProvider | null;
  /** Consolidated metadata */
  metadata: ShelterMetadata | null;
  /** Active occupants */
  occupants: Occupant[];
  /** All facilities */
  facilities: Facility[];
  /** All inventory items */
  inventory: InventoryItem[];
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Currently selected navigation tab */
  activeTab: ShelterTab;
}

/** Navigation tabs for the shelter dashboard */
export type ShelterTab =
  | 'registration'
  | 'dashboard'
  | 'beds'
  | 'facilities'
  | 'inventory'
  | 'metadata';

/* ─── Action Types ─── */
export type ShelterAction =
  | { type: 'SET_SHELTER'; payload: ShelterProvider }
  | { type: 'SET_METADATA'; payload: ShelterMetadata }
  | { type: 'SET_OCCUPANTS'; payload: Occupant[] }
  | { type: 'ADD_OCCUPANT'; payload: Occupant }
  | { type: 'UPDATE_OCCUPANT'; payload: Occupant }
  | { type: 'REMOVE_OCCUPANT'; payload: string }
  | { type: 'SET_FACILITIES'; payload: Facility[] }
  | { type: 'ADD_FACILITY'; payload: Facility }
  | { type: 'UPDATE_FACILITY'; payload: Facility }
  | { type: 'REMOVE_FACILITY'; payload: string }
  | { type: 'SET_INVENTORY'; payload: InventoryItem[] }
  | { type: 'ADD_INVENTORY_ITEM'; payload: InventoryItem }
  | { type: 'UPDATE_INVENTORY_ITEM'; payload: InventoryItem }
  | { type: 'REMOVE_INVENTORY_ITEM'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TAB'; payload: ShelterTab }
  | { type: 'UPDATE_BED_COUNTS'; payload: { occupied: number; available: number } }
  | { type: 'LOAD_DEMO_DATA' }
  | { type: 'RESET_SHELTER' };

const STORAGE_KEY = 'vyntra_shelter_state';

/* ─── Initial State ─── */
const initialState: ShelterState = {
  shelter: null,
  metadata: null,
  occupants: [],
  facilities: [],
  inventory: [],
  isLoading: false,
  error: null,
  activeTab: 'registration',
};

function loadStoredState(): ShelterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.shelter) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[VYNTRA] Could not parse stored state', e);
  }
  return initialState;
}

/* ─── Reducer ─── */
function shelterReducer(state: ShelterState, action: ShelterAction): ShelterState {
  switch (action.type) {
    case 'SET_SHELTER':
      return {
        ...state,
        shelter: action.payload,
        activeTab: action.payload.isActive ? 'dashboard' : 'registration',
      };

    case 'LOAD_DEMO_DATA': {
      const demo = createDemoShelter();
      return {
        ...state,
        shelter: demo.shelter,
        occupants: demo.occupants,
        facilities: demo.facilities,
        inventory: demo.inventory,
        activeTab: 'dashboard',
        error: null,
      };
    }

    case 'RESET_SHELTER': {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      return {
        ...initialState,
        activeTab: 'registration',
      };
    }

    case 'SET_METADATA':
      return { ...state, metadata: action.payload };

    case 'SET_OCCUPANTS':
      return { ...state, occupants: action.payload };

    case 'ADD_OCCUPANT': {
      const nextOccupants = [...state.occupants, action.payload];
      const activeCount = nextOccupants.filter((o) => o.status === 'active').length;
      const updatedShelter = state.shelter
        ? {
            ...state.shelter,
            occupiedBeds: activeCount,
            availableBeds: Math.max(0, state.shelter.totalBedCapacity - activeCount),
          }
        : null;
      return {
        ...state,
        occupants: nextOccupants,
        shelter: updatedShelter,
      };
    }

    case 'UPDATE_OCCUPANT': {
      const nextOccupants = state.occupants.map((o) =>
        o.personId === action.payload.personId ? action.payload : o
      );
      const activeCount = nextOccupants.filter((o) => o.status === 'active').length;
      const updatedShelter = state.shelter
        ? {
            ...state.shelter,
            occupiedBeds: activeCount,
            availableBeds: Math.max(0, state.shelter.totalBedCapacity - activeCount),
          }
        : null;
      return {
        ...state,
        occupants: nextOccupants,
        shelter: updatedShelter,
      };
    }

    case 'REMOVE_OCCUPANT': {
      const nextOccupants = state.occupants.filter((o) => o.personId !== action.payload);
      const activeCount = nextOccupants.filter((o) => o.status === 'active').length;
      const updatedShelter = state.shelter
        ? {
            ...state.shelter,
            occupiedBeds: activeCount,
            availableBeds: Math.max(0, state.shelter.totalBedCapacity - activeCount),
          }
        : null;
      return {
        ...state,
        occupants: nextOccupants,
        shelter: updatedShelter,
      };
    }

    case 'SET_FACILITIES':
      return { ...state, facilities: action.payload };

    case 'ADD_FACILITY':
      return { ...state, facilities: [...state.facilities, action.payload] };

    case 'UPDATE_FACILITY':
      return {
        ...state,
        facilities: state.facilities.map((f) =>
          f.facilityId === action.payload.facilityId ? action.payload : f
        ),
      };

    case 'REMOVE_FACILITY':
      return {
        ...state,
        facilities: state.facilities.filter((f) => f.facilityId !== action.payload),
      };

    case 'SET_INVENTORY':
      return { ...state, inventory: action.payload };

    case 'ADD_INVENTORY_ITEM':
      return { ...state, inventory: [...state.inventory, action.payload] };

    case 'UPDATE_INVENTORY_ITEM':
      return {
        ...state,
        inventory: state.inventory.map((i) =>
          i.itemId === action.payload.itemId ? action.payload : i
        ),
      };

    case 'REMOVE_INVENTORY_ITEM':
      return {
        ...state,
        inventory: state.inventory.filter((i) => i.itemId !== action.payload),
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_TAB':
      return { ...state, activeTab: action.payload };

    case 'UPDATE_BED_COUNTS':
      return state.shelter
        ? {
            ...state,
            shelter: {
              ...state.shelter,
              occupiedBeds: action.payload.occupied,
              availableBeds: action.payload.available,
            },
          }
        : state;

    default:
      return state;
  }
}

/* ─── Context ─── */
interface ShelterContextValue {
  state: ShelterState;
  dispatch: React.Dispatch<ShelterAction>;
}

const ShelterContext = createContext<ShelterContextValue>({
  state: initialState,
  dispatch: () => {},
});

/**
 * Provides shelter state to all descendant components.
 */
export function ShelterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shelterReducer, undefined, () => loadStoredState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[VYNTRA] Could not save state to localStorage', e);
    }
  }, [state]);

  return (
    <ShelterContext.Provider value={{ state, dispatch }}>
      {children}
    </ShelterContext.Provider>
  );
}

/**
 * Hook to access shelter state and dispatch.
 */
export function useShelter(): ShelterContextValue {
  return useContext(ShelterContext);
}
