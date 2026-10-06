/**
 * VYNTRA — PWA Connectivity Badge
 * Shows online/offline/sync-pending status on every screen.
 */

import { useState, useEffect } from 'react';
import '../styles/part1-base.css';

export default function ConnectivityBadge() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`connectivity-badge ${isOnline ? 'connectivity-badge--online' : 'connectivity-badge--offline'}`}>
      <span className="connectivity-badge__dot" />
      <span className="connectivity-badge__text">
        {isOnline ? 'Online & Synced' : 'Offline — Data Saved Locally'}
      </span>
    </div>
  );
}
