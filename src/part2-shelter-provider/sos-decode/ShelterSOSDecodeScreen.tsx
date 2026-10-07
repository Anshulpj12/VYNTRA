/**
 * VYNTRA Part 2 — Emergency SOS Signal Decoder & Direct Rescue Navigation
 * 
 * Enables shelter operations desk to decode compact SMS payloads transmitted
 * by victims (offline/2G SMS format: VYNTRA|<coords>|<conditions>|<userId>|<ts>).
 * Calculates real-time distance from the shelter, triages priority (P1/P2/P3),
 * displays a tactical visualizer, and launches direct Google Maps navigation.
 * 
 * @module part2-shelter-provider/sos-decode/ShelterSOSDecodeScreen
 * @part Part 2 — Shelter Provider
 */

import { useState, useMemo } from 'react';
import { useShelter } from '../context/ShelterContext';
import { decodeSOS, SOS_CONDITIONS } from '../../shared/constants/sos-codes';
import { calculateDistance, formatDistance } from '../../shared/utils/geo-distance';

export interface DecodedSignal {
  rawCode: string;
  lat: number;
  lng: number;
  userId: string;
  timestamp: number;
  conditions: Array<{
    code: string;
    label: string;
    priorityTier: 'p1' | 'p2' | 'p3';
  }>;
  overallPriority: 'p1' | 'p2' | 'p3';
  priorityLabel: string;
  distanceKm: number;
  formattedDistance: string;
  elapsedTimeString: string;
}

/** Triage priority calculation based on emergency codes */
function getPriorityTier(code: string): 'p1' | 'p2' | 'p3' {
  switch (code) {
    case 'PG': // Pregnancy
    case 'AD': // Acute Distress
    case 'MD': // Medical Difficulty
      return 'p1';
    case 'WC': // Wheelchair Required
    case 'CC': // Child Care Required
    case 'EA': // Elderly Assistance
      return 'p2';
    default:
      return 'p3';
  }
}

function getElapsedString(timestampSeconds: number): string {
  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000 - timestampSeconds));
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMins = Math.floor(diffSeconds / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function ShelterSOSDecodeScreen() {
  const { state } = useShelter();
  const { shelter } = state;

  const defaultCoords = shelter?.coordinates || { lat: 23.1815, lng: 79.9412 };

  // Sample SMS presets based on shelter location
  const samplePresets = useMemo(() => [
    {
      id: 'p1',
      title: '🚨 Test P1 (Pregnancy + Acute Distress)',
      code: `VYNTRA|${(defaultCoords.lat + 0.012).toFixed(4)},${(defaultCoords.lng + 0.015).toFixed(4)}|PG-AD-MD|VYNTRA-USR-8821|${Math.floor(Date.now() / 1000 - 180)}`,
    },
    {
      id: 'p2',
      title: '⚠️ Test P2 (Elderly + Wheelchair Assistance)',
      code: `VYNTRA|${(defaultCoords.lat - 0.018).toFixed(4)},${(defaultCoords.lng + 0.011).toFixed(4)}|WC-EA|VYNTRA-USR-3912|${Math.floor(Date.now() / 1000 - 720)}`,
    },
    {
      id: 'p3',
      title: '💜 Test P3 (Sanitation + Menstrual Support)',
      code: `VYNTRA|${(defaultCoords.lat + 0.008).toFixed(4)},${(defaultCoords.lng - 0.014).toFixed(4)}|MN-SN|VYNTRA-USR-5044|${Math.floor(Date.now() / 1000 - 1440)}`,
    },
  ], [defaultCoords.lat, defaultCoords.lng]);

  const [inputCode, setInputCode] = useState<string>(samplePresets[0].code);
  const [activeSignal, setActiveSignal] = useState<DecodedSignal | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<'standby' | 'dispatched' | 'enroute' | 'rescued'>('standby');

  /** Decode the current input code */
  const handleDecode = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setActiveSignal(null);
      setDecodeError('Please enter a raw SMS payload to decode.');
      return;
    }

    const decoded = decodeSOS(trimmed);
    if (!decoded || isNaN(decoded.lat) || isNaN(decoded.lng)) {
      setActiveSignal(null);
      setDecodeError('Invalid SMS payload structure. Expected: VYNTRA|<lat>,<lng>|<conditions>|<userId>|<timestamp>');
      return;
    }

    const conditionsWithTriage = decoded.conditions.map((c) => ({
      code: c.code,
      label: c.label || SOS_CONDITIONS[c.code] || 'Emergency Support Needed',
      priorityTier: getPriorityTier(c.code),
    }));

    let overallPriority: 'p1' | 'p2' | 'p3' = 'p3';
    if (conditionsWithTriage.some((c) => c.priorityTier === 'p1')) {
      overallPriority = 'p1';
    } else if (conditionsWithTriage.some((c) => c.priorityTier === 'p2')) {
      overallPriority = 'p2';
    }

    const priorityLabel =
      overallPriority === 'p1'
        ? 'P1 — Immediate Life Safety / Urgent Rescue'
        : overallPriority === 'p2'
        ? 'P2 — Priority Vulnerable Assistance'
        : 'P3 — General Emergency Relief & Support';

    const dist = calculateDistance(defaultCoords, { lat: decoded.lat, lng: decoded.lng });

    setActiveSignal({
      rawCode: trimmed,
      lat: decoded.lat,
      lng: decoded.lng,
      userId: decoded.userId,
      timestamp: decoded.timestamp,
      conditions: conditionsWithTriage,
      overallPriority,
      priorityLabel,
      distanceKm: dist,
      formattedDistance: formatDistance(dist),
      elapsedTimeString: getElapsedString(decoded.timestamp),
    });
    setDecodeError(null);
    setDispatchStatus('standby');
  };

  /** Open Google Maps Turn-by-Turn Navigation */
  const handleLaunchNavigation = () => {
    if (!activeSignal) return;
    const origin = `${defaultCoords.lat},${defaultCoords.lng}`;
    const destination = `${activeSignal.lat},${activeSignal.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getPriorityStyle = (tier: 'p1' | 'p2' | 'p3') => {
    switch (tier) {
      case 'p1':
        return {
          bg: '#FFEAEA',
          border: '#E53935',
          text: '#B71C1C',
          badgeBg: '#B71C1C',
          icon: '🚨',
        };
      case 'p2':
        return {
          bg: '#FFF8E1',
          border: '#FFA000',
          text: '#E65100',
          badgeBg: '#E65100',
          icon: '⚠️',
        };
      case 'p3':
        return {
          bg: '#F3E5F5',
          border: '#AB47BC',
          text: '#4A148C',
          badgeBg: '#6A1B9A',
          icon: '💜',
        };
    }
  };

  return (
    <div className="shelter-sos-decode" id="shelter-sos-decode-screen" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ─── Header ─── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '28px' }}>🚨</span>
          <h1 className="text-headline-lg" style={{ margin: 0 }}>
            Emergency SOS Signal Decoder & Direct Rescue Navigation
          </h1>
        </div>
        <p className="text-muted" style={{ margin: 0 }}>
          Offline 2G/SMS emergency decoding link. Decodes low-bandwidth telemetry, assesses triage priority, and calculates tactical distance from your shelter sanctuary.
        </p>
      </div>

      {/* ─── Shelter Coordinate Anchor Badge ─── */}
      <div
        className="part2-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'var(--vyntra-surface)',
          border: '1px solid var(--vyntra-border)',
          borderRadius: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <div>
            <strong>Active Sanctuary Anchor: {shelter?.shelterName || 'Regional Emergency Sanctuary'}</strong>
            <div className="text-muted" style={{ fontSize: '12px' }}>
              GPS: {defaultCoords.lat.toFixed(4)}°N, {defaultCoords.lng.toFixed(4)}°E • District: {shelter?.district || 'Central District'}
            </div>
          </div>
        </div>
        <span
          style={{
            background: 'rgba(46, 125, 50, 0.12)',
            color: '#1B5E20',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          📍 LIVE COORDINATE BASE
        </span>
      </div>

      {/* ─── Input & Quick Presets Grid ─── */}
      <div className="part2-grid part2-grid--2" style={{ gap: '20px', marginBottom: '24px' }}>
        <div className="part2-card part2-card--elevated" style={{ padding: '20px' }}>
          <h3 className="text-headline-sm" style={{ marginBottom: '12px' }}>
            📥 Inbound SMS Raw Signal
          </h3>
          <p className="text-muted" style={{ fontSize: '13px', marginBottom: '12px' }}>
            Paste the received SMS text (e.g. from local SIM gateway, satellite transceiver, or GSM modem).
          </p>

          <textarea
            className="part2-input"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            rows={3}
            placeholder="VYNTRA|lat,lng|CONDITIONS|userId|timestamp"
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              padding: '12px',
              width: '100%',
              borderRadius: '8px',
              marginBottom: '14px',
            }}
            id="sos-sms-input"
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="part2-btn part2-btn--primary"
              onClick={() => handleDecode(inputCode)}
              id="decode-signal-btn"
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <span>⚡</span> Decode Emergency Signal
            </button>
            <button
              className="part2-btn part2-btn--ghost"
              onClick={() => {
                setInputCode('');
                setActiveSignal(null);
                setDecodeError(null);
              }}
            >
              Clear
            </button>
          </div>

          {decodeError && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                background: '#FFEBEE',
                border: '1px solid #FFCDD2',
                borderRadius: '8px',
                color: '#C62828',
                fontSize: '13px',
              }}
            >
              ⚠️ {decodeError}
            </div>
          )}
        </div>

        {/* ─── Quick Sample Presets ─── */}
        <div className="part2-card" style={{ padding: '20px' }}>
          <h3 className="text-headline-sm" style={{ marginBottom: '8px' }}>
            🧪 Quick Simulation Presets
          </h3>
          <p className="text-muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
            Trigger real-world triage scenarios within reach of this shelter:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {samplePresets.map((preset) => (
              <button
                key={preset.id}
                className="part2-btn part2-btn--ghost"
                onClick={() => {
                  setInputCode(preset.code);
                  handleDecode(preset.code);
                }}
                style={{
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  padding: '12px 16px',
                  border: '1px solid var(--vyntra-border)',
                  borderRadius: '10px',
                  background: 'var(--vyntra-surface)',
                }}
              >
                <div>
                  <strong>{preset.title}</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--vyntra-text-muted)', marginTop: '2px' }}>
                    {preset.code}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Decoded Signal Telemetry View ─── */}
      {activeSignal && (() => {
        const style = getPriorityStyle(activeSignal.overallPriority);

        return (
          <div
            className="part2-card part2-card--elevated"
            id="decoded-signal-card"
            style={{
              padding: '24px',
              border: `2px solid ${style.border}`,
              background: style.bg,
              borderRadius: '16px',
              marginBottom: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Header / Triage Status */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: `1px solid ${style.border}`,
                paddingBottom: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>{style.icon}</span>
                <div>
                  <div
                    style={{
                      background: style.badgeBg,
                      color: '#FFFFFF',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'inline-block',
                      marginBottom: '4px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    TRIAGE TIER {activeSignal.overallPriority.toUpperCase()}
                  </div>
                  <h2 style={{ fontSize: '20px', margin: 0, color: style.text, fontWeight: 700 }}>
                    {activeSignal.priorityLabel}
                  </h2>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: style.text, fontWeight: 600 }}>
                  Signal Transmitted: {activeSignal.elapsedTimeString}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--vyntra-text-muted)' }}>
                  User ID: <span style={{ fontFamily: 'monospace' }}>{activeSignal.userId}</span>
                </div>
              </div>
            </div>

            {/* Conditions Chips */}
            <div style={{ marginBottom: '20px' }}>
              <strong style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: style.text, display: 'block', marginBottom: '8px' }}>
                Declared Vulnerability & Health Conditions:
              </strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeSignal.conditions.map((c) => {
                  const itemStyle = getPriorityStyle(c.priorityTier);
                  return (
                    <span
                      key={c.code}
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid ${itemStyle.border}`,
                        color: itemStyle.text,
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <span>{itemStyle.icon}</span>
                      <span>{c.label} ({c.code})</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Tactical Grid: Coordinates, Tactical Distance, and Radar */}
            <div className="part2-grid part2-grid--3" style={{ gap: '16px', marginBottom: '24px' }}>
              <div
                style={{
                  background: '#FFFFFF',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--vyntra-border)',
                }}
              >
                <div className="text-muted" style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                  Victim GPS Location
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>
                  {activeSignal.lat.toFixed(5)}°, {activeSignal.lng.toFixed(5)}°
                </div>
                <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                  Precision: 2G/GPS Geo-anchor
                </div>
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--vyntra-border)',
                }}
              >
                <div className="text-muted" style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                  Distance from Shelter
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--vyntra-primary)', marginTop: '2px' }}>
                  {activeSignal.formattedDistance}
                </div>
                <div className="text-muted" style={{ fontSize: '12px' }}>
                  Haversine radial corridor
                </div>
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--vyntra-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(224, 109, 83, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                  }}
                >
                  🧭
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>
                    Turn-by-Turn Ready
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>
                    Google Maps Link
                  </div>
                </div>
              </div>
            </div>

            {/* Tactical Rescue Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: '#FFFFFF',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid var(--vyntra-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Rescue Dispatch Status:</span>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background:
                      dispatchStatus === 'standby'
                        ? '#EEEEEE'
                        : dispatchStatus === 'dispatched'
                        ? '#FFF3E0'
                        : dispatchStatus === 'enroute'
                        ? '#E3F2FD'
                        : '#E8F5E9',
                    color:
                      dispatchStatus === 'standby'
                        ? '#616161'
                        : dispatchStatus === 'dispatched'
                        ? '#E65100'
                        : dispatchStatus === 'enroute'
                        ? '#1565C0'
                        : '#2E7D32',
                  }}
                >
                  {dispatchStatus === 'standby'
                    ? 'Standby / Signal Decoded'
                    : dispatchStatus === 'dispatched'
                    ? 'Responders Dispatched'
                    : dispatchStatus === 'enroute'
                    ? 'En Route to Target'
                    : 'Victim Secured at Shelter'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {dispatchStatus === 'standby' && (
                  <button
                    className="part2-btn part2-btn--ghost part2-btn--sm"
                    onClick={() => setDispatchStatus('dispatched')}
                    style={{ fontWeight: 600 }}
                  >
                    🚨 Dispatch Responders
                  </button>
                )}
                {dispatchStatus === 'dispatched' && (
                  <button
                    className="part2-btn part2-btn--ghost part2-btn--sm"
                    onClick={() => setDispatchStatus('enroute')}
                    style={{ fontWeight: 600 }}
                  >
                    🚗 Mark En Route
                  </button>
                )}
                {dispatchStatus === 'enroute' && (
                  <button
                    className="part2-btn part2-btn--ghost part2-btn--sm"
                    onClick={() => setDispatchStatus('rescued')}
                    style={{ fontWeight: 600, color: '#2E7D32' }}
                  >
                    ✅ Mark Victim Arrived at Shelter
                  </button>
                )}

                <button
                  className="part2-btn part2-btn--primary"
                  onClick={handleLaunchNavigation}
                  id="launch-nav-btn"
                  style={{
                    background: 'linear-gradient(135deg, #1B5E20, #2E7D32)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(46, 125, 50, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>🧭</span> Launch Google Maps Turn-by-Turn →
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
