/**
 * VYNTRA — Provider Status Banner Component
 * Displays provider profile, verified cryptographic ID, depot coordinates,
 * and the active duty operational toggle.
 */

import { useState } from 'react';
import type { ServiceProvider } from '../../../shared/types';

interface ProviderStatusBannerProps {
  provider: ServiceProvider;
  onToggleDuty: (active: boolean) => void;
}

export default function ProviderStatusBanner({
  provider,
  onToggleDuty,
}: ProviderStatusBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(provider.providerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="svc-status-banner">
      <div className="svc-status-banner__top">
        <div className="svc-status-banner__info">
          <div className="svc-status-avatar">🚚</div>
          <div>
            <h2 className="svc-status-title">{provider.providerName}</h2>
            <button
              type="button"
              className="svc-id-pill"
              onClick={handleCopyId}
              title="Click to copy ID"
            >
              <span>{provider.providerId}</span>
              <span>{copied ? '✓' : '📋'}</span>
            </button>
          </div>
        </div>

        {/* Active Duty Switch */}
        <div
          className="svc-duty-toggle"
          onClick={() => onToggleDuty(!provider.isActive)}
          title="Toggle operational status"
        >
          <div className={`svc-duty-switch ${provider.isActive ? 'active' : ''}`}>
            <div className="svc-duty-switch__thumb" />
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: provider.isActive ? 'var(--color-tertiary)' : 'var(--color-on-surface-variant)',
            }}
          >
            {provider.isActive ? 'Active Duty' : 'Standby'}
          </span>
        </div>
      </div>

      <div className="svc-status-banner__meta">
        <span>
          📍 <strong>{provider.location}</strong> ({provider.district})
        </span>
        <span style={{ fontFamily: 'monospace' }}>
          {provider.coordinates.lat.toFixed(4)}° N, {provider.coordinates.lng.toFixed(4)}° E
        </span>
      </div>
    </div>
  );
}
