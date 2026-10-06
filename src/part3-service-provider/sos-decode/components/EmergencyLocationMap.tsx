/**
 * VYNTRA — Emergency Location Map Component
 * Visual offline-capable map display with radar pulse, victim location pin,
 * depot reference pin, and Haversine distance telemetry.
 */

import { getDistanceToVictim } from '../navigation-launcher';
import type { GeoCoordinates } from '../../../shared/types';

interface EmergencyLocationMapProps {
  victimCoords: GeoCoordinates;
  baseCoords?: GeoCoordinates;
  victimName?: string;
}

export default function EmergencyLocationMap({
  victimCoords,
  baseCoords = { lat: 23.1685, lng: 79.9338 },
  victimName = 'Distressed Woman Location',
}: EmergencyLocationMapProps) {
  const distanceKm = getDistanceToVictim(victimCoords, baseCoords);

  return (
    <div className="sos-map-container">
      {/* Background Radar Grid */}
      <div className="sos-map-grid-bg">
        {/* Distance Badge */}
        <div className="sos-map-distance-badge">
          <span>📍 {distanceKm} km from Hub</span>
        </div>

        {/* Radar Ring */}
        <div className="sos-map-radar-pulse" />

        {/* Center Victim Pin */}
        <div className="sos-map-victim-pin" title={victimName}>
          <span>🆘</span>
        </div>

        {/* Depot Pin in Corner */}
        <div className="sos-map-depot-pin">
          <span>🚚 Relief Depot</span>
        </div>

        {/* Coordinates Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '12px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: 'var(--color-on-surface-variant)',
            background: 'rgba(255,255,255,0.85)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          {victimCoords.lat.toFixed(5)}° N, {victimCoords.lng.toFixed(5)}° E
        </div>
      </div>
    </div>
  );
}
