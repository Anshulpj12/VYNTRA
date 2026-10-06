/**
 * VYNTRA — Decoded Conditions Display Component
 * Visual presentation of decoded victim telemetry, triage tier, and condition pills.
 */

import type { DecodedSOSTelemetry } from '../sos-decoder';

interface DecodedConditionsDisplayProps {
  telemetry: DecodedSOSTelemetry;
}

export default function DecodedConditionsDisplay({ telemetry }: DecodedConditionsDisplayProps) {
  const isP1 = telemetry.overallPriority === 'p1';
  const isP2 = telemetry.overallPriority === 'p2';

  return (
    <div className="sos-decoded-card">
      {/* Triage Banner */}
      <div className="sos-decoded-header">
        <span
          className={`part3-badge ${
            isP1 ? 'part3-badge--danger' : isP2 ? 'part3-badge--warning' : 'part3-badge--secondary'
          }`}
          style={{ fontSize: '13px', padding: '6px 14px' }}
        >
          {telemetry.priorityLabel}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
          ⏱️ Signal: {telemetry.elapsedTimeString}
        </span>
      </div>

      {/* Victim Meta Grid */}
      <div className="sos-decoded-meta-grid">
        <div className="sos-meta-item">
          <span className="sos-meta-label">Displaced Person ID</span>
          <span className="sos-meta-value">{telemetry.userId}</span>
        </div>
        <div className="sos-meta-item">
          <span className="sos-meta-label">Decoded Coordinates</span>
          <span className="sos-meta-value">
            {telemetry.lat.toFixed(4)}, {telemetry.lng.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Condition Pills */}
      <div>
        <span
          className="part3-form-hint"
          style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}
        >
          Active Distress Requirements ({telemetry.conditions.length}):
        </span>
        <div className="sos-conditions-list">
          {telemetry.conditions.map((cond) => {
            const pillClass =
              cond.priorityTier === 'p1'
                ? 'sos-condition-pill--p1'
                : cond.priorityTier === 'p2'
                ? 'sos-condition-pill--p2'
                : 'sos-condition-pill--p3';

            return (
              <span key={cond.code} className={`sos-condition-pill ${pillClass}`}>
                <strong>[{cond.code}]</strong> {cond.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
