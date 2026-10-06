/**
 * VYNTRA — Provider Selection Mode Component
 * Allows shelter provider to choose between broadcasting to 5 Nearest Providers
 * or targeting 1 specific known Service Provider.
 */

import type { ProviderWithDistance } from '../nearest-provider-finder';

interface ProviderSelectionModeProps {
  mode: 'five-nearest' | 'single';
  onModeChange: (mode: 'five-nearest' | 'single') => void;
  availableProviders: ProviderWithDistance[];
  selectedSingleProviderId: string;
  onSelectSingleProvider: (id: string) => void;
}

export default function ProviderSelectionMode({
  mode,
  onModeChange,
  availableProviders,
  selectedSingleProviderId,
  onSelectSingleProvider,
}: ProviderSelectionModeProps) {
  return (
    <div className="provider-mode-selector">
      {/* Option 1: 5 Nearest Broadcast */}
      <div
        className={`provider-mode-option ${mode === 'five-nearest' ? 'selected' : ''}`}
        onClick={() => onModeChange('five-nearest')}
      >
        <input
          type="radio"
          name="dispatch-mode"
          className="provider-mode-option__radio"
          checked={mode === 'five-nearest'}
          onChange={() => onModeChange('five-nearest')}
        />
        <div className="provider-mode-option__content">
          <h4 className="provider-mode-option__title">
            ⚡ Broadcast to 5 Nearest Providers (Recommended)
          </h4>
          <p className="provider-mode-option__desc">
            Dispatches order metadata to the 5 closest registered depots simultaneously. First provider to accept claims and prepares fulfillment.
          </p>

          {mode === 'five-nearest' && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="part3-form-hint" style={{ fontWeight: 600 }}>
                Selected Nearest Depots by Haversine Distance:
              </span>
              {availableProviders.slice(0, 5).map((p, idx) => (
                <div
                  key={p.providerId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    padding: '4px 8px',
                    background: 'var(--color-surface-container-low)',
                    borderRadius: '6px',
                  }}
                >
                  <span>
                    #{idx + 1} {p.providerName}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>
                    📍 {p.distanceKm} km away
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Option 2: Single Dedicated Provider */}
      <div
        className={`provider-mode-option ${mode === 'single' ? 'selected' : ''}`}
        onClick={() => onModeChange('single')}
      >
        <input
          type="radio"
          name="dispatch-mode"
          className="provider-mode-option__radio"
          checked={mode === 'single'}
          onChange={() => onModeChange('single')}
        />
        <div className="provider-mode-option__content">
          <h4 className="provider-mode-option__title">
            🎯 Target 1 Specific Known Provider
          </h4>
          <p className="provider-mode-option__desc">
            Send directly to a preferred supply partner or pre-established depot.
          </p>

          {mode === 'single' && (
            <div style={{ marginTop: '8px' }}>
              <select
                className="part3-form-select"
                value={selectedSingleProviderId}
                onChange={(e) => onSelectSingleProvider(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                {availableProviders.map((p) => (
                  <option key={p.providerId} value={p.providerId}>
                    {p.providerName} ({p.distanceKm} km) — {p.district}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
