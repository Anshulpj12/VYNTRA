/**
 * VYNTRA Part 2 — Connectivity Context
 * 
 * React context providing PWA connectivity status across all Part 2 screens.
 * Monitors online/offline state and pending sync queue.
 * 
 * @module part2-shelter-provider/context/ConnectivityContext
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ConnectivityStatus } from '../../shared/types';
import { getPendingSyncEntries } from '../../shared/utils/offline-cache';

interface ConnectivityContextValue {
  status: ConnectivityStatus;
  isOnline: boolean;
  pendingCount: number;
  refreshSyncStatus: () => Promise<void>;
}

const ConnectivityContext = createContext<ConnectivityContextValue>({
  status: 'online-synced',
  isOnline: true,
  pendingCount: 0,
  refreshSyncStatus: async () => {},
});

/**
 * Provides connectivity status to all descendant components.
 * Monitors browser online/offline events and IndexedDB sync queue.
 */
export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshSyncStatus = useCallback(async () => {
    try {
      const entries = await getPendingSyncEntries();
      setPendingCount(entries.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    /* Initial sync status check */
    refreshSyncStatus();

    /* Poll sync status every 30 seconds */
    const interval = setInterval(refreshSyncStatus, 30_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshSyncStatus]);

  const status: ConnectivityStatus = !isOnline
    ? 'offline-saved'
    : pendingCount > 0
    ? 'sync-pending'
    : 'online-synced';

  return (
    <ConnectivityContext.Provider value={{ status, isOnline, pendingCount, refreshSyncStatus }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

/**
 * Hook to access the current connectivity status.
 * 
 * @returns ConnectivityContextValue with status, isOnline, and pendingCount
 */
export function useConnectivity(): ConnectivityContextValue {
  return useContext(ConnectivityContext);
}
