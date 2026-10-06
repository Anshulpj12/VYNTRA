/**
 * VYNTRA — Location Picker Component
 * Captures GPS coordinates via Geolocation API or allows manual coordinate entry.
 */

import { useState } from 'react';
import type { GeoCoordinates } from '../../../shared/types';

interface LocationPickerProps {
  coordinates: GeoCoordinates;
  onChange: (coords: GeoCoordinates) => void;
  error?: string;
}

const DEPOT_PRESETS = [
  { name: 'Jabalpur Central Depot', lat: 23.1685, lng: 79.9338 },
  { name: 'Bhopal Logistics Hub', lat: 23.2599, lng: 77.4126 },
  { name: 'Indore Rapid Supply Base', lat: 22.7196, lng: 75.8577 },
  { name: 'Jaipur Safe Base', lat: 26.9124, lng: 75.7873 },
  { name: 'Delhi Relief Depot', lat: 28.6139, lng: 77.2090 },
];

export default function LocationPicker({ coordinates, onChange, error }: LocationPickerProps) {
  const [detecting, setDetecting] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.');
      return;
    }

    setDetecting(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false);
        onChange({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setGeoNotice('✓ Live GPS lock acquired.');
      },
      (err) => {
        setDetecting(false);
        setGeoNotice(`GPS unavailable (${err.message}). Using preset coordinates.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handlePresetSelect = (preset: { lat: number; lng: number }) => {
    onChange({ lat: preset.lat, lng: preset.lng });
    setGeoNotice(null);
  };

  return (
    <div className="svc-location-card">
      <div className="part3-form-label">
        <span>📍 Depot Geographical Coordinates</span>
        <span className="part3-form-hint">Used to calculate nearest shelters</span>
      </div>

      <div className="svc-coords-grid">
        <div>
          <label htmlFor="depot-lat" className="part3-form-hint">Latitude</label>
          <input
            id="depot-lat"
            type="number"
            step="0.0001"
            className="part3-form-input"
            value={coordinates.lat || ''}
            onChange={(e) => onChange({ ...coordinates, lat: parseFloat(e.target.value) || 0 })}
            placeholder="e.g. 23.1685"
          />
        </div>
        <div>
          <label htmlFor="depot-lng" className="part3-form-hint">Longitude</label>
          <input
            id="depot-lng"
            type="number"
            step="0.0001"
            className="part3-form-input"
            value={coordinates.lng || ''}
            onChange={(e) => onChange({ ...coordinates, lng: parseFloat(e.target.value) || 0 })}
            placeholder="e.g. 79.9338"
          />
        </div>
      </div>

      <button
        type="button"
        className="svc-detect-gps-btn"
        onClick={handleDetectGPS}
        disabled={detecting}
      >
        <span>{detecting ? '🛰️ Acquiring GPS Lock...' : '🛰️ Detect Current Depot GPS'}</span>
      </button>

      {geoNotice && (
        <p className="part3-form-hint" style={{ marginTop: '6px', color: 'var(--color-tertiary)' }}>
          {geoNotice}
        </p>
      )}

      {error && (
        <p className="part3-form-hint" style={{ marginTop: '6px', color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      {/* Quick Presets */}
      <div style={{ marginTop: '12px' }}>
        <span className="part3-form-hint" style={{ display: 'block', marginBottom: '6px' }}>
          Quick Hub Presets:
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {DEPOT_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="part3-badge part3-badge--secondary"
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => handlePresetSelect(p)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
