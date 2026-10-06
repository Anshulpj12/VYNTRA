/**
 * VYNTRA Part 2 — Consolidated Metadata Screen
 * 
 * Shows the live consolidated shelter metadata document,
 * representing the current state of the shelter across all components.
 * This is the data consumed by Part 1's SOS system and Part 3's scoring.
 * 
 * @module part2-shelter-provider/metadata/MetadataScreen
 * @part Part 2 — Shelter Provider
 */

import { useMemo, useCallback, useState } from 'react';
import { useShelter } from '../context/ShelterContext';
import { consolidateMetadata, detectShortages, calculateUtilization } from './metadata-consolidator';
import { saveMetadata } from './metadata-service';

/**
 * Live metadata view and sync control.
 * Shows the consolidated JSON payload and summary cards.
 */
export default function MetadataScreen() {
  const { state } = useShelter();
  const { shelter, occupants, facilities, inventory } = state;
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  /* Consolidate metadata */
  const metadata = useMemo(
    () => shelter ? consolidateMetadata(shelter, occupants, facilities, inventory) : null,
    [shelter, occupants, facilities, inventory]
  );

  const shortages = useMemo(() => detectShortages(inventory), [inventory]);
  const utilization = useMemo(() => metadata ? calculateUtilization(metadata) : 0, [metadata]);

  const activeOccupants = occupants.filter((o) => o.status === 'active');

  /** Force sync metadata */
  const handleSync = useCallback(async () => {
    if (!metadata) return;
    setIsSyncing(true);
    try {
      await saveMetadata(metadata);
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('[VYNTRA] Metadata sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [metadata]);

  if (!shelter || !metadata) return null;

  return (
    <div className="metadata" id="metadata-screen" style={{ animation: 'slideUp var(--vyntra-transition) ease' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--vyntra-space-xl)', flexWrap: 'wrap', gap: 'var(--vyntra-space-md)' }}>
        <div>
          <h1 className="text-headline-lg">Central Emergency System Link</h1>
          <p className="text-muted">
            Single Consolidated Shelter Metadata Record consumed by State Relocation Router & Rapid Triage Dispatch.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--vyntra-space-sm)' }}>
          <button
            className="part2-btn part2-btn--secondary"
            onClick={handleSync}
            disabled={isSyncing}
            id="sync-metadata-btn"
          >
            {isSyncing ? '⏳ Syncing...' : '🔄 Force Hash Re-Sync'}
          </button>
        </div>
      </div>

      {/* ─── Summary Stats ─── */}
      <div className="part2-grid part2-grid--4" style={{ marginBottom: 'var(--vyntra-space-xl)' }}>
        <div className="part2-card">
          <div className="text-badge" style={{ color: 'var(--vyntra-on-surface-muted)', marginBottom: '8px' }}>Live Bed Matrix</div>
          <div className="text-counter" style={{ color: 'var(--vyntra-tertiary)' }}>{metadata.availableBeds}</div>
          <div className="text-muted">Vacant</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <span className="part2-status-badge part2-status-badge--info">Total: {metadata.totalBedCapacity}</span>
            <span className="part2-status-badge part2-status-badge--occupied">Occupied: {metadata.occupiedBeds}</span>
          </div>
        </div>

        <div className="part2-card">
          <div className="text-badge" style={{ color: 'var(--vyntra-on-surface-muted)', marginBottom: '8px' }}>Women & Child Focus</div>
          <div className="text-counter">{activeOccupants.length}</div>
          <div className="text-muted">high-priority residents</div>
        </div>

        <div className="part2-card">
          <div className="text-badge" style={{ color: 'var(--vyntra-on-surface-muted)', marginBottom: '8px' }}>Hygiene & Facilities</div>
          <div className="text-counter">{facilities.length}</div>
          <div className="text-muted">Active facilities</div>
        </div>

        <div className="part2-card">
          <div className="text-badge" style={{ color: 'var(--vyntra-on-surface-muted)', marginBottom: '8px' }}>Supply Reorder Status</div>
          <div className="text-counter" style={{ color: shortages.length > 0 ? 'var(--vyntra-warning)' : 'var(--vyntra-tertiary)' }}>
            {shortages.length}
          </div>
          <div className="text-muted">Shortage Flag{shortages.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* ─── Location Info ─── */}
      <div className="part2-card" style={{ marginBottom: 'var(--vyntra-space-xl)', padding: 'var(--vyntra-space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--vyntra-space-md)', marginBottom: 'var(--vyntra-space-md)' }}>
          <span style={{ fontSize: '24px' }}>📍</span>
          <div>
            <div className="text-headline-sm">District Telemetry Hub</div>
            <div className="text-muted">{metadata.district} • {metadata.shelterId}</div>
          </div>
        </div>
        <div className="part2-grid part2-grid--2">
          <div>
            <span className="text-muted">Geo-Coordinates:</span>
            <div style={{ fontFamily: 'var(--vyntra-font-headline)', fontWeight: 600, marginTop: '4px' }}>
              {metadata.coordinates.lat.toFixed(4)}° N, {metadata.coordinates.lng.toFixed(4)}° E
            </div>
          </div>
          <div>
            <span className="text-muted">Sync Timestamp:</span>
            <div style={{ fontFamily: 'var(--vyntra-font-headline)', fontWeight: 600, marginTop: '4px' }}>
              {lastSyncTime
                ? new Date(lastSyncTime).toLocaleString()
                : new Date(metadata.lastUpdatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Utilization gauge */}
        <div style={{ marginTop: 'var(--vyntra-space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--vyntra-space-lg)' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--vyntra-border)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={utilization >= 90 ? 'var(--vyntra-primary)' : utilization >= 70 ? 'var(--vyntra-warning)' : 'var(--vyntra-tertiary)'}
                strokeWidth="2.5"
                strokeDasharray={`${utilization} ${100 - utilization}`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>
              {utilization}%
            </div>
          </div>
          <div>
            <div className="text-headline-sm">{utilization}% Saturation</div>
            <div className="text-muted">
              {utilization >= 90 ? 'At capacity — surge protocols active' :
               utilization >= 70 ? 'Optimal safety threshold' :
               'Immediate Intake Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Consolidated JSON Payload ─── */}
      <div className="part2-card" style={{ marginBottom: 'var(--vyntra-space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--vyntra-space-md)' }}>
          <div>
            <div className="text-headline-sm">Consolidated Payload Stream</div>
            <div className="text-muted" style={{ fontSize: '12px' }}>
              REST & Webhook Target: shelter-providers/{metadata.shelterId}/metadata
            </div>
          </div>
          <button
            className="part2-btn part2-btn--secondary part2-btn--sm"
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(metadata, null, 2))}
            id="copy-payload-btn"
          >
            📋 Copy Payload JSON
          </button>
        </div>

        <div
          style={{
            background: 'var(--vyntra-slate-dark)',
            color: 'var(--vyntra-on-slate)',
            borderRadius: 'var(--vyntra-radius)',
            padding: 'var(--vyntra-space-lg)',
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            maxHeight: '500px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(metadata, null, 2)}
        </div>
      </div>

      {/* ─── Shortage Report ─── */}
      {shortages.length > 0 && (
        <div className="part2-card" style={{ border: '2px solid var(--vyntra-warning)' }}>
          <h3 className="text-headline-sm" style={{ marginBottom: 'var(--vyntra-space-md)' }}>
            ⚠️ Active Shortage Report
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {shortages.map((item) => (
              <div
                key={item.itemId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--vyntra-warning-light)',
                  borderRadius: 'var(--vyntra-radius)',
                }}
              >
                <strong>{item.itemName}</strong>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span>Current: {item.currentQuantity}</span>
                  <span className="text-muted">Min: {item.requiredMinimum}</span>
                  <span className="part2-status-badge part2-status-badge--warning">BELOW MIN</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
